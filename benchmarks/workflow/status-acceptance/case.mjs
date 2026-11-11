import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { validateRules } from "../../../src/config.mjs";

const root = import.meta.dirname;
const read = (file) => readFile(file, "utf8");
const json = async (file) => JSON.parse(await read(file));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const states = ["online", "stale", "empty", "scheduler-off"];
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];
const sourceFiles = ["index.html", "style.css", "app.js"];
const protectedFiles = [
  "TASK.md",
  "data.json",
  ".ui-review/rules.json",
  ".ui-review/config.json",
];

export const rules = [
  {
    id: "freshness-controls",
    type: "visible-count",
    selector: "#connection,#checked,#update-label,#refresh-now,#auto-updates",
    min: 5,
    reason:
      "Show connection, last check, update state and both controls without scrolling.",
  },
  {
    id: "daily-schedule",
    type: "visible-count",
    selector: ".schedule-event",
    min: 4,
    reason: "Keep all four daily actions initially visible.",
  },
  {
    id: "readable-status",
    type: "min-font-size",
    selector: "main",
    min: 14,
    reason: "Keep status information readable.",
  },
  {
    id: "control-separation",
    type: "no-overlap",
    selector: "#refresh-now,#auto-updates",
    reason: "Keep both refresh actions distinguishable.",
  },
].map((rule) => ({ ...rule, severity: "error" }));

function config() {
  return {
    version: 1,
    baseURL: "http://127.0.0.1:1",
    sourcePaths: ["app"],
    accessibility: false,
    pages: states.map((state) => ({
      name: state,
      path: `/?state=${state}`,
      ready: "#status-page[data-ready]",
    })),
    viewports,
  };
}

/** Prepare one independent application and retain its immutable inputs beside it. */
export async function prepareCase(
  destination,
  variant = "starting",
  assistance = true,
) {
  assert.ok(["starting", "passing", "broken-repair"].includes(variant));
  validateRules(rules);
  const application = path.join(destination, "app");
  // rationale: Refuse reuse so a retry cannot overwrite an earlier agent attempt.
  await mkdir(destination);
  await mkdir(application);
  await copyFile(
    path.join(
      root,
      variant === "starting"
        ? "starting.html"
        : variant === "broken-repair"
          ? "broken-repair.html"
          : "passing.html",
    ),
    path.join(application, "index.html"),
  );
  await copyFile(
    path.join(
      root,
      variant === "broken-repair" ? "broken-refresh.js" : "app.js",
    ),
    path.join(application, "app.js"),
  );
  for (const file of ["style.css", "TASK.md", "data.json"])
    await copyFile(path.join(root, file), path.join(application, file));
  if (assistance) {
    await mkdir(path.join(application, ".ui-review"));
    await writeFile(
      path.join(application, ".ui-review/rules.json"),
      JSON.stringify(rules, null, 2) + "\n",
    );
    await writeFile(
      path.join(application, ".ui-review/config.json"),
      JSON.stringify({ ...config(), sourcePaths: ["."] }, null, 2) + "\n",
    );
  }
  const hashes = {};
  for (const file of assistance ? protectedFiles : protectedFiles.slice(0, 2))
    hashes[file] = digest(await readFile(path.join(application, file)));
  const manifest = {
    version: 1,
    evaluatorSha256: digest(await readFile(import.meta.filename)),
    assistance,
    sourceHashes: Object.fromEntries(
      await Promise.all(
        sourceFiles.map(async (file) => [
          file,
          digest(await readFile(path.join(application, file))),
        ]),
      ),
    ),
    protectedHashes: hashes,
  };
  await writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return application;
}

/** Serve only this synthetic application; this server cannot contact an appliance. */
export async function serveCase(application) {
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET") return response.writeHead(405).end();
      const url = new URL(request.url, "http://localhost");
      if (url.pathname === "/status.json") {
        const data = await json(path.join(application, "data.json"));
        const state = url.searchParams.get("state") || "online";
        if (!states.includes(state)) return response.writeHead(404).end();
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        return response.end(JSON.stringify(data[state]));
      }
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (!sourceFiles.includes(file)) return response.writeHead(404).end();
      response.setHeader(
        "Content-Type",
        {
          "index.html": "text/html",
          "style.css": "text/css",
          "app.js": "text/javascript",
        }[file],
      );
      response.end(await readFile(path.join(application, file)));
    } catch {
      response.writeHead(500).end("Fixture unavailable");
    }
  });
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(undefined)),
  );
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve(undefined))),
      ),
  };
}

async function integrity(application, manifest) {
  const problems = [];
  for (const [file, expected] of Object.entries(manifest.protectedHashes)) {
    try {
      if (digest(await readFile(path.join(application, file))) !== expected)
        problems.push(`Changed protected input: ${file}`);
    } catch {
      problems.push(`Missing protected input: ${file}`);
    }
  }
  return problems;
}

/** Check behavior independently of Viewrule; report failures without accepting missing evidence. */
export async function evaluateCase(destination, output, check = sourceCheck) {
  await mkdir(output);
  const application = path.join(destination, "app");
  assert.ok(
    !path.resolve(output).startsWith(path.resolve(application) + path.sep) &&
      path.resolve(output) !== path.resolve(application),
    "Evidence must stay outside the editable application",
  );
  const manifest = await json(path.join(destination, "manifest.json"));
  const result = {
    execution: "running",
    integrity: [],
    accepted: false,
    observations: [],
    viewrule: null,
    sourceHashes: {},
    limits:
      "Fixed synthetic inputs and browser conditions; no model, semantic design approval, appliance behavior, or general efficacy claim.",
  };
  const save = () =>
    writeFile(
      path.join(output, "result.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
  let server;
  let browser;
  let reviewProject;
  let forbiddenTraffic = false;
  try {
    result.integrity = await integrity(application, manifest);
    if (
      manifest.evaluatorSha256 !== digest(await readFile(import.meta.filename))
    )
      result.integrity.push("Evaluator changed since preparation");
    for (const file of sourceFiles)
      result.sourceHashes[file] = digest(
        await readFile(path.join(application, file)),
      );
    if (result.integrity.length) {
      result.execution = "invalid";
      return result;
    }
    // rationale: Expectations belong to the evaluator, not the editable application.
    const expectedData = await json(path.join(root, "data.json"));
    server = await serveCase(application);
    browser = await chromium.launch({ headless: true });
    const observe = async (id, state, viewport, body) => {
      try {
        await body();
        result.observations.push({ id, state, viewport, passed: true });
      } catch (error) {
        result.observations.push({
          id,
          state,
          viewport,
          passed: false,
          error: error.message,
        });
      }
    };
    for (const viewport of viewports) {
      for (const state of states) {
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        try {
          const page = await context.newPage();
          // rationale: Count calls synchronously in the browser; host request
          // events can arrive after a negative timing assertion has run.
          await page.addInitScript(() => {
            let calls = 0;
            Object.defineProperty(window, "__statusAcceptanceRequests", {
              get: () => calls,
            });
            const fetch = window.fetch;
            window.fetch = (...args) => {
              calls++;
              return fetch(...args);
            };
            const send = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function (body) {
              calls++;
              return send.call(this, body);
            };
          });
          const pageErrors = [];
          const forbiddenRequests = [];
          page.on("pageerror", (error) => pageErrors.push(error.message));
          context.on("request", (request) => {
            if (
              request.method() !== "GET" ||
              !request.url().startsWith(server.url + "/")
            ) {
              forbiddenTraffic = true;
              forbiddenRequests.push(request.url());
            }
          });
          // Block forbidden requests rather than allowing the fixture to perform them.
          await context.route("**/*", (route) =>
            route.request().method() === "GET" &&
            route
              .request()
              .url()
              .startsWith(server.url + "/")
              ? route.continue()
              : route.abort(),
          );
          await page.clock.install({ time: new Date("2026-01-01T10:00:00Z") });
          await page.clock.pauseAt(new Date("2026-01-01T10:00:01Z"));
          await page.goto(`${server.url}/?state=${state}`);
          await page
            .locator("#status-page[data-ready]")
            .waitFor({ timeout: 5000 });
          const verify = (id, body) => observe(id, state, viewport.name, body);
          const snapshot = async (data) => {
            for (const field of [
              "connection",
              "room",
              "target",
              "power",
              "checked",
              "warning",
              "service",
            ])
              assert.equal(
                await page.locator(`#${field}`).textContent(),
                data[field],
                field,
              );
          };
          await verify("state-values", () => snapshot(expectedData[state]));
          if (expectedData[state].warning)
            await verify("visible-warning", async () => {
              assert.ok(await page.locator("#warning").isVisible());
              const box = await page.locator("#warning").boundingBox();
              assert.ok(
                box && box.y >= 0 && box.y + box.height <= viewport.height,
                "Current failure warning must fit initially",
              );
            });
          await verify("initial-controls", async () => {
            for (const id of [
              "connection",
              "checked",
              "update-label",
              "refresh-now",
              "auto-updates",
            ]) {
              const box = await page.locator(`#${id}`).boundingBox();
              assert.ok(
                box &&
                  box.width > 0 &&
                  box.height > 0 &&
                  box.x >= 0 &&
                  box.y >= 0 &&
                  box.x + box.width <= viewport.width &&
                  box.y + box.height <= viewport.height,
                `${id} must fit initially`,
              );
              assert.ok(await page.locator(`#${id}`).isVisible());
            }
          });
          await verify("retained-content", async () => {
            assert.deepEqual(
              await page.locator(".schedule-event time").allTextContents(),
              ["07:30", "11:30", "16:30", "18:00"],
            );
            assert.equal(
              await page.locator("#next-action").textContent(),
              "11:30 On",
            );
            assert.deepEqual(
              await page.locator(".schedule-event span").allTextContents(),
              ["Off", "On · Next", "Off", "On"],
            );
            assert.deepEqual(
              await page.locator(".history tbody td").allTextContents(),
              [
                "09:55",
                "70.7°F",
                "On",
                "09:50",
                "70.3°F",
                "On",
                "09:45",
                "69.8°F",
                "On",
                "09:40",
                "69.4°F",
                "On",
                "09:35",
                "69.1°F",
                "On",
                "09:30",
                "68.9°F",
                "Off",
              ],
            );
            for (const selector of [
              "#room",
              "#target",
              "#power",
              "#next-action",
              ".history",
              ".history tbody td",
              ".schedule-event",
              "#service-details summary",
              "#log-details summary",
            ]) {
              for (const element of await page.locator(selector).all())
                assert.ok(
                  await element.isVisible(),
                  `${selector} must remain visible`,
                );
            }
            assert.ok(
              (await page.locator("#log-details").textContent())
                .replace(/\s+/g, " ")
                .includes(
                  "Historical entries do not establish current connection health.",
                ),
            );
          });
          await page.screenshot({
            path: path.join(output, `${viewport.name}-${state}.png`),
            fullPage: true,
          });
          if (state === "online") {
            await page.locator("#service-details summary").click();
            await page.locator("#log-details summary").click();
            await page.locator("#auto-updates").click();
            const initialRequests = await page.evaluate(() =>
              Reflect.get(window, "__statusAcceptanceRequests"),
            );
            const requests = async () =>
              (await page.evaluate(() =>
                Reflect.get(window, "__statusAcceptanceRequests"),
              )) - initialRequests;
            let data = expectedData.stale;
            await page.route("**/status.json*", async (route) => {
              await route.fulfill({ json: data });
            });
            await verify("pause-stops-automatic", async () => {
              await page.clock.fastForward(30000);
              assert.equal(await requests(), 0);
              assert.equal(
                await page
                  .locator("#auto-updates")
                  .getAttribute("aria-pressed"),
                "true",
              );
            });
            await verify("manual-refresh-stays-paused", async () => {
              await page.locator("#refresh-now").click();
              await page
                .locator("#checked")
                .filter({ hasText: data.checked })
                .waitFor({ timeout: 3000 });
              assert.equal(await requests(), 1);
              await snapshot(data);
              assert.equal(
                await page
                  .locator("#auto-updates")
                  .getAttribute("aria-pressed"),
                "true",
              );
              assert.equal(
                await page.locator("#update-label").textContent(),
                "Updates paused",
              );
              assert.equal(
                await page
                  .locator("#refresh-now")
                  .evaluate((el) => el === document.activeElement),
                true,
              );
              for (const id of ["service-details", "log-details"])
                assert.equal(
                  await page.locator(`#${id}`).getAttribute("open"),
                  "",
                );
              await page.clock.fastForward(30000);
              assert.equal(await requests(), 1);
            });
            // rationale: Keep a failed manual-refresh assertion from masking
            // the independent resume/cadence obligation.
            if (
              (await page
                .locator("#auto-updates")
                .getAttribute("aria-pressed")) !== "true"
            )
              await page.locator("#auto-updates").click();
            await verify("resume-refreshes-once", async () => {
              const before = await requests();
              data = expectedData.empty;
              await page.locator("#auto-updates").click();
              await page
                .locator("#checked")
                .filter({ hasText: data.checked })
                .waitFor({ timeout: 3000 });
              assert.equal(await requests(), before + 1);
              await snapshot(data);
              assert.equal(
                await page
                  .locator("#auto-updates")
                  .getAttribute("aria-pressed"),
                "false",
              );
              assert.equal(
                await page
                  .locator("#auto-updates")
                  .evaluate((el) => el === document.activeElement),
                true,
              );
              data = expectedData["scheduler-off"];
              await page.clock.runFor(29999);
              assert.equal(
                await requests(),
                before + 1,
                "No automatic refresh before 30 seconds",
              );
              await page.clock.runFor(1);
              await page
                .locator("#checked")
                .filter({ hasText: data.checked })
                .waitFor({ timeout: 3000 });
              assert.equal(await requests(), before + 2);
              await snapshot(data);
            });
            await page.screenshot({
              path: path.join(output, `${viewport.name}-after-refresh.png`),
              fullPage: true,
            });
          }
          await verify("read-only-and-error-free", async () => {
            assert.deepEqual(pageErrors, []);
            assert.deepEqual(forbiddenRequests, []);
          });
        } finally {
          await context.close();
        }
      }
    }
    if (forbiddenTraffic) {
      result.observations.push({
        id: "viewrule-capture",
        passed: false,
        error:
          "Skipped replay of a candidate that attempted forbidden requests.",
      });
      result.execution = "completed";
      return result;
    }
    reviewProject = await mkdtemp(
      path.join(tmpdir(), "viewrule-status-review-"),
    );
    await mkdir(path.join(reviewProject, ".ui-review"));
    await mkdir(path.join(reviewProject, "app"));
    for (const file of sourceFiles)
      await copyFile(
        path.join(application, file),
        path.join(reviewProject, "app", file),
      );
    await writeFile(
      path.join(reviewProject, ".ui-review/rules.json"),
      JSON.stringify(rules),
    );
    await writeFile(
      path.join(reviewProject, ".ui-review/config.json"),
      JSON.stringify(config()),
    );
    const checked = await check([
      "check",
      "--project",
      reviewProject,
      "--url",
      server.url,
    ]);
    await writeFile(path.join(output, "viewrule-stdout.json"), checked.stdout);
    await writeFile(path.join(output, "viewrule-stderr.txt"), checked.stderr);
    if (![0, 1].includes(checked.code))
      throw new Error(
        `Viewrule execution failed (${checked.code}): ${checked.stderr}`,
      );
    const reportFile = JSON.parse(checked.stdout).report;
    const report = await json(reportFile);
    // Copy the report's whole run so its screenshot and HTML links survive cleanup.
    const { cp } = await import("node:fs/promises");
    await cp(path.dirname(reportFile), path.join(output, "review"), {
      recursive: true,
    });
    result.viewrule = {
      exitCode: checked.code,
      complete:
        report.pages.length === states.length * viewports.length &&
        report.pages.every((page) => page.details?.complete),
      findings: report.pages.flatMap((page) =>
        page.findings.map((finding) => ({
          page: page.name,
          viewport: page.viewport.name,
          ...finding,
        })),
      ),
      report: "review/report.json",
    };
    result.integrity = await integrity(application, manifest);
    for (const file of sourceFiles)
      result.sourceHashes[file] = digest(
        await readFile(path.join(application, file)),
      );
    result.accepted =
      !result.integrity.length &&
      result.observations.every((entry) => entry.passed) &&
      checked.code === 0 &&
      result.viewrule.complete;
    result.execution = "completed";
  } catch (error) {
    result.execution = "error";
    result.observations.push({
      id: "execution",
      passed: false,
      error: error.message,
    });
  } finally {
    await browser?.close();
    await server?.close();
    if (reviewProject)
      await rm(reviewProject, { recursive: true, force: true });
    await save();
  }
  return result;
}

function sourceCheck(args) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.resolve(root, "../../../bin/viewrule.mjs"), ...args],
      {
        env: {
          ...process.env,
          VIEWRULE_CONFIG_DIR: path.join(
            args[args.indexOf("--project") + 1],
            "global",
          ),
        },
        timeout: 90000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") return reject(error);
        resolve({ code: error?.code ?? 0, stdout, stderr });
      },
    );
  });
}

/** Same retained acceptance story for source iteration and the packed installed CLI. */
export async function verifyFixtures(output, check = sourceCheck) {
  await mkdir(output);
  const results = [];
  for (const variant of ["starting", "passing", "broken-repair"]) {
    const destination = path.join(output, variant);
    await prepareCase(destination, variant);
    const result = await evaluateCase(
      destination,
      path.join(destination, "evidence"),
      check,
    );
    assert.equal(result.execution, "completed", JSON.stringify(result));
    assert.deepEqual(result.integrity, []);
    assert.equal(
      result.accepted,
      variant === "passing",
      JSON.stringify(result),
    );
    if (variant === "starting") {
      assert.ok(
        result.observations.some(
          (entry) => entry.id === "initial-controls" && !entry.passed,
        ),
      );
      assert.ok(
        result.viewrule.findings.some(
          (finding) =>
            finding.rule === "freshness-controls" &&
            finding.viewport === "phone",
        ),
      );
      const report = await json(
        path.join(destination, "evidence/review/report.json"),
      );
      assert.ok(report.pages.every((page) => page.details.complete));
      assert.ok(
        report.pages
          .flatMap((page) => page.findings)
          .some(
            (finding) =>
              finding.actual !== undefined && finding.expected !== undefined,
          ),
      );
    }
    if (variant === "broken-repair") {
      assert.equal(result.viewrule.exitCode, 0);
      for (const id of ["visible-warning", "resume-refreshes-once"])
        assert.ok(
          result.observations.some((entry) => entry.id === id && !entry.passed),
          `Broken repair must fail ${id}`,
        );
      assert.ok(
        result.observations.some(
          (entry) => entry.id === "retained-content" && !entry.passed,
        ),
      );
      assert.ok(
        result.observations.some(
          (entry) =>
            entry.id === "manual-refresh-stays-paused" && !entry.passed,
        ),
      );
    }
    results.push({
      variant,
      accepted: result.accepted,
      execution: result.execution,
    });
  }
  await writeFile(
    path.join(output, "fixtures.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  return results;
}

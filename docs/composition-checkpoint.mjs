import assert from "node:assert/strict";
import { readFile, mkdir, writeFile, rm, cp } from "node:fs/promises";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRules } from "../src/config.mjs";
import { evaluateComposition } from "../src/composition-design.mjs";

// A concrete rejected/accepted CLI calibration, not a second geometry engine.
export async function runCompositionCheckpoint(root) {
  const directory = path.join(root, "dist/behavior-evidence/composition");
  await rm(directory, { recursive: true, force: true });
  await mkdir(path.join(directory, ".ui-review"), { recursive: true });
  const html = await readFile(
    path.join(root, "docs/composition-fixture.html"),
    "utf8",
  );
  await writeFile(path.join(directory, "page.html"), html);
  const rules = validateRules(
    JSON.parse(
      await readFile(path.join(root, "docs/composition-rules.json"), "utf8"),
    ),
  );
  // Example adoption starts as warnings. This known fixture tests blocking checks.
  await writeFile(
    path.join(directory, ".ui-review/rules.json"),
    JSON.stringify(rules.map((r) => ({ ...r, severity: "error" }))),
  );
  const config = {
    version: 1,
    sourcePaths: ["page.html"],
    accessibility: false,
    requiredDesignRules: ["DR-017", "DR-018", "DR-019", "DR-020"],
    pages: ["good", "bad", "finite"].map((name) => ({
      name,
      path: `/?variant=${name}`,
      ready: "#composition-ready",
    })),
    viewports: [
      { name: "desktop", width: 900, height: 900 },
      { name: "wide", width: 1600, height: 900 },
    ],
  };
  await writeFile(
    path.join(directory, ".ui-review/config.json"),
    JSON.stringify(config),
  );
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(undefined));
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Fixture server has no TCP port");
    /** @type {Promise<string>} */
    const invocation = new Promise((resolve, reject) => {
      execFile(
        process.execPath,
        [
          path.join(root, "bin/viewrule.mjs"),
          "check",
          "--project",
          directory,
          "--url",
          `http://127.0.0.1:${address.port}`,
        ],
        {
          env: {
            ...process.env,
            VIEWRULE_CONFIG_DIR: path.join(directory, "global"),
          },
          maxBuffer: 4 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (error && error.code !== 1)
            reject(new Error(stderr || error.message));
          else resolve(stdout);
        },
      );
    });
    const result = JSON.parse(await invocation);
    const report = JSON.parse(await readFile(result.report, "utf8"));
    // Preserve the full synthetic report outside the hidden project state
    // so the existing artifact upload retains its captures and HTML.
    await cp(path.dirname(result.report), path.join(directory, "report"), {
      recursive: true,
    });
    assert.equal(report.pages.length, 6);
    for (const page of report.pages) {
      const ids = page.findings.map((f) => f.rule);
      if (page.name !== "bad")
        assert.deepEqual(
          ids,
          [],
          `${page.name}/${page.viewport.name}: ${JSON.stringify(page.findings)}`,
        );
      else {
        const expected = [
          "composition-alignment",
          "composition-rhythm",
          "composition-groups",
          "composition-peers",
          "composition-budget",
        ];
        if (page.viewport.name === "wide") expected.push("composition-yield");
        assert.deepEqual([...ids].sort(), expected.sort());
        assert(
          page.findings.every(
            (f) =>
              f.designRules.length &&
              f.actual !== undefined &&
              f.expected !== undefined,
          ),
        );
      }
      assert(
        page.designCoverage
          .filter((entry) =>
            ["DR-017", "DR-018", "DR-019", "DR-020"].includes(entry.id),
          )
          .every(
            (entry) =>
              entry.enforcement === "review" && entry.status !== "unassessed",
          ),
      );
      const rhythm = page.metrics.composition.find(
        (m) => m.type === "spacing-rhythm",
      );
      assert.equal(rhythm.spread, page.name === "bad" ? 24 : 0);
      const budget = page.metrics.composition.find(
        (m) => m.type === "region-budget",
      );
      assert(
        budget.ratio < 1,
        "Nested chrome rectangles must not be counted twice",
      );
      if (page.name === "finite" && page.viewport.name === "wide") {
        const yieldMetric = page.metrics.composition.find(
          (m) => m.type === "viewport-yield",
        );
        assert.equal(yieldMetric.comparison, "saturated");
        assert.equal(yieldMetric.yield, 0);
      }
    }
    // Reevaluate actual captured measurements as references disappear/reappear.
    // Incremental review resets raw findings but reuses the observation objects.
    const replay = structuredClone(report);
    const reference = replay.pages.find(
      (p) => p.name === "finite" && p.viewport.name === "desktop",
    );
    const target = replay.pages.find(
      (p) => p.name === "finite" && p.viewport.name === "wide",
    );
    const metric = target.metrics.composition.find(
      (m) => m.type === "viewport-yield",
    );
    const evaluation = target.metrics.evaluations.find(
      (entry) => entry.rule === metric.rule,
    );
    replay.pages = [target];
    evaluateComposition(replay, rules);
    assert.equal(evaluation.status, "missing");
    assert.equal(metric.comparison, "unassessed");
    assert.equal(Object.hasOwn(metric, "yield"), false);
    target.findings = [];
    replay.pages = [reference, target];
    evaluateComposition(replay, rules);
    assert.equal(evaluation.status, "checked");
    assert.equal(metric.comparison, "saturated");
    assert.deepEqual(target.findings, []);
    await writeFile(
      path.join(directory, "result.json"),
      JSON.stringify(
        {
          report: result.report,
          pages: report.pages.map((p) => ({
            name: p.name,
            viewport: p.viewport.name,
            findings: p.findings.map((f) => f.rule),
            composition: p.metrics.composition,
          })),
        },
        null,
        2,
      ),
    );
    console.log(
      "Composition CLI calibration: rejected geometry, accepted relationships, and finite-task whitespace verified.",
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve(undefined))),
    );
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await runCompositionCheckpoint(path.resolve(import.meta.dirname, ".."));

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { inspectPage } from "../../src/checks.mjs";
import { configureContinuity } from "./continuity-scene.js";

// Application-owned journey evidence. Static state declarations cannot prove it.
export async function runContinuityCheckpoint(root, redOnly = false) {
  const read = (file) => readFile(path.join(root, file), "utf8");
  const before = JSON.parse(await read("docs/examples/continuity-before.json"));
  const clarityBefore = JSON.parse(
    await read("docs/examples/continuity-clarity-before.json"),
  );
  const html = await read("docs/examples/behavior.html");
  const css = await read("docs/examples/behavior.css");
  const gallery = await read("docs/examples/gallery.css");
  const rules = JSON.parse(await read("docs/examples/continuity-rules.json"));
  const directory = path.join(root, "dist/behavior-evidence");
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.VIEWRULE_BROWSER_PATH || undefined,
  });
  const scenarios = [],
    captures = [];
  const mount = async (page, legacy, enlarged, clarity = false) => {
    const rejected = legacy ? before : clarity ? clarityBefore : null;
    const template = rejected
      ? rejected.template
      : html.match(/<template id="scene-DR-010">[\s\S]*?<\/template>/)[0];
    await page.setContent(
      `<html><body class="behavior-gallery"><main id="behavior-examples" data-rule="DR-010"><div class="behavior-pair"><section id="good"><div class="sample"></div></section><section id="bad"><div class="sample"></div></section></div></main>${template}</body></html>`,
    );
    await page.addStyleTag({ content: gallery });
    const continuityStart = css.indexOf("/* DR-010:");
    const continuityEnd = css.indexOf("/* DR-012:", continuityStart);
    const mountedCss =
      clarity && clarityBefore.styles
        ? css.slice(0, continuityStart) +
          clarityBefore.styles +
          css.slice(continuityEnd)
        : css;
    await page.addStyleTag({ content: mountedCss });
    await page.evaluate(
      ({ source, enlarged }) => {
        const doc = globalThis.document;
        const configure = (0, eval)(`(${source})`);
        for (const quality of ["good", "bad"]) {
          const sample = /** @type {HTMLElement} */ (
            doc.querySelector(`#${quality} .sample`)
          );
          sample.append(doc.querySelector("template").content.cloneNode(true));
          sample.dataset.enlarged = String(enlarged);
          configure(sample, quality === "good");
        }
      },
      {
        source: rejected
          ? rejected.initializer
          : configureContinuity.toString(),
        enlarged,
      },
    );
  };
  const role = (page, quality, name) =>
    page.locator(`#${quality} [data-role="${name}"]`);
  const observe = async (page, quality) => ({
    query: await role(page, quality, "filter").inputValue(),
    selected: await role(page, quality, "selected").textContent(),
    focus: await page.evaluate(() =>
      globalThis.document.activeElement?.getAttribute("data-role"),
    ),
  });
  const violations = (state) => [
    ...(state.query === "Seattle" ? [] : ["continuity-query"]),
    ...(state.selected === "EP 1042" ? [] : ["continuity-selection"]),
    ...(state.focus === "open" ? [] : ["continuity-focus"]),
  ];
  /** @type {Array<[string, {width: number, height: number}, boolean]>} */
  const layouts = [
    ["desktop", { width: 1200, height: 1000 }, false],
    ["mobile", { width: 390, height: 844 }, true],
  ];
  try {
    for (const [name, viewport, enlarged] of layouts) {
      const context = await browser.newContext({
        viewport,
        colorScheme: "light",
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      try {
        await mount(page, true, enlarged);
        const legacy = {};
        for (const quality of ["good", "bad"]) {
          await role(page, quality, "open").click();
          await role(page, quality, "close").click();
          await page.waitForFunction(
            () => !globalThis.document.querySelector("dialog[open]"),
          );
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                globalThis.requestAnimationFrame(() =>
                  globalThis.requestAnimationFrame(resolve),
                ),
              ),
          );
          legacy[quality] = await observe(page, quality);
        }
        assert.deepEqual(violations(legacy.good), []);
        assert.deepEqual(violations(legacy.bad), [
          "continuity-query",
          "continuity-selection",
          "continuity-focus",
        ]);
        const legacyFilterTruth = await page
          .locator("#good .sample")
          .innerText();
        assert.match(
          legacyFilterTruth,
          /Denver/,
          "The prior Seattle filter did not actually filter its visible results",
        );
        // The first isolated pair was behaviorally correct but too inferential.
        // New native context evidence must reject that exact implementation before
        // presentation is repaired.
        await mount(page, false, enlarged, true);
        const clarityRed = {};
        for (const quality of ["good", "bad"]) {
          await role(page, quality, "open").click();
          await role(page, quality, "close").click();
          await page.waitForFunction(
            (quality) =>
              !globalThis.document.querySelector(`#${quality} dialog[open]`),
            quality,
          );
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                globalThis.requestAnimationFrame(() =>
                  globalThis.requestAnimationFrame(() => resolve(null)),
                ),
              ),
          );
          clarityRed[quality] = await page.evaluate(
            inspectPage,
            rules.map((rule) => ({
              ...rule,
              selector: rule.selector
                .split(",")
                .map((selector) => `#${quality} ${selector.trim()}`)
                .join(", "),
            })),
          );
          assert.deepEqual(
            clarityRed[quality].findings.map((finding) => finding.rule),
            ["continuity-context", "continuity-context"],
            `${name}: the prior isolated pair must go red for both missing destination-scope requirements`,
          );
          assert.equal(
            await role(page, quality, "summary").textContent(),
            quality === "good" ? "2 of 3 shipments" : "3 of 3 shipments",
          );
        }
        if (redOnly) {
          scenarios.push({
            name,
            legacy,
            unexpected: ["continuity-selection", "continuity-focus"],
            filterMismatch: true,
            clarityRed,
          });
          continue;
        }
        await mount(page, false, enlarged);
        const current = {},
          native = {};
        for (const quality of ["good", "bad"]) {
          const sample = page.locator(`#${quality} .sample`);
          const filter = role(page, quality, "filter");
          const open = role(page, quality, "open");
          const close = role(page, quality, "close");
          const visibleIds = () =>
            sample
              .locator("[data-shipment]:visible")
              .evaluateAll((rows) =>
                rows.map((row) => row.getAttribute("data-shipment")),
              );
          assert.deepEqual(await visibleIds(), ["EP 1042", "EP 1047"]);
          await filter.fill("No matching destination");
          assert.deepEqual(await visibleIds(), []);
          assert.equal(await role(page, quality, "empty").isVisible(), true);
          await filter.fill("Seattle");
          assert.deepEqual(await visibleIds(), ["EP 1042", "EP 1047"]);
          await page.keyboard.press("Tab");
          assert.equal(
            await open.evaluate((el) => el === el.ownerDocument.activeElement),
            true,
          );
          await page.keyboard.press("Enter");
          assert.equal(
            await close.evaluate((el) => el === el.ownerDocument.activeElement),
            true,
          );
          assert.equal(
            await role(page, quality, "detail-title").textContent(),
            "EP 1042",
          );
          await page.keyboard.press("Escape");
          await open.evaluate(
            (el) =>
              new Promise((resolve) =>
                el.ownerDocument.defaultView.requestAnimationFrame(() =>
                  resolve(null),
                ),
              ),
          );
          assert.equal(
            await open.evaluate((el) => el === el.ownerDocument.activeElement),
            true,
          );
          await filter.fill("Seattle");
          await open.click();
          await close.click();
          await open.evaluate(
            (el) =>
              new Promise((resolve) =>
                el.ownerDocument.defaultView.requestAnimationFrame(() =>
                  resolve(null),
                ),
              ),
          );
          current[quality] = await observe(page, quality);
          assert.deepEqual(
            violations(current[quality]),
            quality === "good" ? [] : ["continuity-query"],
          );
          assert.deepEqual(
            await visibleIds(),
            quality === "good"
              ? ["EP 1042", "EP 1047"]
              : ["EP 1042", "EP 1047", "EP 1043"],
          );
          assert.equal(
            await role(page, quality, "destination-scope-value").textContent(),
            quality === "good" ? "Seattle" : "All destinations",
          );
          assert.equal(
            await role(page, quality, "summary").textContent(),
            quality === "good" ? "Showing 2 shipments" : "Showing 3 shipments",
          );
          native[quality] = await page.evaluate(
            inspectPage,
            rules.map((rule) => ({
              ...rule,
              selector: rule.selector
                .split(",")
                .map((selector) => `#${quality} ${selector.trim()}`)
                .join(", "),
            })),
          );
          assert.deepEqual(
            native[quality].findings,
            [],
            "No non-target native defect may be introduced",
          );
          assert.ok(
            native[quality].metrics.evaluations.every(
              (entry) => entry.status === "checked",
            ),
          );
          assert.equal(
            await sample.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            true,
          );
          const file = `dr-010-returned-${quality}-${name}.png`;
          await sample.screenshot({
            path: path.join(directory, file),
            animations: "disabled",
            caret: "hide",
          });
          captures.push({
            file,
            quality,
            viewport,
            fontScale: enlarged ? 1.25 : 1,
            state: "returned",
          });
        }
        const styles = await page
          .locator("[data-role=open]")
          .evaluateAll((buttons) =>
            buttons.map((el) => {
              const s = el.ownerDocument.defaultView.getComputedStyle(el);
              return [
                s.fontSize,
                s.color,
                s.backgroundColor,
                s.padding,
                s.minHeight,
              ];
            }),
          );
        assert.deepEqual(styles[0], styles[1]);
        assert.equal(
          await page
            .locator("html")
            .evaluate(
              (el) => el.scrollWidth <= el.ownerDocument.defaultView.innerWidth,
            ),
          true,
        );
        scenarios.push({
          name,
          legacy,
          current,
          native,
          passed: [
            "real-filter",
            "stable-selection",
            "return-focus",
            "keyboard-journey",
            "native-baseline",
            "query-isolation",
            "truthful-results",
            "explicit-destination-scope",
            "shared-styles",
          ],
        });
      } finally {
        await context.close();
      }
    }
    if (!redOnly) {
      const matrix = JSON.parse(
        await read("docs/examples/conformance-matrix.json"),
      );
      const entry = matrix.examples.find((example) => example.id === "DR-010");
      assert.ok(entry);
      for (const assessment of Object.values(entry.rules)) {
        if (["automated", "behavioral"].includes(assessment.evidenceType)) {
          assert.ok(assessment.checks?.length);
          for (const check of assessment.checks)
            assert.ok(
              scenarios.every((scenario) => scenario.passed.includes(check)),
              `${check} must execute in both layouts`,
            );
        }
      }
    }
    const sourceFiles = [
      "behavior.html",
      "behavior.css",
      "continuity-scene.js",
      "continuity-rules.json",
      "continuity-before.json",
      "continuity-clarity-before.json",
    ];
    const sources = Object.fromEntries(
      await Promise.all(
        sourceFiles.map(async (file) => [
          file,
          createHash("sha256")
            .update(await read(`docs/examples/${file}`))
            .digest("hex"),
        ]),
      ),
    );
    const report = {
      schemaVersion: 1,
      target: "DR-010",
      browser: browser.version(),
      previousRevision: before.revision,
      sources,
      scenarios,
      captures,
    };
    await writeFile(
      path.join(
        directory,
        redOnly ? "dr-010-red.json" : "dr-010-evidence.json",
      ),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      redOnly
        ? "RED: prior Bad loses selection and focus as well as the query; prior Good's filter leaves Denver visible."
        : "GREEN: both layouts preserve selection/focus; only Bad loses the query. Native baseline passes both.",
    );
    return report;
  } finally {
    await browser.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await runContinuityCheckpoint(
    path.resolve(import.meta.dirname, "../.."),
    process.argv.includes("--red-only"),
  );

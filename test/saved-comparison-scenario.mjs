import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, cp, rm, symlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

// One extension of the installed workflow, using the actual complete application.
export async function runSavedComparisonScenario({
  cli,
  baseURL,
  project,
  mockDirectory,
  repository,
}) {
  const root = path.join(project, "saved-comparison-app");
  await mkdir(path.join(root, ".ui-review"), { recursive: true });
  await mkdir(path.join(root, "src"));
  for (const file of ["index.html", "app.css", "app.js", "data.js"])
    await cp(path.join(mockDirectory, file), path.join(root, "src", file));
  const originalCSS = await readFile(path.join(root, "src/app.css"), "utf8");
  const beforeCSS = await readFile(
    path.join(repository, "test/templates/comparison-before.css"),
    "utf8",
  );
  const annotations = path.join(
    repository,
    "test/templates/comparison-annotations.json",
  );
  const contract = {
    version: 1,
    sourcePaths: ["src"],
    accessibility: true,
    baseURL,
    pages: [
      {
        name: "Parcel desk",
        path: "/saved-comparison/",
        ready: "#application[data-ready]",
        captureRegions: [
          { id: "heading", selector: ".workspace-heading" },
          { id: "charts", selector: "#carrier-charts" },
          { id: "task", selector: ".task-grid" },
        ],
      },
    ],
    viewports: [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "wide", width: 1920, height: 1080 },
      { name: "mobile", width: 390, height: 844 },
    ],
  };
  const rules = JSON.parse(
    await readFile(path.join(mockDirectory, ".ui-review/rules.json"), "utf8"),
  ).map((r) =>
    r.id === "app-bounded-framing"
      ? { ...r, viewports: ["desktop", "wide"] }
      : r,
  );
  rules.push(
    ...[
      {
        id: "carrier-anchors",
        type: "alignment-residual",
        selector: "#carrier-charts",
        items: "figcaption",
        edge: "top",
        maxResidual: 2,
      },
      {
        id: "carrier-rhythm",
        type: "gap-variance",
        selector: "#carrier-charts",
        items: ".carrier-chart",
        axis: "x",
        maxCoefficientOfVariation: 0.05,
      },
      {
        id: "carrier-balance",
        type: "peer-footprint",
        selector: "#carrier-charts",
        items: ".carrier-chart",
        measure: "area",
        maxCoefficientOfVariation: 0.05,
      },
    ].map((rule) => ({
      ...rule,
      severity: "error",
      viewports: ["desktop", "wide"],
      reason:
        "The three carrier panels have equal priority in this comparison task.",
    })),
  );
  await writeFile(
    path.join(root, ".ui-review/config.json"),
    JSON.stringify(contract),
  );
  await writeFile(
    path.join(root, ".ui-review/rules.json"),
    JSON.stringify(rules),
  );
  const evidence = path.join(repository, "dist/saved-comparison-evidence");
  await rm(evidence, { recursive: true, force: true });
  await mkdir(evidence, { recursive: true });
  await cp(
    path.join(repository, "benchmarks/workflow/saved-comparison-protocol.md"),
    path.join(evidence, "protocol.md"),
  );
  const browser = await chromium.launch({
    executablePath:
      process.env.VIEWRULE_BROWSER_PATH ||
      process.env.UI_REVIEW_BROWSER_PATH ||
      undefined,
  });
  const applicationEvidence = [];
  async function inspectApplication(stage) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "light",
    });
    try {
      await page.goto(`${baseURL}/saved-comparison/`);
      await page.locator("#application[data-ready]").waitFor();
      const facts = await page.evaluate(() => ({
        shipments: [...document.querySelectorAll(".shipment-row")].map((el) =>
          el.getAttribute("data-key"),
        ),
        charts: [...document.querySelectorAll(".carrier-chart")].map((el) => ({
          carrier: el.getAttribute("data-carrier"),
          baseline: el.getAttribute("data-baseline"),
          maximum: el.getAttribute("data-maximum"),
          text: el.textContent,
          bars: [...el.querySelectorAll(".bar")].map((bar) =>
            bar.getAttribute("style"),
          ),
        })),
        context: document.querySelector(".chart-context").textContent,
        fonts: [
          ...document.querySelectorAll(
            ".chart-context, .bar-value, .shipment-state, .quote-amount",
          ),
        ].map((el) => parseFloat(getComputedStyle(el).fontSize)),
      }));
      assert.equal(facts.shipments.length, 12);
      assert.equal(facts.charts.length, 3);
      assert.ok(
        facts.charts.every((c) => c.baseline === "0" && c.maximum === "100"),
      );
      assert.ok(facts.fonts.every((size) => size >= 14));
      if (applicationEvidence.length)
        assert.deepEqual(
          facts,
          applicationEvidence[0].facts,
          "Presentation repair preserves data, chart geometry declarations, and readable type",
        );
      await page.locator("#search").fill("EP 1047");
      assert.equal(await page.locator(".shipment-row").count(), 1);
      await page.locator("#clear-filters").click();
      assert.equal(await page.locator(".shipment-row").count(), 12);
      await page.locator("#status-filter").selectOption("attention");
      assert.ok((await page.locator(".shipment-row").count()) > 0);
      assert.equal(
        await page
          .locator('.shipment-row .status-badge:not([data-status="attention"])')
          .count(),
        0,
      );
      await page.locator("#clear-filters").click();
      const row = page.locator('.shipment-row[data-key="EP 1047"]');
      await row.locator(".select-parcel").click();
      await row.locator(".expand-parcel").focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await row.locator(".expand-parcel").getAttribute("aria-expanded"),
        "true",
      );
      await page.locator('[data-tab="events"]').click();
      const restoredURL = page.url();
      await page.reload();
      await page.locator("#application[data-ready]").waitFor();
      assert.equal(page.url(), restoredURL);
      assert.equal(
        await row.locator(".select-parcel").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await row.locator(".expand-parcel").getAttribute("aria-expanded"),
        "true",
      );
      assert.equal(
        await page.locator('[data-tab="events"]').getAttribute("aria-selected"),
        "true",
      );
      applicationEvidence.push({
        stage,
        facts,
        interactions:
          "Search/clear, attention filter, selection, keyboard disclosure, events tab, and URL restoration passed.",
      });
    } finally {
      await page.close();
    }
  }
  async function review(stage, css, code) {
    await writeFile(path.join(root, "src/app.css"), css);
    const result = await cli(["check", "--project", root]);
    assert.equal(result.code, code, result.stderr || result.stdout);
    const file = JSON.parse(result.stdout).report;
    const report = JSON.parse(await readFile(file, "utf8"));
    await cp(path.join(root, "src"), path.join(evidence, `source-${stage}`), {
      recursive: true,
    });
    await inspectApplication(stage);
    return { file, report };
  }
  try {
    const before = await review("before", originalCSS + beforeCSS, 1);
    for (const p of before.report.pages.filter(
      (p) => p.viewport.name !== "mobile",
    )) {
      assert.deepEqual([...new Set(p.findings.map((f) => f.rule))].sort(), [
        "app-bounded-framing",
        "carrier-anchors",
        "carrier-balance",
        "carrier-rhythm",
      ]);
      assert.equal(
        p.metrics.composition.find((m) => m.rule === "carrier-anchors")
          .maxResidual,
        18,
      );
    }
    const after = await review("after", originalCSS, 0);
    assert.deepEqual(after.report.summary, { errors: 0, warnings: 0 });
    assert.equal(before.report.contract.hash, after.report.contract.hash);
    const latestFile = path.join(root, ".ui-review/latest.json");
    const latest = await readFile(latestFile);
    const output = path.join(evidence, "comparison");
    const command = [
      "compare",
      "--before",
      before.file,
      "--after",
      after.file,
      "--output",
      output,
      "--annotations",
      annotations,
    ];
    const result = await cli([...command, "--image"]);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const comparison = JSON.parse(
      await readFile(path.join(output, "comparison.json"), "utf8"),
    );
    assert.equal(comparison.states.length, 3);
    assert.ok(comparison.states.every((s) => s.comparable));
    assert.equal(
      comparison.states.find((s) => s.viewport.name === "mobile")
        .identicalImages,
      true,
      "The desktop repair preserves the mobile presentation exactly",
    );
    assert.ok(
      Number(comparison.states[0].callouts[0].measurements[1].delta) <= -84,
      "The 196px heading is repaired within the fixed 112px budget",
    );
    assert.equal(comparison.states[0].measurements[0].delta, "-18");
    for (const artifact of comparison.artifacts) {
      const copied = await readFile(path.join(output, artifact.file));
      assert.equal(
        createHash("sha256").update(copied).digest("hex"),
        artifact.sha256,
      );
      const input = artifact.file.startsWith("before/")
        ? before.file
        : after.file;
      assert.deepEqual(
        copied,
        await readFile(
          path.join(path.dirname(input), path.basename(artifact.file)),
        ),
      );
    }
    assert.deepEqual(await readFile(latestFile), latest);
    assert.equal(
      (await cli(command)).code,
      2,
      "Existing evidence cannot be overwritten",
    );
    const page = await browser.newPage({
      viewport: { width: 1800, height: 1100 },
    });
    await page.goto(pathToFileURL(path.join(output, "index.html")).href);
    assert.ok(
      await page
        .locator("img")
        .evaluateAll(
          /** @param {HTMLImageElement[]} images */ (images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    );
    const scales = await page
      .locator("#state-1 img")
      .evaluateAll(
        /** @param {HTMLImageElement[]} images */ (images) =>
          images.map(
            (image) => image.getBoundingClientRect().width / image.naturalWidth,
          ),
      );
    assert.ok(Math.abs(scales[0] - scales[1]) < 0.001);
    await page.locator("#originals").focus();
    await page.keyboard.press("Space");
    assert.ok(
      await page
        .locator(".overlay")
        .evaluateAll((boxes) =>
          boxes.every((box) => getComputedStyle(box).display === "none"),
        ),
    );
    await page.locator("summary").first().click();
    assert.equal(
      await page.locator("details").first().getAttribute("open"),
      "",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.close();

    // A damaged/mismatched saved pair must remain inspectable, never an improvement.
    const damaged = path.join(evidence, "damaged-after");
    await cp(path.dirname(after.file), damaged, { recursive: true });
    const altered = structuredClone(after.report);
    altered.contract.rules[0].reason += " Changed contract.";
    altered.pages[1].details.width += 10;
    await writeFile(path.join(damaged, "report.json"), JSON.stringify(altered));
    const changedContract = await cli([
      "compare",
      "--before",
      before.file,
      "--after",
      path.join(damaged, "report.json"),
      "--output",
      path.join(evidence, "changed-contract"),
    ]);
    assert.equal(changedContract.code, 0, changedContract.stderr);
    const changed = JSON.parse(
      await readFile(
        path.join(evidence, "changed-contract/comparison.json"),
        "utf8",
      ),
    );
    assert.ok(changed.states.every((state) => !state.comparable));
    assert.ok(
      changed.states[0].callouts.every((callout) =>
        callout.measurements.every((m) => m.delta === "Not compared"),
      ),
    );
    assert.ok(
      changed.states[1].reasons.some((reason) => /PNG dimensions/.test(reason)),
    );
    altered.pages[1].details.width -= 10;
    altered.pages[0].captureRegions[0] = {
      id: "heading",
      selector: ".workspace-heading",
      reason: "No unique region.",
    };
    altered.pages[0].screenshot = "../../outside.png";
    altered.pages[1].evidence = {
      kind: "reused",
      createdAt: "2000-01-01T00:00:00Z",
    };
    await rm(path.join(damaged, altered.pages[1].screenshot));
    await symlink(
      path.join(path.dirname(after.file), altered.pages[1].screenshot),
      path.join(damaged, altered.pages[1].screenshot),
    );
    altered.pages.pop();
    await writeFile(path.join(damaged, "report.json"), JSON.stringify(altered));
    const unsafeNotes = JSON.parse(await readFile(annotations, "utf8"));
    unsafeNotes.title =
      '<img src="https://invalid.example/" onerror="alert(1)">';
    await writeFile(
      path.join(evidence, "unsafe-notes.json"),
      JSON.stringify(unsafeNotes),
    );
    const rejected = await cli([
      "compare",
      "--before",
      before.file,
      "--after",
      path.join(damaged, "report.json"),
      "--output",
      path.join(evidence, "not-compared"),
      "--annotations",
      path.join(evidence, "unsafe-notes.json"),
    ]);
    assert.equal(rejected.code, 0, rejected.stderr);
    const unavailable = JSON.parse(
      await readFile(
        path.join(evidence, "not-compared/comparison.json"),
        "utf8",
      ),
    );
    assert.ok(unavailable.states.every((s) => !s.comparable));
    assert.ok(
      unavailable.states[0].reasons.some((r) => /invalid path/.test(r)),
    );
    assert.ok(
      unavailable.states[1].reasons.some((r) => /symlink leaves/.test(r)),
    );
    assert.ok(unavailable.states[1].reasons.some((r) => /predates/.test(r)));
    assert.ok(unavailable.states[2].reasons.some((r) => /absent/.test(r)));
    assert.ok(
      unavailable.states[0].callouts[0].reason.includes("No unique region"),
    );
    const html = await readFile(
      path.join(evidence, "not-compared/index.html"),
      "utf8",
    );
    assert.ok(html.includes("&lt;img"));
    assert.ok(!html.includes('<img src="https://invalid.example/"'));
    await rm(damaged, { recursive: true });
    await writeFile(
      path.join(evidence, "application-validation.json"),
      JSON.stringify(
        {
          browser: browser.version(),
          acceptance: "protocol.md",
          applicationEvidence,
        },
        null,
        2,
      ) + "\n",
    );
    return output;
  } finally {
    await browser.close();
  }
}

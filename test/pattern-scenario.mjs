import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Shared by focused source feedback and the installed CI workflow.
export async function runPatternReviewScenario({
  cli,
  baseURL,
  project,
  rulesPath,
  exampleDirectory,
  repository,
  env = process.env,
  evidenceDirectory = path.join(repository, "dist/pattern-review-evidence"),
  examplePrefix = "/examples/",
}) {
  // Screenshot-informed calibration: local units can pass while their parent
  // still fails. The same contract also rejects compact-but-hidden evidence.
  const patternCatalog = JSON.parse(
    await readFile(
      path.join(exampleDirectory, "pattern-review-catalog.json"),
      "utf8",
    ),
  );
  const patternRules = JSON.parse(
    await readFile(
      path.join(exampleDirectory, "pattern-review-rules.json"),
      "utf8",
    ),
  );
  const patternConfig = JSON.parse(
    await readFile(
      path.join(exampleDirectory, "pattern-review-config.json"),
      "utf8",
    ),
  );
  await mkdir(path.join(project, "docs/examples"), { recursive: true });
  await cp(
    path.join(exampleDirectory, "pattern-review-design.md"),
    path.join(project, "docs/examples/pattern-review-design.md"),
  );
  await writeFile(rulesPath, JSON.stringify(patternRules));
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify({ ...patternConfig, baseURL, sourcePaths: ["src"] }),
  );
  const patternCheck = await cli(["check"]);
  assert.equal(
    patternCheck.code,
    1,
    patternCheck.stderr || patternCheck.stdout,
  );
  const patternReportPath = JSON.parse(patternCheck.stdout).report;
  const patternReport = JSON.parse(await readFile(patternReportPath, "utf8"));
  assert.equal(patternReport.pages.length, 4, JSON.stringify(patternReport));
  const patternEvidence = evidenceDirectory;
  await rm(patternEvidence, { recursive: true, force: true });
  await cp(path.dirname(patternReportPath), path.join(patternEvidence, "cli"), {
    recursive: true,
  });
  const patternFindings = {};
  for (const capture of patternReport.pages) {
    const ids = [
      ...new Set(capture.findings.map((finding) => finding.rule)),
    ].sort();
    assert.deepEqual(
      ids,
      [...patternCatalog.expected[capture.name]].sort(),
      JSON.stringify(capture.findings),
    );
    assert.equal(capture.viewport.name, "desktop");
    assert.equal(capture.details.complete, true);
    assert.ok(
      capture.metrics.evaluations.every((entry) => entry.status === "checked"),
    );
    patternFindings[capture.name] = {
      component: ids.filter((id) => patternCatalog.componentRules.includes(id)),
      composition: ids.filter((id) =>
        patternCatalog.compositionRules.includes(id),
      ),
    };
    for (const finding of capture.findings) {
      const rule = patternRules.find((rule) => rule.id === finding.rule);
      assert.deepEqual(finding.designRules, rule.designRules);
      assert.ok(
        rule.sources.every((source) => finding.sources.includes(source)),
      );
      assert.equal(finding.selector, rule.selector);
      if (rule.type === "max-height") {
        assert.ok(finding.actual > rule.max);
        assert.equal(finding.expected, rule.max);
      }
      if (rule.type === "visible-count") {
        assert.equal(finding.actual, 0);
        assert.equal(finding.expected, 3);
      }
    }
    if (capture.name === "hidden")
      assert.deepEqual(
        capture.findings.map((finding) => finding.actual).sort(),
        [".denominator", ".trend-value", ".trend-comparison"].sort(),
      );
  }
  assert.deepEqual(patternFindings.components.component, []);
  assert.deepEqual(patternFindings.composition, {
    component: [],
    composition: [],
  });

  const browser = await chromium.launch({
    executablePath:
      env.VIEWRULE_BROWSER_PATH || env.UI_REVIEW_BROWSER_PATH || undefined,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const patternErrors = [];
    const recordPatternError = (error) => patternErrors.push(error.message);
    page.on("pageerror", recordPatternError);
    const patternLayouts = {};
    const patternFacts = {
      ".group-identity": "Emerging pattern — Sample group Q7",
      ".observation-window": "Ranking window: cycles I–L",
      ".confidence": "High confidence",
      ".direction": "Decreasing",
      ".rate-value": "26.4%",
      ".denominator": "231 of 875 classified records",
      ".trend-value": "−8.6%",
      ".trend-comparison": "Relative change vs cycles E–H",
      ".volume-value": "875 records",
      ".rate-weight": "Ranking weight: 45%",
      ".trend-weight": "Ranking weight: 35%",
      ".volume-weight": "Ranking weight: 20%",
      ".processing-context .context-value":
        "Average duration: unavailable · Retries observed: 2 of 7 runs",
      ".corroboration-context .context-value":
        "Confirmed reviews: 3 recent · 7 total",
      ".mix-context .context-value":
        "Subtype share: unavailable · Subgroup review rate: 47.2%",
    };
    for (const stage of ["before", "components", "composition", "hidden"]) {
      // Use built Pages paths too: no root-relative asset assumptions.
      await page.goto(
        `${baseURL}${examplePrefix}pattern-review.html?stage=${stage}`,
      );
      await page.waitForSelector(`#pattern-review[data-ready="${stage}"]`);
      patternLayouts[stage] = await page.evaluate((selectors) => {
        const doc = globalThis.document;
        const bounds = (selector) =>
          doc.querySelector(selector).getBoundingClientRect();
        return {
          surfaceHeight: bounds(".pattern-surface").height,
          evidenceHeight: bounds(".evidence-panel").height,
          headerHeight: bounds(".identity-header").height,
          toolbarHeight: bounds(".chart-toolbar").height,
          chartHeight: bounds(".history-chart").height,
          chartWidth: bounds(".history-chart").width,
          cardHeights: [...doc.querySelectorAll(".evidence-card")].map(
            (card) => card.getBoundingClientRect().height,
          ),
          facts: Object.fromEntries(
            selectors.map((selector) => [
              selector,
              (
                doc.querySelector(selector).getAttribute("aria-label") ||
                [...doc.querySelector(selector).childNodes]
                  .map((node) =>
                    node.nodeName === "BR" ? " · " : node.textContent,
                  )
                  .join("")
              )
                .trim()
                .replace(/\s+/g, " "),
            ]),
          ),
          fontSizes: selectors.map(
            (selector) =>
              globalThis.getComputedStyle(doc.querySelector(selector)).fontSize,
          ),
          secondary: [...doc.querySelectorAll(".supporting-copy")].map((node) =>
            node.textContent.trim(),
          ),
          chartPoints: doc.querySelector(".chart-line").getAttribute("points"),
        };
      }, Object.keys(patternFacts));
      assert.deepEqual(patternLayouts[stage].facts, patternFacts);
      const revised = ["composition", "hidden"].includes(stage);
      assert.equal(
        await page.locator(".evidence-grid > article").count(),
        revised ? 3 : 6,
      );
      assert.equal(await page.locator(".ranking-summary").count(), 3);
      assert.deepEqual(
        await page.locator(".context-role").allTextContents(),
        Array(revised ? 1 : 3).fill("Not used in ranking"),
      );
      assert.equal(
        await page.getByText("Why flagged", { exact: true }).count(),
        ["before", "components"].includes(stage) ? 2 : 1,
      );
      assert.equal(
        await page.locator("details[open]").count(),
        stage === "before" ? 6 : 0,
      );
      for (const selector of Object.keys(patternFacts)) {
        const hidden =
          stage === "hidden" &&
          [".denominator", ".trend-value", ".trend-comparison"].includes(
            selector,
          );
        assert.equal(
          await page.locator(selector).isVisible(),
          !hidden,
          `${stage}: ${selector}`,
        );
      }
      if (revised) {
        const compositionGeometry = await page.evaluate(() => {
          const doc = globalThis.document;
          const box = (selector) =>
            doc.querySelector(selector).getBoundingClientRect();
          const center = (selector) => {
            const b = box(selector);
            return b.y + b.height / 2;
          };
          const track = box(".comparison-track");
          return {
            titleCenters: [".group-identity", ".confidence", ".direction"].map(
              center,
            ),
            controlCenters: [".chart-controls", ".latest-value"].map(center),
            latestGap: box(".latest-value").left - box(".chart-controls").right,
            contextRows: [
              ...doc.querySelectorAll(".context-rows > article"),
            ].map((row) => ({
              height: row.getBoundingClientRect().height,
              labelLeft: row.querySelector("h4").getBoundingClientRect().left,
              labelHeight: row.querySelector("h4").getBoundingClientRect()
                .height,
              valueHeight: row
                .querySelector(".context-value")
                .getBoundingClientRect().height,
              role: row.getAttribute("aria-describedby"),
            })),
            currentRatio: box(".current-bar").width / track.width,
            priorRatio: (box(".prior-marker").left - track.left) / track.width,
            rateBarCenters: [
              ".current-bar",
              '[data-factor="rate"] .weight-track',
            ].map(center),
            weights: [...doc.querySelectorAll(".ranking-summary")].map(
              (row) => {
                const weight = row.querySelector(".weight");
                const track = row
                  .querySelector(".weight-track")
                  .getBoundingClientRect();
                const bar = row
                  .querySelector(".weight-bar")
                  .getBoundingClientRect();
                const detail = row
                  .querySelector("summary")
                  .getBoundingClientRect();
                const subject = row.querySelector("h4").getBoundingClientRect();
                return {
                  percent: parseFloat(weight.textContent),
                  ratio: bar.width / track.width,
                  left: track.left,
                  width: track.width,
                  height: bar.height,
                  valueGap:
                    track.top -
                    row.querySelector(".weight-value").getBoundingClientRect()
                      .bottom,
                  subjectLeft: subject.left,
                  rowLeft: row.getBoundingClientRect().left,
                  detailLeft: detail.left,
                  detailGap: detail.top - subject.bottom,
                  scale: weight.getAttribute("aria-describedby"),
                };
              },
            ),
          };
        });
        for (const centers of [
          compositionGeometry.titleCenters,
          compositionGeometry.controlCenters,
        ])
          assert.ok(
            Math.max(...centers) - Math.min(...centers) <= 1,
            "Related header/toolbar items share a centerline",
          );
        assert.ok(
          compositionGeometry.latestGap >= 0 &&
            compositionGeometry.latestGap <= 12,
        );
        assert.equal(compositionGeometry.contextRows.length, 3);
        assert.equal(
          new Set(compositionGeometry.contextRows.map((row) => row.labelLeft))
            .size,
          1,
        );
        for (const row of compositionGeometry.contextRows) {
          assert.ok(
            row.height <= 36 && row.labelHeight <= 21 && row.valueHeight <= 21,
            "Context labels, values and Details fit on one aligned line",
          );
          assert.equal(row.role, "context-role");
        }
        assert.equal(
          await page.locator("#context-role").textContent(),
          "Not used in ranking",
        );
        assert.equal(
          await page.locator(".weight-heading").textContent(),
          "Weight · 0–100%",
        );
        assert.deepEqual(
          compositionGeometry.weights.map((weight) => weight.percent),
          [45, 35, 20],
        );
        for (const property of ["left", "width"])
          assert.equal(
            new Set(
              compositionGeometry.weights.map((weight) => weight[property]),
            ).size,
            1,
            "Ranking weights share aligned, equal-width 0–100% tracks",
          );
        for (const weight of compositionGeometry.weights) {
          assert.ok(Math.abs(weight.ratio - weight.percent / 100) < 0.001);
          assert.ok(weight.width >= 100 && weight.height >= 6);
          assert.ok(weight.valueGap >= 4 && weight.valueGap <= 8);
          assert.ok(
            Math.abs(weight.detailLeft - weight.subjectLeft) <= 1 &&
              Math.abs(weight.detailLeft - weight.rowLeft) <= 1 &&
              weight.detailGap >= 4 &&
              weight.detailGap <= 12,
            "Each Details control is aligned below its subject at the far left",
          );
          assert.equal(weight.scale, "weight-heading");
        }
        assert.ok(
          Math.max(...compositionGeometry.rateBarCenters) -
            Math.min(...compositionGeometry.rateBarCenters) <=
            1,
          "Review-rate and weight bars share a horizontal centerline",
        );
        assert.ok(
          Math.abs(compositionGeometry.currentRatio - 26.4 / 50) < 0.001,
        );
        assert.ok(
          Math.abs(compositionGeometry.priorRatio - 28.875 / 50) < 0.001,
        );
        patternLayouts[stage].compositionGeometry = compositionGeometry;
      }
      await page
        .locator(".pattern-surface")
        .screenshot({ path: path.join(patternEvidence, `${stage}.png`) });
    }
    for (const stage of ["before", "components", "hidden"]) {
      for (const key of ["fontSizes", "secondary", "chartPoints"])
        assert.deepEqual(
          patternLayouts[stage][key],
          patternLayouts.composition[key],
        );
    }
    assert.ok(
      patternLayouts.before.cardHeights
        .slice(0, 5)
        .every((height) => height >= 360),
    );
    assert.ok(
      patternLayouts.components.cardHeights
        .slice(0, 5)
        .every((height) => height >= 310),
    );
    assert.ok(patternLayouts.components.evidenceHeight > 360);
    assert.ok(patternLayouts.composition.evidenceHeight <= 360);
    assert.ok(patternLayouts.composition.headerHeight <= 56);
    assert.ok(
      patternLayouts.composition.chartHeight >= 120 &&
        patternLayouts.composition.chartHeight <= 160,
    );
    assert.ok(patternLayouts.composition.chartWidth >= 600);
    assert.ok(patternLayouts.composition.surfaceHeight <= 560);
    assert.ok(
      patternLayouts.composition.surfaceHeight <
        patternLayouts.components.surfaceHeight * 0.5,
    );

    assert.ok(
      patternLayouts.composition.surfaceHeight <
        patternLayouts.components.surfaceHeight * 0.75,
    );
    assert.ok(
      patternLayouts.composition.fontSizes.every(
        (size) => parseFloat(size) >= 14,
      ),
    );

    await page.goto(`${baseURL}${examplePrefix}pattern-review.html`);
    await page.waitForSelector('#pattern-review[data-ready="composition"]');
    const disclosureNames = [
      "Details: Rate calculation",
      "Details: Trend calculation",
      "Details: Volume calculation",
      "Details: Processing diagnostics",
      "Details: Corroboration notes",
      "Details: Collection notes",
    ];
    assert.equal(await page.locator("summary").count(), disclosureNames.length);
    for (const name of disclosureNames) {
      const summary = page.getByLabel(name, { exact: true });
      assert.equal(await summary.textContent(), "Details");
    }
    // Chromium exposes native summaries as DisclosureTriangle nodes; the
    // generic ARIA text snapshot omits their computed names.
    const accessibilitySession = await page.context().newCDPSession(page);
    const { nodes: accessibilityNodes } = await accessibilitySession.send(
      "Accessibility.getFullAXTree",
    );
    await accessibilitySession.detach();
    assert.deepEqual(
      accessibilityNodes
        .filter(
          (node) => !node.ignored && node.role?.value === "DisclosureTriangle",
        )
        .map((node) => node.name?.value),
      disclosureNames,
    );
    const rankingBefore = await page
      .locator(".ranking-summary")
      .allTextContents();
    for (const { label, count, start } of [
      { label: "4 cycles", count: 4, start: "I" },
      { label: "8 cycles", count: 8, start: "E" },
      { label: "All cycles", count: 12, start: "A" },
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      assert.equal(
        await page
          .getByRole("button", { name: label, exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await page.locator("button[aria-pressed=true]").count(), 1);
      assert.equal(
        await page.locator(".chart-window").textContent(),
        `History: cycles ${start}–L`,
      );
      const points = (
        await page.locator(".chart-line").getAttribute("points")
      ).split(" ");
      assert.equal(points.length, count);
      assert.equal(points.at(-1), "1000,100.8");
      assert.deepEqual(
        await page.locator(".ranking-summary").allTextContents(),
        rankingBefore,
      );
      assert.equal(
        await page.locator(".action-status").textContent(),
        "Not queued",
      );
    }
    const disclosure = page.locator(".trend-detail summary");
    await disclosure.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".trend-detail").getAttribute("open"), "");
    assert.equal(
      await page.locator(".trend-detail .supporting-copy").isVisible(),
      true,
    );
    assert.ok(
      await page.locator(".trend-detail").evaluate((detail) => {
        const summary = detail.querySelector("summary").getBoundingClientRect();
        const copy = detail
          .querySelector(".supporting-copy")
          .getBoundingClientRect();
        return copy.top >= summary.bottom;
      }),
      "Expanded supporting text stays below the row and its left-hand Details control",
    );
    assert.equal(
      await disclosure.evaluate(
        (el) => el === globalThis.document.activeElement,
      ),
      true,
    );
    for (const selector of Object.keys(patternFacts))
      assert.equal(await page.locator(selector).isVisible(), true);
    assert.equal(
      await page.locator(".action-status").textContent(),
      "Not queued",
    );
    await page.locator(".pattern-surface").screenshot({
      path: path.join(patternEvidence, "composition-expanded.png"),
    });
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator(".trend-detail .supporting-copy").isVisible(),
      false,
    );
    const contextDisclosures = [];
    for (const context of ["processing", "corroboration", "mix"]) {
      const row = page.locator(`.context-rows [data-context="${context}"]`);
      const detail = row.locator("details");
      const summary = detail.locator("summary");
      const before = await summary.boundingBox();
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await detail.getAttribute("open"), "");
      assert.equal(await detail.locator(".supporting-copy").isVisible(), true);
      const expanded = await summary.boundingBox();
      const content = await detail.locator(".supporting-copy").boundingBox();
      assert.ok(content.y >= expanded.y + expanded.height);
      assert.equal(await row.locator(".context-value").isVisible(), true);
      assert.equal(
        await summary.evaluate(
          (el) => el === globalThis.document.activeElement,
        ),
        true,
      );
      if (context === "processing")
        await page.locator(".pattern-surface").screenshot({
          path: path.join(patternEvidence, "composition-context-expanded.png"),
        });
      await page.keyboard.press("Enter");
      assert.equal(await detail.getAttribute("open"), null);
      assert.equal(await detail.locator(".supporting-copy").isVisible(), false);
      assert.equal(
        await summary.evaluate(
          (el) => el === globalThis.document.activeElement,
        ),
        true,
      );
      const closed = await summary.boundingBox();
      for (const bounds of [expanded, closed])
        for (const key of ["x", "y", "width", "height"])
          assert.ok(
            Math.abs(bounds[key] - before[key]) <= 1,
            `${context}: Details retains its position and target size through disclosure`,
          );
      contextDisclosures.push({ context, before, expanded, closed });
    }
    for (const selector of Object.keys(patternFacts))
      assert.equal(await page.locator(selector).isVisible(), true);
    assert.equal(
      await page.locator(".chart-window").textContent(),
      "History: cycles A–L",
    );
    assert.equal(
      await page.locator(".action-status").textContent(),
      "Not queued",
    );
    await page.getByRole("button", { name: "Queue Q7 for review" }).click();
    assert.equal(
      await page.locator(".action-status").textContent(),
      "Q7 queued locally · no external changes",
    );
    await page.getByRole("button", { name: "4 cycles", exact: true }).click();
    await disclosure.click();
    assert.equal(
      await page.locator(".action-status").textContent(),
      "Q7 queued locally · no external changes",
    );
    assert.deepEqual(
      await page.locator(".ranking-summary").allTextContents(),
      rankingBefore,
    );
    assert.deepEqual(patternErrors, []);
    page.off("pageerror", recordPatternError);
    await writeFile(
      path.join(patternEvidence, "captures.json"),
      JSON.stringify(
        {
          viewport: patternConfig.viewports[0],
          deviceScaleFactor: 1,
          browser: browser.version(),
          contractHash: patternReport.contract.hash,
          findings: patternFindings,
          layouts: patternLayouts,
          disclosureNames,
          contextDisclosures,
          interactions:
            "Passed: revised default route, inline header and chart controls, aligned one-line context rows with a shared pill, correct current/prior chart geometry, proportional weights on shared tracks, aligned review-rate and weight bars, Details below left-hand row subjects, visible disclosure labels retained in accessible names, stationary context controls through expansion/collapse, history range and fixed ranking scope, keyboard disclosure/focus, required facts retained, Q7-only local action, retained action state, Pages prefix assets.",
          unassessed: patternCatalog.humanReview,
        },
        null,
        2,
      ),
    );

    await runRemainingPatterns({
      cli,
      baseURL,
      project,
      rulesPath,
      exampleDirectory,
      patternEvidence,
      page,
      browser,
    });
  } finally {
    await browser.close();
  }
  return patternEvidence;
}

async function runRemainingPatterns({
  cli,
  baseURL,
  project,
  rulesPath,
  exampleDirectory,
  patternEvidence,
  page,
  browser,
}) {
  const catalog = JSON.parse(
    await readFile(
      path.join(exampleDirectory, "pattern-review-cases.json"),
      "utf8",
    ),
  );
  const pages = Object.keys(catalog.cases).flatMap((name) =>
    ["good", "bad"].map((quality) => ({
      name: `${name}-${quality}`,
      path: `/examples/pattern-review.html?case=${name}&quality=${quality}`,
      ready: `#pattern-review[data-ready="${name}-${quality}"]`,
    })),
  );
  const config = {
    version: 1,
    baseURL,
    enforceOnStop: false,
    sourcePaths: ["src"],
    projectDocuments: ["docs/examples/pattern-review-design.md"],
    accessibility: true,
    pages,
    viewports: [{ name: "desktop", width: 1440, height: 1000 }],
  };
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify(config),
  );
  const rules = [
    ...catalog.baseRules,
    {
      ...catalog.changedTaskRule,
      pages: ["changed-task-good", "changed-task-bad"],
    },
  ];
  await writeFile(rulesPath, JSON.stringify(rules));
  const result = await cli(["check"]);
  assert.equal(result.code, 1, result.stderr || result.stdout);
  const reportFile = JSON.parse(result.stdout).report;
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  assert.equal(report.pages.length, pages.length);
  await cp(path.dirname(reportFile), path.join(patternEvidence, "cases-v2"), {
    recursive: true,
  });
  const outcomes = [];
  for (const capture of report.pages) {
    const name = capture.name.replace(/-(good|bad)$/, "");
    const quality = capture.name.endsWith("-good") ? "good" : "bad";
    const findings = [...new Set(capture.findings.map((f) => f.rule))].sort();
    assert.deepEqual(
      findings,
      quality === "good" ? [] : [...catalog.cases[name].bad].sort(),
      JSON.stringify(capture.findings),
    );
    assert.ok(capture.metrics.evaluations.every((e) => e.status === "checked"));
    for (const finding of capture.findings) {
      const rule = rules.find((r) => r.id === finding.rule);
      assert.deepEqual(finding.designRules, rule.designRules);
      assert.equal(finding.selector, rule.selector);
      if (rule.type === "max-height") {
        assert.ok(finding.actual > rule.max);
        assert.equal(finding.expected, rule.max);
      }
      if (rule.type === "context")
        assert.ok(rule.required.includes(finding.actual));
    }
    outcomes.push({ name: capture.name, findings });
  }
  // A real historical contract run remains separately retained. Removing the
  // new obligation here recreates v1, not permission to weaken a live task.
  await writeFile(rulesPath, JSON.stringify(catalog.baseRules));
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify({
      ...config,
      pages: pages.filter((p) => p.name.startsWith("changed-task-")),
    }),
  );
  const historical = await cli(["check"]);
  assert.equal(historical.code, 0, historical.stderr || historical.stdout);
  const historicalFile = JSON.parse(historical.stdout).report;
  const historicalReport = JSON.parse(await readFile(historicalFile, "utf8"));
  assert.ok(historicalReport.pages.every((p) => p.findings.length === 0));
  assert.notEqual(historicalReport.contract.hash, report.contract.hash);
  await cp(
    path.dirname(historicalFile),
    path.join(patternEvidence, "cases-v1"),
    { recursive: true },
  );
  // Restore the current requirements before returning; a historical pass is not
  // completion evidence for a changed requirement.
  await writeFile(rulesPath, JSON.stringify(rules));
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify(config),
  );
  const interactions = [];
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on("pageerror", onError);
  for (const name of Object.keys(catalog.cases)) {
    const facts = {};
    for (const quality of ["good", "bad"]) {
      await page.goto(
        `${baseURL}/examples/pattern-review.html?case=${name}&quality=${quality}`,
      );
      await page.waitForSelector(
        `#pattern-review[data-ready="${name}-${quality}"]`,
      );
      facts[quality] = await page.locator(".decision-row").evaluateAll((rows) =>
        rows.map((row) => ({
          key: row.getAttribute("data-key"),
          values: [
            ".queue-identity",
            ".queue-source",
            ".queue-denominator",
            ".queue-eligibility",
            ".queue-action",
            ".queue-trend",
          ].map((selector) => row.querySelector(selector).textContent),
        })),
      );
      assert.equal(await page.locator(".decision-row").count(), 3);
      assert.equal(
        await page
          .getByRole("button", { name: "Queue Q8 for review" })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page.locator(".queue-trend").first().isVisible(),
        name === "changed-task" && quality === "good",
      );
      assert.equal(await page.locator(".local-window").count(), 3);
      const heights = await page
        .locator(".decision-row")
        .evaluateAll((rows) =>
          rows.map((row) => row.getBoundingClientRect().height),
        );
      if (name === "whitespace") {
        assert.ok(
          heights.every((height) =>
            quality === "good" ? height <= 180 : height === 240,
          ),
        );
        if (quality === "good") {
          const bounds = await page
            .locator(".comparison-surface")
            .boundingBox();
          assert.ok(
            bounds.y + bounds.height < 1000,
            "Finite content may leave unused viewport space",
          );
        }
      }
      await page.locator(".comparison-surface").screenshot({
        path: path.join(patternEvidence, `${name}-${quality}.png`),
      });
      const summary = page.getByText("Details for Q7", { exact: true });
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await summary.evaluate(
          (el) => el === globalThis.document.activeElement,
        ),
        true,
      );
      assert.equal(
        await page
          .locator('.decision-row[data-key="Q7"] .queue-detail')
          .getAttribute("open"),
        "",
      );
      assert.deepEqual(
        await page.locator(".queue-action-status").allTextContents(),
        ["Not queued", "Not queued", "Not queued"],
      );
      await page.keyboard.press("Enter");
      // Independently scoped windows are intentionally different; keep their
      // identity even when the rejected composition hoists them.
      assert.deepEqual(
        await page
          .locator(".local-window select")
          .evaluateAll((selects) => selects.map((s) => s.value)),
        ["4", "8", "4"],
      );
      await page
        .getByLabel("Q7 history window", { exact: true })
        .selectOption("8");
      assert.deepEqual(
        await page
          .locator(".local-window select")
          .evaluateAll((selects) => selects.map((s) => s.value)),
        ["8", "8", "4"],
      );
      assert.equal(
        await page
          .locator('.decision-row[data-key="Q7"] .local-window')
          .count(),
        name === "scopes" && quality === "bad" ? 0 : 1,
      );
      await page.locator(".source-filter").selectOption("catalog");
      assert.deepEqual(
        await page
          .locator(".decision-row:visible .queue-identity")
          .allTextContents(),
        ["Q7", "Q8"],
      );
      assert.equal(
        await page.locator(".active-scope").textContent(),
        "Showing Catalog · 2 groups",
      );
      assert.equal(
        await page.locator(".active-scope").isVisible(),
        !(name === "toolbar" && quality === "bad"),
      );
      await page
        .getByRole("button", { name: "Queue Q7 for review", exact: true })
        .click();
      assert.deepEqual(
        await page.locator(".queue-action-status").allTextContents(),
        ["Q7 queued locally", "Not queued", "Not queued"],
      );
      await page.locator(".source-filter").selectOption("all");
      assert.equal(
        await page
          .locator('.decision-row[data-key="Q7"] .queue-action-status')
          .textContent(),
        "Q7 queued locally",
      );
      interactions.push({
        name,
        quality,
        heights,
        filter: "Catalog: Q7/Q8",
        mutation: "Q7 only",
        disclosure: "keyboard focus retained; no mutation",
        windows: "only Q7 changed",
      });
    }
    assert.deepEqual(
      facts.good,
      facts.bad,
      `${name}: hold identities, required facts, data and actions constant`,
    );
  }
  page.off("pageerror", onError);
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(patternEvidence, "cases.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        viewport: config.viewports[0],
        deviceScaleFactor: 1,
        revisions: {
          historical: {
            version: 1,
            hash: historicalReport.contract.hash,
            findings: [],
          },
          current: { version: 2, hash: report.contract.hash },
        },
        outcomes,
        interactions,
        unassessed: [
          "Task relevance and sufficiency outside this synthetic fixture",
          "Human approval",
          "Agent efficacy and cost",
        ],
      },
      null,
      2,
    ),
  );
}

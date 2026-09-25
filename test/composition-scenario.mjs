import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import path from "node:path";

// The installed regression and focused source check share these exact assertions.
export async function runCompositionScenario({
  cli,
  baseURL,
  project,
  rulesPath,
  exampleDirectory,
  repository,
  env,
  evidenceDirectory = path.join(repository, "dist/composition-evidence"),
}) {
  // Four declared composition relationships share one baseline and one
  // controlled counterexample each, exercised through the supplied CLI.
  const compositionRules = JSON.parse(
    await readFile(
      path.join(exampleDirectory, "composition-rules.json"),
      "utf8",
    ),
  );
  const compositionConfig = JSON.parse(
    await readFile(
      path.join(exampleDirectory, "composition-config.json"),
      "utf8",
    ),
  );
  Object.assign(compositionConfig, { baseURL, sourcePaths: ["src"] });
  await writeFile(rulesPath, JSON.stringify(compositionRules));
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify(compositionConfig),
  );
  const compositionCheck = await cli(["check"]);
  assert.equal(
    compositionCheck.code,
    1,
    compositionCheck.stderr || compositionCheck.stdout,
  );
  const compositionReportFile = JSON.parse(compositionCheck.stdout).report;
  const compositionReport = JSON.parse(
    await readFile(compositionReportFile, "utf8"),
  );
  const compositionEvidence = evidenceDirectory;
  await mkdir(compositionEvidence, { recursive: true });
  await cp(
    path.dirname(compositionReportFile),
    path.join(compositionEvidence, "report"),
    { recursive: true },
  );
  for (const capture of compositionReport.pages) {
    const [family, quality] = capture.name.split("-");
    const expected =
      quality === "bad" &&
      (family !== "economy" || capture.viewport.name === "wide")
        ? [`composition-${family === "economy" ? "growth" : family}`]
        : [];
    assert.deepEqual(
      [...new Set(capture.findings.map((finding) => finding.rule))],
      expected,
      JSON.stringify(capture.findings),
    );
    const measured = capture.metrics.composition;
    if (family === "alignment") {
      assert.equal(
        measured.find((entry) => entry.rule === "composition-alignment")
          .maxResidual,
        quality === "good" ? 0 : 24,
      );
    } else if (family === "rhythm") {
      const rhythm = measured.find(
        (entry) => entry.rule === "composition-rhythm",
      );
      assert.deepEqual(rhythm.gaps, quality === "good" ? [12, 12] : [12, 36]);
      assert.equal(rhythm.coefficientOfVariation, quality === "good" ? 0 : 0.5);
    } else if (family === "balance") {
      const balance = measured.find(
        (entry) => entry.rule === "composition-balance",
      );
      assert.ok(
        quality === "good"
          ? balance.coefficientOfVariation < 0.001
          : balance.coefficientOfVariation > 0.29,
      );
      assert.equal(
        measured.find((entry) => entry.rule === "composition-peer-type")
          .coefficientOfVariation,
        0,
      );
    } else {
      const growth = capture.metrics.growth[0];
      assert.deepEqual(growth.keys.slice(0, 3), ["AL-104", "BI-208", "CE-312"]);
      assert.equal(
        growth.keys.length,
        quality === "good" && capture.viewport.name === "wide" ? 6 : 3,
      );
      if (capture.viewport.name === "wide") {
        assert.equal(growth.comparison.referenceCount, 3);
        assert.deepEqual(growth.comparison.lostKeys, []);
        assert.equal(growth.comparison.referenceArea, 686 * 336);
        assert.equal(growth.area, 1166 * 336);
        assert.equal(growth.comparison.areaGrowth, 480 / 686);
        assert.equal(
          growth.comparison.yield,
          quality === "good" ? 686 / 480 : 0,
        );
      }
      const chrome = measured.find(
        (entry) => entry.rule === "composition-chrome",
      );
      assert.ok(chrome.valid && chrome.ratio < 0.45);
    }
  }
  // Peer inference is advisory discovery, not an implicit rule. The rejected
  // form exposes a same-row control offset without any authored selector; the
  // accepted counterpart aligns the same three controls.
  await writeFile(rulesPath, "[]");
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify({
      ...compositionConfig,
      pages: [
        {
          name: "peer-inference-good",
          path: "/examples/peer-inference.html?quality=good",
          ready: "#peer-inference-example[data-ready]",
        },
        {
          name: "peer-inference-bad",
          path: "/examples/peer-inference.html?quality=bad",
          ready: "#peer-inference-example[data-ready]",
        },
      ],
      viewports: [compositionConfig.viewports[0]],
    }),
  );
  const peerInferenceCheck = await cli(["check"]);
  assert.equal(
    peerInferenceCheck.code,
    0,
    peerInferenceCheck.stderr || peerInferenceCheck.stdout,
  );
  const peerInferenceReportFile = JSON.parse(
    peerInferenceCheck.stdout,
  ).report;
  const peerInferenceReport = JSON.parse(
    await readFile(peerInferenceReportFile, "utf8"),
  );
  const peerInferenceHTML = await readFile(
    path.join(path.dirname(peerInferenceReportFile), "index.html"),
    "utf8",
  );
  assert.match(peerInferenceHTML, /Show\s+inferred structure/);
  assert.match(peerInferenceHTML, /Inferred 1 · DR-017/);
  assert.match(peerInferenceHTML, /peer-anchor-guide/);
  assert.match(peerInferenceHTML, /peer-member-outline/);
  assert.match(peerInferenceHTML, /Δ [-+]?\d+\.\dpx/);
  assert.match(peerInferenceHTML, /href="capture-2\.png"/);
  for (const capture of peerInferenceReport.pages) {
    assert.deepEqual(capture.findings, []);
    const candidates = capture.metrics.peerInference;
    if (capture.name === "peer-inference-bad") {
      assert.equal(candidates.length, 1, JSON.stringify(candidates));
      const [candidate] = candidates;
      assert.equal(candidate.kind, "form-control-alignment");
      assert.equal(candidate.controls.length, 3);
      assert.ok(candidate.maxResidual > 10);
      assert.deepEqual(candidate.designRules, ["DR-017"]);
      assert.match(candidate.suggestion, /materialize a scoped DR-017 rule/);
    } else {
      assert.deepEqual(candidates, []);
    }
  }

  const savedGlobalDirectory = env.VIEWRULE_CONFIG_DIR;
  env.VIEWRULE_CONFIG_DIR = path.join(project, "composition-global");
  await mkdir(env.VIEWRULE_CONFIG_DIR);
  await writeFile(
    path.join(env.VIEWRULE_CONFIG_DIR, "rules.json"),
    JSON.stringify([
      {
        ...compositionRules.find((rule) => rule.id === "composition-growth"),
        id: "global-growth",
        pages: ["economy-good"],
      },
    ]),
  );
  await writeFile(rulesPath, "[]");
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify({
      ...compositionConfig,
      pages: [
        compositionConfig.pages.find((page) => page.name === "economy-good"),
      ],
      viewports: [compositionConfig.viewports[0]],
    }),
  );
  const referenceOnly = await cli(["contract"]);
  assert.equal(referenceOnly.code, 2);
  assert.match(
    referenceOnly.stderr,
    /global-growth.*at least two captured viewports/,
  );
  env.VIEWRULE_CONFIG_DIR = savedGlobalDirectory;
  // The same workflow records useful finite whitespace, nested chrome union,
  // a concrete prominence regression, and missing evidence isolated by checkpoint.
  await writeFile(
    path.join(project, "composition-checkpoint.mjs"),
    `export default async function ({ page, checkpoint }) {
    if (checkpoint.name === 'missing-identity' && page.viewportSize().width < 1000)
      await page.locator('.queue li').first().evaluate((el) => el.removeAttribute('data-shipment'));
    if (checkpoint.name === 'lost-identity' && page.viewportSize().width > 1000)
      await page.locator('.queue li').first().evaluate((el) => {
        el.setAttribute('data-shipment', 'AL-999');
        el.querySelector('strong').textContent = 'AL-999';
      });
    if (checkpoint.name === 'oversized-chrome')
      await page.locator('#good .economy-surface > header').evaluate((el) => { el.style.minHeight = '600px'; });
    if (['unequal-type', 'equal-contents-type'].includes(checkpoint.name))
      await page.locator('.coverage-peers h4').nth(1).evaluate((el, unequal) => {
        el.style.display = 'contents';
        el.style.fontSize = unequal ? '24px' : '16px';
        const hidden = el.cloneNode(true);
        hidden.style.display = 'none';
        hidden.style.fontSize = '80px';
        el.parentElement.append(hidden);
      }, checkpoint.name === 'unequal-type');
    if (checkpoint.name === 'rendered-evidence')
      await page.locator('#good .queue').evaluate((queue) => {
        const rows = [...queue.querySelectorAll('li')];
        const items = rows.map((row) => {
          const item = document.createElement('div');
          item.className = 'rendered-item';
          item.setAttribute('data-shipment', row.getAttribute('data-shipment'));
          item.style.cssText = 'display:flex;flex-direction:column';
          item.append(...row.childNodes);
          row.removeAttribute('data-shipment');
          row.append(item);
          return item;
        });
        queue.style.position = 'relative';
        const readable = items[0].querySelector('span');
        readable.style.display = 'contents';
        readable.style.fontSize = '14px';
        const gutterStyle = document.createElement('style');
        gutterStyle.textContent = '.queue .gutter-regression::-webkit-scrollbar { width:16px; height:16px; }';
        document.head.append(gutterStyle);
        rows[0].classList.add('gutter-regression');
        rows[0].tabIndex = 0;
        rows[0].style.cssText = 'position:relative;box-sizing:border-box;width:200px;height:88px;padding:0;border:1px solid;overflow:scroll;scrollbar-gutter:stable';
        Object.assign(items[0].style, { position:'absolute', left:'0', top:'0', width:'198px', height:'86px' });
        if (rows[0].clientWidth !== 182 || items[0].getBoundingClientRect().width !== 198)
          throw new Error('The gutter fixture must reserve 16px while its evidence fills the painted padding box.');
        const hiddenNote = document.createElement('span');
        hiddenNote.hidden = true;
        hiddenNote.style.fontSize = '8px';
        hiddenNote.textContent = 'Hidden operational note';
        items[0].append(hiddenNote);
        const unreadable = items[3].querySelector('span');
        unreadable.style.display = 'contents';
        unreadable.style.fontSize = '8px';
        rows[1].style.cssText = 'width:200.333px;height:88px;padding:0;border:1px solid;box-sizing:content-box;overflow:hidden';
        items[1].style.width = '100%';
        items[1].style.height = '88px';
        rows[2].style.cssText = 'width:20px;height:20px;padding:0;border:0;overflow:hidden;position:static';
        items[2].style.cssText = 'display:flex;flex-direction:column;position:absolute;top:200px;left:0;width:200px;height:88px';
        rows[4].style.cssText = 'width:20px;height:20px;padding:0;border:0;overflow:hidden;position:relative';
        items[4].style.cssText = 'display:flex;flex-direction:column;position:absolute;top:0;left:0;width:200px;height:88px';
      });
  }`,
  );
  const finiteRule = {
    ...compositionRules.find((rule) => rule.id === "composition-growth"),
    id: "composition-finite",
    pages: ["economy-finite"],
    finiteKeys: ["AL-104", "BI-208", "CE-312"],
  };
  await writeFile(
    rulesPath,
    JSON.stringify([
      ...compositionRules.flatMap((rule) => {
        if (!rule.pages) return [rule];
        const pages = rule.pages.filter((name) =>
          ["economy-good", "balance-good"].includes(name),
        );
        if (rule.id === "composition-chrome") pages.push("chrome-regression");
        return pages.length ? [{ ...rule, pages }] : [];
      }),
      finiteRule,
      {
        ...compositionRules.find((rule) => rule.id === "composition-growth"),
        id: "composition-rendered-evidence",
        pages: ["rendered-evidence"],
        items: ".rendered-item",
      },
    ]),
  );
  await writeFile(
    path.join(project, ".ui-review/config.json"),
    JSON.stringify({
      ...compositionConfig,
      pages: [
        {
          ...compositionConfig.pages.find(
            (page) => page.name === "economy-good",
          ),
          checkpoints: [
            { name: "intact", setup: "composition-checkpoint.mjs" },
            { name: "missing-identity", setup: "composition-checkpoint.mjs" },
            { name: "lost-identity", setup: "composition-checkpoint.mjs" },
          ],
        },
        {
          ...compositionConfig.pages.find(
            (page) => page.name === "balance-good",
          ),
          checkpoints: [
            {
              name: "equal-contents-type",
              setup: "composition-checkpoint.mjs",
            },
            { name: "unequal-type", setup: "composition-checkpoint.mjs" },
          ],
        },
        {
          name: "economy-finite",
          path: "/examples/composition.html?rule=DR-019&quality=good&mode=finite",
          ready: "#composition-examples[data-ready]",
        },
        {
          name: "rendered-evidence",
          path: "/examples/composition.html?rule=DR-019&quality=good",
          ready: "#composition-examples[data-ready]",
          checkpoints: [
            {
              name: "rendered-evidence",
              setup: "composition-checkpoint.mjs",
            },
          ],
        },
        {
          name: "chrome-regression",
          path: "/examples/composition.html?rule=DR-019&quality=good",
          ready: "#composition-examples[data-ready]",
          checkpoints: [
            { name: "oversized-chrome", setup: "composition-checkpoint.mjs" },
          ],
        },
      ],
    }),
  );
  const compositionRegressionCheck = await cli(["check"]);
  assert.equal(
    compositionRegressionCheck.code,
    1,
    compositionRegressionCheck.stderr || compositionRegressionCheck.stdout,
  );
  const compositionRegressionFile = JSON.parse(
    compositionRegressionCheck.stdout,
  ).report;
  const compositionRegression = JSON.parse(
    await readFile(compositionRegressionFile, "utf8"),
  );
  await cp(
    path.dirname(compositionRegressionFile),
    path.join(compositionEvidence, "regression-report"),
    { recursive: true },
  );
  for (const capture of compositionRegression.pages) {
    if (capture.name === "rendered-evidence") {
      const growth = capture.metrics.growth[0];
      assert.equal(growth.valid, true);
      assert.deepEqual(
        growth.keys,
        capture.viewport.name === "compact"
          ? ["AL-104", "BI-208", "CE-312"]
          : ["AL-104", "BI-208", "CE-312", "CE-324"],
      );
      const readable = growth.items.find((item) => item.key === "AL-104");
      assert.equal(
        readable.minFontSize,
        14,
        "Rendered display:contents text counts, while the hidden 8px note does not",
      );
      assert.equal(
        readable.eligible,
        true,
        "Readable evidence painted into a reserved, hidden scrollbar gutter remains eligible",
      );
      const fractional = growth.items.find((item) => item.key === "BI-208");
      assert.equal(
        fractional.eligible,
        true,
        "The fully fitting percentage-width child must not be clipped by rounded clientWidth or serialized CSSOM dimensions",
      );
      assert.deepEqual(fractional.reasons, []);
      const escaped = growth.items.find((item) => item.key === "CE-312");
      assert.equal(
        escaped.eligible,
        true,
        "An absolute item escapes an intervening static overflow wrapper when the queue establishes its containing block",
      );
      assert.deepEqual(escaped.reasons, []);
      if (capture.viewport.name === "wide") {
        const unreadable = growth.items.find((item) => item.key === "AL-116");
        assert.equal(unreadable.minFontSize, 8);
        assert.equal(unreadable.eligible, false);
        assert.ok(unreadable.reasons.includes("below readable type size"));
        const clipped = growth.items.find((item) => item.key === "BI-220");
        assert.equal(clipped.eligible, false);
        assert.ok(clipped.reasons.includes("clipped by ancestor overflow"));
        assert.deepEqual(growth.comparison.lostKeys, []);
        assert.equal(growth.comparison.referenceCount, 3);
        assert.equal(growth.comparison.yield, 1 / 3 / (480 / 686));
        assert.deepEqual(
          capture.findings.map((finding) => finding.rule),
          ["composition-rendered-evidence"],
        );
      } else {
        assert.deepEqual(capture.findings, []);
      }
    } else if (capture.name === "economy-finite") {
      assert.deepEqual(capture.findings, []);
      const growth = capture.metrics.growth[0];
      assert.equal(growth.keys.length, 3);
      if (capture.viewport.name === "wide") {
        assert.equal(growth.comparison.yield, 0);
        assert.equal(growth.comparison.status, "saturated");
      }
    } else if (capture.name === "economy-good") {
      const growth = capture.metrics.growth[0];
      if (capture.checkpoint === "missing-identity") {
        assert.equal(growth.valid, capture.viewport.name === "wide");
        assert.equal(growth.comparison.status, "unassessed");
        assert.ok(
          capture.findings.some(
            (finding) => finding.rule === "composition-growth",
          ),
        );
        assert.equal(
          capture.metrics.evaluations.find(
            (entry) => entry.rule === "composition-growth",
          ).status,
          "unassessed",
        );
        if (capture.viewport.name === "wide")
          assert.match(
            growth.comparison.reason,
            /reference evidence is missing or invalid/,
          );
      } else if (
        capture.checkpoint === "lost-identity" &&
        capture.viewport.name === "wide"
      ) {
        assert.equal(growth.valid, true);
        assert.equal(growth.keys.length, 6);
        assert.equal(growth.comparison.yield, 686 / 480);
        assert.deepEqual(growth.comparison.lostKeys, ["AL-104"]);
        assert.ok(
          capture.findings.some(
            (finding) =>
              finding.rule === "composition-growth" &&
              /lost previously visible task evidence/.test(finding.message),
          ),
        );
      } else {
        assert.deepEqual(capture.findings, []);
        if (capture.viewport.name === "wide")
          assert.equal(
            growth.comparison.yield,
            686 / 480,
            "A missing identity in another checkpoint must not contaminate this comparison",
          );
      }
    } else if (capture.name === "balance-good") {
      const peers = capture.metrics.composition.find(
        (entry) => entry.rule === "composition-peer-type",
      );
      assert.equal(
        peers.count,
        3,
        "Rendered boxless labels count; hidden labels do not",
      );
      if (capture.checkpoint === "equal-contents-type") {
        assert.deepEqual(capture.findings, []);
        assert.deepEqual(peers.values, [16, 16, 16]);
        assert.equal(peers.coefficientOfVariation, 0);
      } else {
        assert.ok(
          capture.findings.some(
            (finding) => finding.rule === "composition-peer-type",
          ),
        );
        assert.deepEqual(peers.values, [16, 24, 16]);
        assert.ok(peers.coefficientOfVariation > 0.2);
      }
    } else {
      const chrome = capture.metrics.composition.find(
        (entry) => entry.rule === "composition-chrome",
      );
      assert.ok(chrome.ratio > 0.45 && chrome.ratio <= 1);
      assert.ok(
        capture.findings.some(
          (finding) => finding.rule === "composition-chrome",
        ),
      );
    }
  }
  return compositionEvidence;
}

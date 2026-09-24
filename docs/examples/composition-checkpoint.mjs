import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { inspectPage } from "../../src/checks.mjs";
import { validateRules } from "../../src/config.mjs";
import { designIdsFor, readDesignPolicy } from "../../src/design.mjs";
import { evaluateViewportGrowth } from "../../src/viewport-growth.mjs";

// Exercise real rendered counterexamples with the native collector/evaluator.
// Thresholds stay constant while the fixture changes; no approved reference.
export async function runCompositionCheckpoint(root) {
  const html = await readFile(path.join(root, "docs/examples/composition.html"), "utf8");
  const rules = validateRules(JSON.parse(await readFile(
    path.join(root, "docs/examples/composition-rules.json"), "utf8",
  )));
  const growthRule = rules.find((rule) => rule.id === "offer-growth");
  assert.ok(designIdsFor(growthRule).includes("DR-019"));
  const policy = await readDesignPolicy();
  for (const id of ["DR-017", "DR-018", "DR-019", "DR-020"])
    assert.ok(policy.rules.some((rule) => rule.id === id));
  const directory = path.join(root, "dist/composition-evidence");
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.VIEWRULE_BROWSER_PATH || undefined,
  });
  const outputs = {};
  const capture = async (name, variant = "good", activeRules = rules) => {
    const viewport = { name, width: name === "desktop" ? 1000 : 2000, height: 800 };
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    try {
      await page.setContent(html);
      await page.evaluate((variant) => {
        if (variant === "stretched") globalThis.document.body.dataset.stretched = "true";
        if (variant === "bad-peers") globalThis.document.body.dataset.badPeers = "true";
        const offers = [...globalThis.document.querySelectorAll("[data-offer]")];
        if (variant === "duplicates")
          offers.forEach((el, index) => el.setAttribute("data-offer", "abcd"[index % 4]));
        if (variant === "finite") offers.slice(4).forEach((el) => el.remove());
        if (variant === "tiny")
          globalThis.document.querySelector("#offers").setAttribute("style", "font-size: 8px");
        if (variant === "empty") offers[0].textContent = "";
        return globalThis.document.fonts.ready.then(() => undefined);
      }, variant);
      const result = await page.evaluate(inspectPage, activeRules);
      if (variant === "good" || variant === "stretched")
        await page.screenshot({ path: path.join(directory, `${name}-${variant}.png`) });
      return { name: "offers", checkpoint: "loaded", url: "about:blank", viewport, ...result };
    } finally {
      await page.close();
    }
  };
  const compare = (baseline, target, rule = growthRule) => {
    const pages = structuredClone([baseline, target]);
    evaluateViewportGrowth(pages, rule);
    return pages;
  };
  const observation = (page) => page.viewportGrowth.find((item) => item.rule === growthRule.id);
  try {
    const baseline = await capture("desktop");
    const target = await capture("wide");
    const accepted = compare(baseline, target);
    assert.deepEqual(accepted.flatMap((page) => page.findings), []);
    assert.equal(observation(accepted[1]).yield, 1);
    assert.equal(observation(accepted[1]).baselineCount, 4);
    assert.equal(observation(accepted[1]).currentCount, 8);
    assert.equal(observation(accepted[1]).requiredCount, 8);
    outputs.accepted = accepted;

    for (const variant of ["stretched", "duplicates"]) {
      const rejected = compare(baseline, await capture("wide", variant));
      assert.equal(observation(rejected[1]).yield, 0);
      assert.equal(observation(rejected[1]).currentCount, 4);
      assert.deepEqual(rejected[1].findings.map((finding) => finding.rule), ["offer-growth"]);
      assert.ok(rejected[1].findings[0].designRules.includes("DR-019"));
      outputs[variant] = rejected;
    }

    const peerFailure = await capture("desktop", "bad-peers");
    assert.deepEqual(peerFailure.findings.map((finding) => finding.rule).sort(), [
      "label-value-rhythm", "peer-alignment", "peer-balance",
    ]);
    outputs.peerFailure = peerFailure;

    const finiteRules = structuredClone(rules);
    const finiteRule = finiteRules.find((rule) => rule.id === "offer-growth");
    finiteRule.growthYield.availableKeys = [..."abcd"];
    validateRules(finiteRules);
    const finite = compare(
      await capture("desktop", "finite", finiteRules),
      await capture("wide", "finite", finiteRules),
      finiteRule,
    );
    assert.deepEqual(finite.flatMap((page) => page.findings), []);
    assert.equal(observation(finite[1]).status, "saturated");
    assert.equal(observation(finite[1]).yield, 0);
    assert.equal(observation(finite[1]).requiredCount, 4);
    outputs.finite = finite;

    for (const variant of ["tiny", "empty"]) {
      const rejected = compare(baseline, await capture("wide", variant));
      assert.equal(observation(rejected[1]).status, "unassessed");
      assert.ok(rejected[1].findings.some((finding) => finding.rule === "offer-growth"));
      outputs[variant] = rejected;
    }
    const absent = structuredClone([target]);
    evaluateViewportGrowth(absent, growthRule);
    assert.equal(observation(absent[0]).status, "unassessed");
    assert.ok(absent[0].findings.length);
    outputs.missingReference = absent;

    const otherState = { ...baseline, checkpoint: "different-task-state" };
    const mismatched = compare(otherState, target);
    assert.equal(observation(mismatched[1]).status, "unassessed");
    outputs.checkpointMismatch = mismatched;
    await writeFile(path.join(directory, "report.json"), JSON.stringify(outputs, null, 2) + "\n");
    console.log("Composition checkpoint passed: alignment, rhythm, balance, growth, finite saturation, and rejected evidence.");
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await runCompositionCheckpoint(path.resolve(import.meta.dirname, "../.."));

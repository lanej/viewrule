import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { inspectPage } from "../../src/checks.mjs";
import { configurePriority } from "./priority-scene.js";

// Native Viewrule measurements, not a second detector or a generic salience score.
const targetFindings = [
  "priority-response-type",
  "priority-response-surface",
  "priority-total-type",
  "priority-total-surface",
].sort();
const scopeRules = (rules, quality) =>
  rules.map((rule) => ({
    ...rule,
    selector: rule.selector
      .split(",")
      .map((s) => `#${quality} ${s.trim()}`)
      .join(", "),
  }));

export async function runPriorityCheckpoint(root) {
  const files = [
    "docs/examples/behavior.html",
    "docs/examples/gallery.css",
    "docs/examples/behavior.css",
    "docs/examples/priority-scene.js",
    "docs/examples/priority-rules.json",
    "docs/examples/priority-before.json",
    "src/checks.mjs",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(path.join(root, file), "utf8")),
  );
  const rules = JSON.parse(sources[4]);
  const before = JSON.parse(sources[5]);
  const directory = path.join(root, "dist/behavior-evidence");
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.VIEWRULE_BROWSER_PATH || undefined,
  });
  const checks = [],
    captures = [];
  const inspect = async (page) =>
    Object.fromEntries(
      await Promise.all(
        ["good", "bad"].map(async (quality) => [
          quality,
          await page.evaluate(inspectPage, scopeRules(rules, quality)),
        ]),
      ),
    );
  const ids = (result) => result.findings.map((finding) => finding.rule).sort();
  const mount = async (page, enlarged, legacy = false) => {
    const html = legacy
      ? sources[0].replace(
          /<template id="scene-DR-013">[\s\S]*?<\/template>/,
          before.template.trim(),
        )
      : sources[0];
    const css = legacy
      ? sources[2].split("/* DR-013:")[0] + before.styles
      : sources[2];
    await page.setContent(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<link\b[^>]*>/gi, ""),
    );
    await page.addStyleTag({ content: sources[1] });
    await page.addStyleTag({ content: css });
    await page.evaluate(
      ({ initialize, enlarged }) => {
        const d = globalThis.document;
        d.querySelector("#behavior-examples").setAttribute(
          "data-rule",
          "DR-013",
        );
        d.body.dataset.behaviorRule = "DR-013";
        for (const selector of [
          ".gallery-heading",
          ".example-controls",
          ".review-notes",
        ])
          d.querySelector(selector).remove();
        const configure = (0, eval)(`(${initialize})`);
        for (const quality of ["good", "bad"]) {
          const sample = /** @type {HTMLElement} */ (
            d.querySelector(`#${quality} .sample`)
          );
          const template = /** @type {HTMLTemplateElement} */ (
            d.querySelector("#scene-DR-013")
          );
          sample.replaceChildren(template.content.cloneNode(true));
          sample.dataset.enlarged = String(enlarged);
          configure(sample, quality === "good");
          if (enlarged)
            sample.querySelector('[data-role="reason"]').textContent =
              "Address problems are blocking delivery for these shipments. Inspect the affected shipment IDs and arrange address corrections before the next dispatch.";
        }
      },
      {
        initialize: legacy ? before.initializer : configurePriority.toString(),
        enlarged,
      },
    );
    await page.evaluate(() => globalThis.document.fonts.ready);
  };
  try {
    /** @type {Array<[string, {width: number, height: number}, boolean]>} */
    const scenarios = [
      ["desktop", { width: 1200, height: 1000 }, false],
      ["mobile", { width: 390, height: 844 }, true],
    ];
    for (const [name, viewport, enlarged] of scenarios) {
      const context = await browser.newContext({
        viewport,
        colorScheme: "light",
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        // Replay the actual prior component, including its previously accepted Good.
        await mount(page, enlarged, true);
        const red = await inspect(page);
        for (const quality of ["good", "bad"])
          assert.deepEqual(
            ids(red[quality]),
            targetFindings,
            `${name}: prior ${quality} must go red for emphasis, not missing markup`,
          );
        await mount(page, enlarged);
        const green = await inspect(page);
        assert.deepEqual(
          green.good.findings,
          [],
          `${name}: repaired Good passes native Viewrule`,
        );
        assert.deepEqual(
          ids(green.bad),
          targetFindings,
          `${name}: only the intended emphasis constraints fail on Bad`,
        );
        for (const finding of green.bad.findings)
          assert.deepEqual(
            rules.find((rule) => rule.id === finding.rule).designRules,
            ["DR-013"],
          );
        for (const quality of ["good", "bad"])
          assert.ok(
            green[quality].metrics.evaluations.every(
              (entry) => entry.status === "checked",
            ),
            `${name}: no missing, skipped, or unassessed rule may pass`,
          );

        const observations = await page
          .locator(".sample")
          .evaluateAll((samples) =>
            samples.map((sample) => {
              const win = sample.ownerDocument.defaultView;
              const rect = (el) => {
                const r = el.getBoundingClientRect();
                return {
                  x: r.x,
                  y: r.y,
                  width: r.width,
                  height: r.height,
                  bottom: r.bottom,
                };
              };
              const style = (el) => {
                const s = win.getComputedStyle(el);
                return [
                  s.fontSize,
                  s.fontWeight,
                  s.color,
                  s.backgroundColor,
                  s.padding,
                  s.borderRadius,
                ];
              };
              const sections = Object.fromEntries(
                [...sample.querySelectorAll("[data-priority]")].map((el) => [
                  el.getAttribute("data-priority"),
                  {
                    text: el.textContent.replace(/\s+/g, " ").trim(),
                    primary: el.classList.contains("priority-primary"),
                    box: rect(el),
                    style: style(el),
                    title: style(el.querySelector("h5")),
                  },
                ]),
              );
              // The renderer uses opaque solid backgrounds. Compute actual text contrast
              // only for that supported case; alpha or unknown paint must not pass.
              const luminance = (rgb) =>
                rgb
                  .map((v) => {
                    v /= 255;
                    return v <= 0.04045
                      ? v / 12.92
                      : ((v + 0.055) / 1.055) ** 2.4;
                  })
                  .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
              const rgb = (value) => {
                const m = value.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
                return m ? m.slice(1).map(Number) : null;
              };
              const contrast = [...sample.querySelectorAll("h4, h5, p, button")]
                .filter((el) => el.checkVisibility())
                .map((el) => {
                  const s = win.getComputedStyle(el);
                  let surface = el;
                  while (
                    surface &&
                    win.getComputedStyle(surface).backgroundColor ===
                      "rgba(0, 0, 0, 0)"
                  )
                    surface = surface.parentElement;
                  const fg = rgb(s.color),
                    bg =
                      surface &&
                      rgb(win.getComputedStyle(surface).backgroundColor);
                  let unsupported = !fg || !bg;
                  for (
                    let ancestor = el;
                    ancestor;
                    ancestor = ancestor.parentElement
                  ) {
                    const paint = win.getComputedStyle(ancestor);
                    if (
                      Number(paint.opacity) !== 1 ||
                      paint.filter !== "none" ||
                      paint.backdropFilter !== "none" ||
                      paint.mixBlendMode !== "normal" ||
                      paint.backgroundImage !== "none"
                    )
                      unsupported = true;
                  }
                  if (unsupported) return { text: el.textContent, ratio: null };
                  const a = luminance(fg),
                    b = luminance(bg);
                  return {
                    text: el.textContent.trim(),
                    ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                  };
                });
              return {
                sections,
                contrast,
                box: rect(sample),
                button: style(sample.querySelector("button")),
                order: [...sample.querySelectorAll("[data-priority]")].map(
                  (el) => el.getAttribute("data-priority"),
                ),
              };
            }),
          );
        for (const quality of ["good", "bad"]) {
          assert.equal(
            await page.locator(`#${quality} .priority-heading p`).textContent(),
            "Today · All carriers and origins · 09:00 PT snapshot",
          );
        }
        const [good, bad] = observations;
        assert.deepEqual(good.order, ["exceptions", "volume"]);
        assert.deepEqual(
          bad.order,
          good.order,
          "DOM and reading order are invariant; emphasis is the only variable",
        );
        for (const key of ["exceptions", "volume"])
          assert.equal(good.sections[key].text, bad.sections[key].text);
        assert.deepEqual(
          good.sections.exceptions.style,
          bad.sections.volume.style,
          "same primary style, different subject",
        );
        assert.deepEqual(
          good.sections.volume.style,
          bad.sections.exceptions.style,
          "same supporting style, different subject",
        );
        assert.deepEqual(
          good.sections.exceptions.title,
          bad.sections.volume.title,
        );
        assert.deepEqual(
          good.sections.volume.title,
          bad.sections.exceptions.title,
        );
        assert.deepEqual(
          good.button,
          bad.button,
          "the action is not part of the emphasis mutation",
        );
        for (const observation of observations) {
          assert.ok(
            observation.contrast.every(
              (item) => item.ratio !== null && item.ratio >= 4.5,
            ),
            `${name}: text contrast ${JSON.stringify(observation.contrast)}`,
          );
          if (!enlarged)
            assert.ok(
              observation.box.y >= 0 &&
                observation.box.bottom <= viewport.height,
            );
        }
        // A primary CSS class is not proof: stripping the actual visual treatment
        // must fail even while the metadata still claims primary status.
        await page.locator("#good .exceptions").evaluate((el) => {
          el.style.backgroundColor = "rgb(255, 255, 255)";
          el.querySelector("h5").style.fontSize = "16px";
        });
        const stripped = await inspect(page);
        assert.deepEqual(ids(stripped.good), [
          "priority-response-surface",
          "priority-response-type",
        ]);
        await page.locator("#good .exceptions").evaluate((el) => {
          el.removeAttribute("style");
          el.querySelector("h5").removeAttribute("style");
        });

        for (const quality of ["good", "bad"]) {
          const button = page.locator(`#${quality} [data-role="respond"]`);
          const result = page.locator(`#${quality} [data-role="result"]`);
          await page.keyboard.press("Tab");
          assert.equal(
            await button.evaluate(
              (el) => el === el.ownerDocument.activeElement,
            ),
            true,
          );
          assert.equal(
            await button.evaluate(
              (el) =>
                el.ownerDocument.defaultView.getComputedStyle(el)
                  .outlineStyle !== "none",
            ),
            true,
          );
          await page.keyboard.press("Enter");
          assert.equal(await result.isVisible(), true);
          assert.equal(await button.getAttribute("aria-expanded"), "true");
          assert.equal(
            await result.textContent(),
            "EP 1042, EP 1047, and EP 1051 are awaiting address corrections.",
          );
          assert.equal(
            await button.getAttribute("aria-controls"),
            await result.getAttribute("id"),
          );
          await page.keyboard.press("Escape");
          assert.equal(await result.isVisible(), false);
          assert.equal(await button.getAttribute("aria-expanded"), "false");
          assert.equal(
            await button.evaluate(
              (el) => el === el.ownerDocument.activeElement,
            ),
            true,
          );
          assert.equal(
            await page.locator(`#${quality} .volume strong`).textContent(),
            "1,200",
          );
          assert.equal(
            await page.locator(`#${quality} .exceptions h5`).textContent(),
            "3 shipments need a response",
          );
        }
        await page.locator("#bad [data-role=respond]").blur();
        const final = await inspect(page);
        assert.deepEqual(final.good.findings, []);
        assert.deepEqual(ids(final.bad), targetFindings);
        for (const quality of ["good", "bad"]) {
          const file = `dr-013-${quality}-${name}.png`;
          await page
            .locator(`#${quality} .sample`)
            .screenshot({
              path: path.join(directory, file),
              animations: "disabled",
              caret: "hide",
            });
          captures.push({
            file,
            quality,
            viewport,
            fontScale: enlarged ? 1.25 : 1,
            longCopy: enlarged,
          });
        }
        assert.deepEqual(errors, []);
        checks.push({
          viewport: name,
          red,
          green,
          stripped,
          observations,
          passed: [
            "context",
            "shared-content",
            "shared-role-styles",
            "same-order",
            "native-emphasis",
            "paint-not-metadata",
            "text-contrast",
            "no-clipping",
            "keyboard-disclosure",
            "continuity",
          ],
        });
      } finally {
        await context.close();
      }
    }
    const matrix = JSON.parse(
      await readFile(
        path.join(root, "docs/examples/conformance-matrix.json"),
        "utf8",
      ),
    );
    const entry = matrix.examples.find((example) => example.id === "DR-013");
    assert.ok(entry, "DR-013 conformance entry is required");
    for (const [id, assessment] of Object.entries(entry.rules)) {
      if (["automated", "behavioral"].includes(assessment.evidenceType)) {
        assert.ok(
          assessment.checks?.length,
          `${id} must name executed evidence`,
        );
        for (const name of assessment.checks)
          assert.ok(
            checks.every((scenario) => scenario.passed.includes(name)),
            `${id}/${name} must execute in both layouts`,
          );
      }
    }
    const report = {
      schemaVersion: 1,
      target: "DR-013",
      browser: browser.version(),
      rendering:
        "Actual component and native inspectPage; legacy fixture replayed before the repaired component in both layouts.",
      sources: Object.fromEntries(
        files.map((file, i) => [
          file,
          createHash("sha256").update(sources[i]).digest("hex"),
        ]),
      ),
      previousRevision: before.sourceCommit,
      checks,
      captures,
      limits:
        "The explicit type/color tokens are scoped to this dispatch task and theme. Their measured use is not a general salience score or human approval. 125% component text is not browser zoom.",
    };
    await writeFile(
      path.join(directory, "dr-013-evidence.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      "DR-013: old Good/Bad red (4 each); repaired Good green (0); Bad red (4, DR-013 only), both layouts. Contrast and keyboard checks passed.",
    );
  } finally {
    await browser.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await runPriorityCheckpoint(path.resolve(import.meta.dirname, "../.."));

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { configurePriority } from "./priority-scene.js";

// Component evidence complements the existing installed-package page walkthrough.
// It does not turn a position test into a universal judgment of visual priority.
export async function runPriorityCheckpoint(root) {
  const files = [
    "docs/examples/behavior.html",
    "docs/examples/gallery.css",
    "docs/examples/behavior.css",
    "docs/examples/priority-scene.js",
  ];
  const sources = await Promise.all(files.map((file) => readFile(path.join(root, file), "utf8")));
  const directory = path.join(root, "dist/behavior-evidence");
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.VIEWRULE_BROWSER_PATH || undefined,
  });
  const captures = [];
  const checks = [];
  try {
    /** @type {Array<[string, {width: number, height: number}, boolean]>} */
    const scenarios = [
      ["desktop", { width: 1200, height: 1000 }, false],
      ["mobile", { width: 390, height: 844 }, true],
    ];
    for (const [name, viewport, enlarged] of scenarios) {
      const context = await browser.newContext({
        viewport, colorScheme: "light", deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        // Mount the actual shared template, styles, and initializer without network.
        await page.setContent(sources[0].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*>/gi, ""));
        await page.addStyleTag({ content: sources[1] });
        await page.addStyleTag({ content: sources[2] });
        await page.evaluate(({ initialize, enlarged }) => {
          const document = globalThis.document;
          const root = document.querySelector("#behavior-examples");
          root.setAttribute("data-rule", "DR-013");
          document.body.dataset.behaviorRule = "DR-013";
          // The surrounding documentation is not part of component-level evidence.
          document.querySelector(".gallery-heading").remove();
          document.querySelector(".example-controls").remove();
          document.querySelector(".review-notes").remove();
          const configure = (0, eval)(`(${initialize})`);
          for (const quality of ["good", "bad"]) {
            const sample = /** @type {HTMLElement} */ (document.querySelector(`#${quality} .sample`));
            const template = /** @type {HTMLTemplateElement} */ (document.querySelector("#scene-DR-013"));
            sample.replaceChildren(template.content.cloneNode(true));
            sample.dataset.enlarged = String(enlarged);
            configure(sample, quality === "good");
            if (enlarged) sample.querySelector('[data-role="reason"]').textContent =
              "Address problems are blocking delivery for these shipments. Inspect the affected shipment IDs and arrange address corrections before the next dispatch.";
          }
        }, { initialize: configurePriority.toString(), enlarged });
        await page.evaluate(() => globalThis.document.fonts.ready);
        const observations = await page.locator(".sample").evaluateAll((samples) => samples.map((sample) => {
          const box = (element) => {
            const r = element.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          const sections = {};
          for (const section of sample.querySelectorAll("[data-priority]")) {
            sections[section.getAttribute("data-priority")] = {
              text: section.textContent.replace(/\s+/g, " ").trim(),
              box: box(section),
              styles: [section, ...section.querySelectorAll("*")].map((element) => {
                const s = element.ownerDocument.defaultView.getComputedStyle(element);
                return [element.tagName, s.fontSize, s.fontWeight, s.color, s.backgroundColor, s.padding, s.border, s.lineHeight];
              }),
            };
          }
          return {
            box: box(sample), sections,
            order: [...sample.querySelectorAll("[data-priority]")].map((section) => section.getAttribute("data-priority")),
            clipped: [...sample.querySelectorAll("h4, h5, p, button, strong")].filter((el) => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1).length,
          };
        }));
        assert.equal(observations.length, 2);
        const [good, bad] = observations;
        for (const quality of ["good", "bad"]) {
          assert.equal(await page.locator(`#${quality} .priority-heading p`).textContent(), "Today · All carriers and origins · 09:00 PT snapshot");
          assert.equal(await page.locator(`#${quality} .volume strong`).textContent(), "1,200");
          assert.equal(await page.locator(`#${quality} .exceptions h5`).textContent(), "3 shipments need a response");
        }
        for (const key of ["exceptions", "volume"]) {
          assert.equal(good.sections[key].text, bad.sections[key].text, `${name}: same ${key} content`);
          assert.deepEqual(good.sections[key].styles, bad.sections[key].styles, `${name}: same ${key} styles`);
          for (const dimension of ["width", "height"])
            assert.ok(Math.abs(good.sections[key].box[dimension] - bad.sections[key].box[dimension]) <= 1, `${name}: same ${key} ${dimension}`);
        }
        assert.deepEqual(good.order, ["exceptions", "volume"]);
        assert.deepEqual(bad.order, ["volume", "exceptions"]);
        assert.ok(good.sections.exceptions.box.bottom <= good.sections.volume.box.top);
        assert.ok(bad.sections.volume.box.bottom <= bad.sections.exceptions.box.top);
        assert.equal(good.clipped + bad.clipped, 0, `${name}: no clipped critical content`);
        assert.equal(await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth), true, `${name}: no horizontal page overflow`);
        if (!enlarged) {
          assert.ok(good.box.top >= 0 && good.box.bottom <= viewport.height);
          assert.ok(bad.box.top >= 0 && bad.box.bottom <= viewport.height);
        }
        // One Tab stop per component; actual keyboard actions, not ARIA declarations.
        for (const quality of ["good", "bad"]) {
          await page.keyboard.press("Tab");
          const button = page.locator(`#${quality} [data-role="respond"]`);
          const result = page.locator(`#${quality} [data-role="result"]`);
          assert.equal(await button.evaluate((el) => el === el.ownerDocument.activeElement), true);
          assert.equal(await button.evaluate((el) => el.ownerDocument.defaultView.getComputedStyle(el).outlineStyle !== "none"), true);
          await page.keyboard.press("Enter");
          assert.equal(await result.isVisible(), true);
          assert.equal(await button.getAttribute("aria-expanded"), "true");
          assert.equal(await result.textContent(), "EP 1042, EP 1047, and EP 1051 are awaiting address corrections.");
          assert.equal(await button.getAttribute("aria-controls"), await result.getAttribute("id"));
          await page.keyboard.press("Escape");
          assert.equal(await result.isVisible(), false);
          assert.equal(await button.getAttribute("aria-expanded"), "false");
          assert.equal(await page.locator(`#${quality} .volume strong`).textContent(), "1,200");
          assert.equal(await page.locator(`#${quality} .exceptions h5`).textContent(), "3 shipments need a response");
          assert.equal(await button.evaluate((el) => el === el.ownerDocument.activeElement), true);
        }
        for (const quality of ["good", "bad"]) {
          // Match capture focus state rather than assigning a focus cue to only Bad.
          await page.locator(`#${quality} [data-role="respond"]`).blur();
        }
        for (const quality of ["good", "bad"]) {
          const file = `dr-013-${quality}-${name}.png`;
          await page.locator(`#${quality} .sample`).screenshot({
            path: path.join(directory, file), animations: "disabled", caret: "hide",
          });
          captures.push({ file, quality, viewport, fontScale: enlarged ? 1.25 : 1, longCopy: enlarged });
        }
        assert.deepEqual(errors, []);
        checks.push({
          viewport: name, observations,
          passed: ["context", "shared-content", "shared-styles", "shared-geometry", "order-only", "no-clipping", "keyboard-disclosure", "continuity"],
        });
      } finally {
        await context.close();
      }
    }
    const matrix = JSON.parse(await readFile(path.join(root, "docs/examples/conformance-matrix.json"), "utf8"));
    const entry = matrix.examples.find((example) => example.id === "DR-013");
    assert.ok(entry, "DR-013 conformance entry is required");
    for (const [id, assessment] of Object.entries(entry.rules)) {
      if (["automated", "behavioral"].includes(assessment.evidenceType)) {
        assert.ok(assessment.checks?.length, `${id} must name executed checkpoint evidence`);
        for (const name of assessment.checks)
          assert.ok(checks.every((scenario) => scenario.passed.includes(name)), `${id}/${name} must execute successfully in both layouts`);
      }
    }
    const report = {
      schemaVersion: 1, target: "DR-013", browser: browser.version(),
      rendering: "Actual component template, shared CSS and initializer mounted offline. Integration is covered by the existing installed-package walkthrough.",
      sources: Object.fromEntries(files.map((file, i) => [file, createHash("sha256").update(sources[i]).digest("hex")])),
      checks, captures,
      limits: "125% component text is not browser zoom or a complete accessibility audit. Authored order is mechanically checked; human review must judge priority and all other declared subjective requirements.",
    };
    await writeFile(path.join(directory, "dr-013-evidence.json"), JSON.stringify(report, null, 2) + "\n");
    console.log("DR-013 checkpoint passed: equal content/style/geometry, order-only mutation, keyboard disclosure, and four captures.");
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await runPriorityCheckpoint(path.resolve(import.meta.dirname, "../.."));

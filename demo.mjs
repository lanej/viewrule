import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyticalHtml } from "./test/analytical-fixtures.mjs";
import { presetRules } from "./src/presets.mjs";
import { runReview } from "./src/review.mjs";

// Reviewable examples of the shipped opinion, using the same fixtures as npm test.
const project = await mkdtemp(path.join(tmpdir(), "viewrule-preset-demo-"));
await mkdir(path.join(project, ".ui-review"));
await mkdir(path.join(project, "src"));
let state = "broken";
const server = createServer((_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(analyticalHtml(state));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const viewports = [{ name: "desktop", width: 1280, height: 800 }, { name: "4k", width: 3840, height: 2160 }];
const rules = (await presetRules("analytical")).map((rule) => ({
  ...rule,
  ...(rule.viewports ? { viewports: viewports.map((v) => v.name) } : {}),
  ...(rule.minVisibleByViewport ? { minVisibleByViewport: { desktop: 8, "4k": 12 } } : {}),
}));
await writeFile(path.join(project, ".ui-review/config.json"), JSON.stringify({
  version: 1, baseURL: `http://127.0.0.1:${server.address().port}`, enforceOnStop: false,
  accessibility: true, sourcePaths: ["src"], pages: [{ name: "comparison", path: "/", ready: "table" }], viewports,
}));
const cases = [
  ["broken", "fail", "Oversized header, unreadable/clipped text, missing context, overlapping metrics, and a lost alternative."],
  ["compact", "pass", "A bounded comparison preserves readable values and reveals more alternatives at 4K."],
  ["stretched", "fail", "The same comparison gains empty width; the text-distance rule detects the separation at 4K."],
  ["finite", "pass", "Four relevant alternatives, explicitly scoped to four. Surrounding whitespace is allowed."],
];
const results = [];
try {
  for (const [name, expected, description] of cases) {
    state = name;
    await writeFile(path.join(project, "src/page.html"), analyticalHtml(state));
    await writeFile(path.join(project, ".ui-review/rules.json"), JSON.stringify(rules.map((rule) =>
      state === "finite" && rule.type === "comparison-set" ? {
        ...rule, minVisibleByViewport: { desktop: 4, "4k": 4 }, reason: "This task has four relevant alternatives.",
      } : rule)));
    const result = await runReview(project, path.join(project, "global"));
    if (result.report.status !== expected || (expected === "pass" && result.report.summary.warnings))
      throw new Error(`${name}: expected clean ${expected}, got ${result.report.status}. Inspect ${result.reportFile}`);
    results.push({ name, description, ...result });
  }
  const relative = (file) => path.relative(project, path.dirname(file));
  const gallery = results.map(({ name, description, report, reportFile }) => {
    const dir = relative(reportFile);
    const shots = report.pages.map((p) => `<figure><figcaption>${p.viewport.name} · ${p.viewport.width} × ${p.viewport.height}</figcaption>
      <a href="${dir}/${p.screenshot}"><img alt="${name} comparison at ${p.viewport.name}" src="${dir}/${p.screenshot}"></a></figure>`).join("");
    return `<section><h2>${name} · ${report.status}</h2><p>${description}</p><p>${report.summary.errors} errors · ${report.summary.warnings} warnings · <a href="${dir}/index.html">Inspect findings and native-scale tiles</a></p><div class="shots">${shots}</div></section>`;
  }).join("");
  await writeFile(path.join(project, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Viewrule preset examples</title>
<style>body{font:16px/1.5 system-ui;color:#172d27;margin:24px}main{max-width:1440px;margin:auto}section{border-top:1px solid #ccd6d0;padding:16px 0}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:24px}img{width:100%;border:1px solid #ccd6d0}figure{margin:0}a{color:#165b41}</style>
<main><h1>Viewrule's default opinion</h1><p>Illustrative carrier data and specified fixture expectations, not human-approved designs. Preview the composition here; open reports for original-size detail.</p>${gallery}</main></html>`);
  console.log(JSON.stringify({ demo: path.join(project, "index.html"), cases: results.map((r) => ({ name: r.name, status: r.report.status, report: r.reportFile })) }));
} finally {
  await new Promise((resolve) => server.close(resolve));
}

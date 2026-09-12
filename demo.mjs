import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Mustache from "mustache";
import {
  analyticalHtml,
  analyticalScript,
} from "./test/analytical-fixtures.mjs";
import { presetRules } from "./src/presets.mjs";
import { runReview } from "./src/review.mjs";

// Reviewable examples of the shipped opinion, using the same fixtures as npm test.
const project = await mkdtemp(path.join(tmpdir(), "viewrule-preset-demo-"));
await mkdir(path.join(project, ".ui-review"));
await mkdir(path.join(project, "src"));
let state = "broken";
const server = createServer((req, res) => {
  if (req.url === "/analytical.js") {
    res.setHeader("Content-Type", "text/javascript");
    return res.end(analyticalScript);
  }
  res.setHeader("Content-Type", "text/html");
  res.end(analyticalHtml(state));
});
await new Promise((resolve) =>
  server.listen(0, "127.0.0.1", () => resolve(undefined)),
);
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Expected a TCP fixture server");
const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "4k", width: 3840, height: 2160 },
];
const rules = (await presetRules("analytical")).map((rule) => ({
  ...rule,
  ...(rule.viewports ? { viewports: viewports.map((v) => v.name) } : {}),
  ...(rule.minVisibleByViewport
    ? { minVisibleByViewport: { desktop: 8, "4k": 12 } }
    : {}),
}));
await writeFile(
  path.join(project, ".ui-review/config.json"),
  JSON.stringify({
    version: 1,
    baseURL: `http://127.0.0.1:${address.port}`,
    enforceOnStop: false,
    accessibility: true,
    sourcePaths: ["src"],
    pages: [{ name: "comparison", path: "/", ready: "table" }],
    viewports,
  }),
);
const cases = [
  [
    "broken",
    "fail",
    "Oversized header, unreadable/clipped text, missing context, overlapping metrics, and a lost alternative.",
  ],
  [
    "compact",
    "pass",
    "A bounded comparison preserves readable values and reveals more alternatives at 4K.",
  ],
  [
    "stretched",
    "fail",
    "The same comparison gains empty width; the text-distance rule detects the separation at 4K.",
  ],
  [
    "finite",
    "pass",
    "Four relevant alternatives, explicitly scoped to four. Surrounding whitespace is allowed.",
  ],
];
const results = [];
try {
  for (const [name, expected, description] of cases) {
    state = name;
    await writeFile(path.join(project, "src/page.html"), analyticalHtml(state));
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(
        rules.map((rule) =>
          state === "finite" && rule.type === "comparison-set"
            ? {
                ...rule,
                minVisibleByViewport: { desktop: 4, "4k": 4 },
                reason: "This task has four relevant alternatives.",
              }
            : rule,
        ),
      ),
    );
    const result = await runReview(project, path.join(project, "global"));
    if (
      result.report.status !== expected ||
      (expected === "pass" && result.report.summary.warnings)
    )
      throw new Error(
        `${name}: expected clean ${expected}, got ${result.report.status}. Inspect ${result.reportFile}`,
      );
    results.push({ name, description, ...result });
  }
  const template = await readFile(
    new URL("./test/templates/gallery.html", import.meta.url),
    "utf8",
  );
  const gallery = Mustache.render(template, {
    cases: results.map((result) => ({
      ...result,
      directory: path
        .relative(project, path.dirname(result.reportFile))
        .split(path.sep)
        .join("/"),
    })),
  });
  await writeFile(path.join(project, "index.html"), gallery);
  console.log(
    JSON.stringify({
      demo: path.join(project, "index.html"),
      cases: results.map((r) => ({
        name: r.name,
        status: r.report.status,
        report: r.reportFile,
      })),
    }),
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}

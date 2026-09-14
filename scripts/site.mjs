import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import { readDesignPolicy } from "../src/design.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const output = path.join(repository, "dist/site");
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "app"), { recursive: true });

// Explicit public assets: review configuration and local evidence are not deployed.
for (const file of ["index.html", "app.css", "app.js", "data.js"])
  await cp(
    path.join(repository, "docs/app", file),
    path.join(output, "app", file),
  );
await cp(
  path.join(repository, "docs/index.html"),
  path.join(output, "index.html"),
);
await cp(
  path.join(repository, "docs/examples"),
  path.join(output, "examples"),
  { recursive: true },
);

const gallery = path.join(output, "examples/index.html");
await writeFile(
  gallery,
  (await readFile(gallery, "utf8")).replaceAll(
    "../design-examples.md",
    "https://github.com/lanej/viewrule/blob/main/docs/design-examples.md",
  ),
);
const behavior = path.join(output, "examples/behavior.html");
await writeFile(
  behavior,
  (await readFile(behavior, "utf8")).replaceAll(
    "../design-rules.md",
    "https://github.com/lanej/viewrule/blob/main/docs/design-rules.md",
  ),
);

/** @param {string} value */
const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** @param {string} value */
const markdownInline = (value) =>
  escapeHtml(value)
    .replaceAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replaceAll(/`([^`]+)`/g, "<code>$1</code>")
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/** @param {string} body */
const sectionsFrom = (body) => {
  /** @type {{ label: string; text: string }[]} */
  const sections = [];
  /** @type {{ label: string; text: string } | null} */
  let current = null;
  for (const paragraph of body.split(/\n\n+/)) {
    const match = paragraph.match(
      /^\*\*(Requirement|Default|Why|Application|Exception|Review):\*\*\s*([\s\S]*)$/,
    );
    if (match) {
      current = { label: match[1], text: match[2].replaceAll("\n", " ") };
      sections.push(current);
    } else if (current) {
      current.text += ` ${paragraph.replaceAll("\n", " ")}`;
    }
  }
  return sections;
};

/** @type {Record<string, { good: string; bad: string }>} */
const ruleExamples = {
  "DR-001": {
    good: "Two carrier charts use the same 0–400 parcel scale, so 240 and 360 remain visibly different.",
    bad: "Each chart rescales independently, making 240 and 360 appear almost identical.",
  },
  "DR-002": {
    good: "A bar representing 60 starts at zero and is twice the length of a bar representing 30.",
    bad: "A truncated bar axis begins at 25, exaggerating the visual difference between 30 and 60.",
  },
  "DR-003": {
    good: "7.2% is labeled as late-delivery rate, last 30 days, Ground parcels, with the denominator and source available.",
    bad: "A large 7.2% KPI appears without measure, period, population, or denominator.",
  },
  "DR-004": {
    good: "Unavailable, estimated, and observed-zero values use distinct labels and marks.",
    bad: "Missing values are rendered as zero and forecasts look identical to observations.",
  },
  "DR-005": {
    good: "Aster remains green and Beacon remains blue across the table, chart, filters, and viewport changes.",
    bad: "Carrier colors are reassigned after sorting, forcing the reader to relearn the visual mapping.",
  },
  "DR-006": {
    good: "Cost, delivery window, and reliability for the compared carriers remain visible together.",
    bad: "The reader must switch tabs or scroll away from one carrier to compare another.",
  },
  "DR-007": {
    good: "A larger viewport reveals useful service and volume detail while keeping text readable.",
    bad: "The same sparse cards merely stretch wider, or additional density is achieved by shrinking type.",
  },
  "DR-008": {
    good: "Frames, headers, and separators support grouping without competing with the evidence.",
    bad: "Nested cards, oversized headers, and ornamental chrome consume attention and space.",
  },
};

// Reuse the gallery fixtures as inline DOM, with assets independent of gallery URLs.
const assets = path.join(output, "assets/examples");
await mkdir(assets, { recursive: true });
for (const file of [
  "behavior.js",
  "behavior.css",
  "behavior-catalog.json",
  "evidence.js",
  "evidence.css",
])
  await cp(
    path.join(repository, "docs/examples", file),
    path.join(assets, file),
  );
const behaviorSource = await readFile(
  path.join(repository, "docs/examples/behavior.html"),
  "utf8",
);
const evidenceSource = await readFile(
  path.join(repository, "docs/examples/evidence.html"),
  "utf8",
);
const behaviorBody = behaviorSource.match(
  /<main id="behavior-examples">([\s\S]*?)<\/main>/,
)[1];
const behaviorTemplates = behaviorSource.match(
  /<template id="scene-DR-009">[\s\S]*?(?=\s*<\/body>)/,
)[0];
const policy = await readDesignPolicy();
const rulesRoot = path.join(output, "rules");
await mkdir(rulesRoot, { recursive: true });
const ruleCards = [];
for (const rule of policy.rules) {
  const slug = rule.id.toLowerCase();
  const directory = path.join(rulesRoot, slug);
  await mkdir(directory, { recursive: true });
  const example = ruleExamples[rule.id];
  const principle = rule.body.match(/^\*\*Principle:\*\* (.+)$/m)?.[1] || "";
  const sections = sectionsFrom(
    rule.body.replace(/\[Good\/bad example\]\([^)]*\)\.?/g, ""),
  );
  ruleCards.push(
    `<a class="rule-card" href="${slug}/"><span>${rule.id}</span><strong>${escapeHtml(rule.title)}</strong><small>${rule.enforcement}</small></a>`,
  );
  const sectionHtml = sections
    .map(
      ({ label, text }) =>
        `<section><h2>${label}</h2><p>${markdownInline(text)}</p></section>`,
    )
    .join("\n");
  const behavioral = Number(rule.id.slice(3)) >= 9;
  const interactive = behavioral
    ? `<div id="behavior-examples" data-fixed-rule="${rule.id}">${behaviorBody
        .replace(
          /<label\s*>Design rule[\s\S]*?<\/label>/,
          '<select id="rule-picker" hidden aria-label="Design rule"></select>',
        )
        .replace(
          /<p>\s*<a id="policy-link"[\s\S]*?<\/p>/,
          "",
        )}</div>${behaviorTemplates}
        <p id="load-error" role="alert" hidden>Examples could not load. Reload to try again.</p>`
    : `<div id="evidence-examples" data-rule="${rule.id}">
       <button type="button" id="evidence-toggle" aria-pressed="false">${["Change parcel volumes", "Change amounts", "Change period", "Change observation", "Reverse carrier order", "Switch selected carrier", "Show larger layout", "Expand shipment detail"][Number(rule.id.slice(3)) - 1]}</button>
       <div class="behavior-pair">${["good", "bad"].map((quality) => `<section id="${quality}"><h3>${quality === "good" ? "Good" : "Bad"} for this task</h3><p>${escapeHtml(example[quality])}</p><div class="sample">${evidenceSource.match(new RegExp('<template id="scene-' + rule.id + '">([\\s\\S]*?)</template>'))[1]}</div></section>`).join("")}</div>
       <p>These synthetic fixtures illustrate the stated comparison. Native checks can support review of declared scales, context, encodings, geometry, and legibility; they do not establish data truth or task relevance. Review the requirement and exceptions above.</p></div>`;
  const sequence = Number(rule.id.slice(3));
  const prior =
    sequence > 1 ? `../dr-${String(sequence - 1).padStart(3, "0")}/` : null;
  const next =
    sequence < policy.rules.length
      ? `../dr-${String(sequence + 1).padStart(3, "0")}/`
      : null;
  await writeFile(
    path.join(directory, "index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="${escapeHtml(rule.id)} — ${escapeHtml(rule.title)}. Viewrule design requirement, enforcement mode, examples, and verification guidance." />
<title>${escapeHtml(rule.id)} — ${escapeHtml(rule.title)} · Viewrule</title>
<link rel="stylesheet" href="../rule.css" />
<link rel="stylesheet" href="../../assets/examples/behavior.css" />
<link rel="stylesheet" href="../../assets/examples/evidence.css" />
<script type="module" src="../../assets/examples/${behavioral ? "behavior" : "evidence"}.js"></script>
</head>
<body>
<main>
<nav class="crumb"><a href="../">Design rules</a> / ${rule.id}</nav>
<header>
<div class="rule-meta"><span>${rule.id}</span><span class="mode mode-${rule.enforcement}">${rule.enforcement}</span></div>
<h1>${escapeHtml(rule.title)}</h1>
<p class="lede">${escapeHtml(principle)}</p>
</header>
${sectionHtml}
<section class="examples" aria-labelledby="examples-title">
<h2 id="examples-title">Examples</h2>
<p class="lede">The pair isolates this rule. A good example is not approval of the entire interface.</p>
${interactive}
</section>
<section>
<h2>Enforcement</h2>
<p><strong>${rule.enforcement}</strong> is the strongest mechanism Viewrule expects for the complete rule. Partial checks can still provide supporting evidence without proving the whole requirement.</p>
<p><a href="https://github.com/lanej/viewrule/blob/main/docs/ui-review-enforcement.md">Detection and enforcement details →</a></p>
</section>
<nav class="rule-nav">${prior ? `<a href="${prior}">← Previous</a>` : "<span></span>"}<a href="../">All rules</a>${next ? `<a href="${next}">Next →</a>` : "<span></span>"}</nav>
</main>
</body>
</html>`,
  );
}

await writeFile(
  path.join(rulesRoot, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Viewrule design rules with enforcement modes and good/bad examples." />
<title>Design rules · Viewrule</title>
<link rel="stylesheet" href="rule.css" />
</head>
<body><main>
<nav class="crumb"><a href="../">Viewrule</a> / Design rules</nav>
<header><h1>Design rules</h1><p class="lede">Each rule has one canonical page with its rationale, enforcement mode, good and bad examples, exceptions, and verification guidance.</p></header>
<div class="rule-list">${ruleCards.join("\n")}</div>
</main></body></html>`,
);
await writeFile(
  path.join(rulesRoot, "rule.css"),
  `:root{color-scheme:light dark;--paper:light-dark(#fff,#17241f);--canvas:light-dark(#f7f9f7,#111b16);--ink:light-dark(#172e28,#edf5f1);--secondary:light-dark(#4d6458,#b7cabe);--line:light-dark(#d4dfd7,#42584a);--soft:light-dark(#eef4ef,#25382c);--brand:light-dark(#24583d,#aad2b8);--bad:light-dark(#8a4b20,#e7b18c);font:15px/1.55 system-ui,sans-serif;color:var(--ink);background:var(--canvas)}*{box-sizing:border-box}body{margin:0}main{max-width:900px;margin:0 auto;padding:32px 24px 64px}a{color:var(--brand);text-underline-offset:3px}.crumb{margin-bottom:36px;color:var(--secondary)}header{margin-bottom:36px}h1{font-size:clamp(30px,5vw,48px);line-height:1.05;letter-spacing:-.03em;margin:12px 0}h2{font-size:18px;margin:32px 0 8px}p{max-width:70ch}.lede{font-size:17px;color:var(--secondary)}.rule-meta{display:flex;gap:10px;align-items:center;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.mode{border:1px solid var(--line);border-radius:999px;padding:3px 8px;background:var(--paper)}.good .bad .rule-nav{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;margin-top:48px;padding-top:20px;border-top:1px solid var(--line)}.rule-nav>:last-child{text-align:right}.rule-list{display:grid;gap:10px}.rule-card{display:grid;grid-template-columns:72px 1fr auto;gap:14px;align-items:center;padding:16px 18px;border:1px solid var(--line);border-radius:7px;background:var(--paper);text-decoration:none}.rule-card:hover{border-color:var(--brand)}.rule-card span,.rule-card small{color:var(--secondary)}code{background:var(--soft);padding:1px 4px;border-radius:3px}@media(max-width:650px){main{padding:24px 18px 48px}.example+.rule-card{grid-template-columns:64px 1fr}.rule-card small{grid-column:2}.rule-nav{font-size:13px}}`,
);

// Add the canonical rules surface to the public landing page without making the
// hand-authored source depend on build-only URLs.
const landing = path.join(output, "index.html");
await writeFile(
  landing,
  (await readFile(landing, "utf8")).replace(
    "<h1>Design guidance and executable review.</h1>",
    '<h1>Design guidance and executable review.</h1><p><a href="rules/">Browse all 16 design rules →</a></p>',
  ),
);

await writeFile(path.join(output, ".nojekyll"), "");
console.log("Built dist/site (mock application, rule pages, and examples).");

if (process.argv.includes("--serve")) {
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
  };
  createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405);
        response.end();
        return;
      }
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        output,
        "." + pathname,
        ...(pathname.endsWith("/") ? ["index.html"] : []),
      );
      if (!file.startsWith(output + path.sep)) {
        response.writeHead(404);
        response.end();
        return;
      }
      const content = await readFile(file);
      response.writeHead(200, {
        "Content-Type": `${types[path.extname(file)] || "application/octet-stream"}; charset=utf-8`,
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  }).listen(4173, "127.0.0.1", () =>
    console.log("Preview: http://127.0.0.1:4173/rules/"),
  );
}

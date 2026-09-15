import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  cp,
  mkdtemp,
  rm,
  readdir,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { evaluateRepair } from "../benchmarks/analytical/repair-evaluator.mjs";

const root = path.resolve(import.meta.dirname, "..");
const corpus = path.join(root, "benchmarks/analytical");
const source = await readFile(path.join(corpus, "page.html"), "utf8");
const cases = JSON.parse(
  await readFile(path.join(corpus, "cases.json"), "utf8"),
);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const impeccableRevision = "73a6f51a540bc3938a2c40677d074c70b81fa5a0";
const edits = {
  "hidden-alternatives": "tr[data-key]:nth-child(n + 5) { display: none }",
  "lost-context": ".period { display: none }",
  stretched: "@media (min-width:2000px) { table { width:100% } }",
  "clipped-labels": ".service-label { width:90px; overflow:hidden }",
  "spacious-dashboard":
    "@media (max-width:1999px) { .summary { height:650px } }",
  "cross-viewport":
    "@media (min-width:2000px) { tr[data-key=carrier-2] { display:none } }",
  "after-filter": "body[data-state=filtered] .period { display:none }",
};
const neutral = (item) =>
  source
    .replace(
      / {6}body\[data-case="hidden-alternatives"\][\s\S]*?(?= {4}<\/style>)/,
      edits[item.id] || "",
    )
    .replace(
      / {6}const params = new URLSearchParams\(location.search\);\n {6}document.body.dataset.case = params.get\("case"\) \|\| "reference";\n/,
      "",
    )
    .replace(
      'document.body.dataset.case === "finite-control" ? 4 : 12',
      item.id === "finite-control" ? "4" : "12",
    )
    .replace(/ {6}\/\/ The URL detector[\s\S]*?(?= {4}<\/script>)/, "");
const sharedPrompt = (
  await readFile(path.join(corpus, "agent-trial.md"), "utf8")
)
  .split("\n")
  .filter((line) => line.startsWith("> "))
  .map((line) => line.slice(2))
  .join("\n");
assert.ok(sharedPrompt.includes("1280"), "Shared prompt is required");

async function protectedFiles(directory) {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  const files = {};
  for (const entry of entries) {
    assert.ok(
      !entry.isSymbolicLink(),
      "Trial inputs must not contain symlinks",
    );
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(directory, file);
    if (
      relative === "index.html" ||
      relative.startsWith(".ui-review/runs/") ||
      relative === ".ui-review/latest.json"
    )
      continue;
    files[relative] = hash(await readFile(file));
  }
  return files;
}

async function prepare(output, impeccableSource) {
  const started = performance.now();
  assert.ok(
    !output.startsWith(root + path.sep),
    "Prepare trials outside the repository",
  );
  if (impeccableSource) {
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: impeccableSource,
      encoding: "utf8",
    }).trim();
    assert.equal(
      revision,
      impeccableRevision,
      "Use the pinned Impeccable checkout",
    );
    assert.equal(
      execFileSync("git", ["status", "--porcelain"], {
        cwd: impeccableSource,
        encoding: "utf8",
      }).trim(),
      "",
      "Impeccable checkout must be clean",
    );
  }
  await mkdir(output, { recursive: false });
  const evaluator = await readFile(path.join(corpus, "repair-evaluator.mjs"));
  await writeFile(path.join(output, "evaluator.mjs"), evaluator);
  const trials = [];
  for (const [caseIndex, item] of cases.entries()) {
    const html = neutral(item);
    assert.ok(!html.includes("data-case") && !html.includes("params.get"));
    for (const id of Object.keys(edits))
      assert.ok(
        !html.includes(id),
        "Neutral inputs must not disclose seed names",
      );
    for (let repetition = 0; repetition < 3; repetition++) {
      const arms = ["baseline", "impeccable", "viewrule"];
      for (let order = 0; order < arms.length; order++) {
        const arm = arms[(order + repetition) % arms.length];
        const id = `task-${String(trials.length + 1).padStart(3, "0")}`;
        const directory = path.join(output, id);
        await mkdir(directory);
        await writeFile(path.join(directory, "index.html"), html);
        await writeFile(
          path.join(directory, "TASK.md"),
          sharedPrompt +
            "\n\nEdit only index.html. Keep all tool and requirement files unchanged.\n",
        );
        if (arm === "impeccable" && impeccableSource)
          await cp(
            path.join(impeccableSource, ".agents/skills/impeccable"),
            path.join(directory, ".agents/skills/impeccable"),
            { recursive: true },
          );
        if (arm === "viewrule") {
          await mkdir(path.join(directory, ".ui-review"));
          const rules = JSON.parse(
            await readFile(path.join(corpus, "rules.json"), "utf8"),
          );
          const count = item.id === "finite-control" ? 4 : 12;
          rules.find((r) => r.id === "alternatives").min = Math.min(count, 8);
          const identities = rules.find((r) => r.id === "identities");
          identities.requiredKeys = Array.from(
            { length: Math.min(count, 8) },
            (_, i) => `carrier-${i + 1}`,
          );
          identities.minVisibleByViewport = {
            desktop: Math.min(count, 8),
            wide: Math.min(count, 8),
          };
          await writeFile(
            path.join(directory, ".ui-review/rules.json"),
            json(rules),
          );
          await writeFile(
            path.join(directory, ".ui-review/checkpoint.mjs"),
            'export default async ({ page, checkpoint }) => { if (checkpoint.name === "filtered") await page.locator("#apply-filter").click(); };\n',
          );
          await writeFile(
            path.join(directory, ".ui-review/config.json"),
            json({
              version: 1,
              baseURL: "http://127.0.0.1:4173",
              enforceOnStop: false,
              sourcePaths: ["index.html"],
              accessibility: false,
              pages: [
                {
                  name: "comparison",
                  path: "/",
                  ready: "#comparison tbody tr",
                  checkpoints: ["initial", "filtered"].map((name) => ({
                    name,
                    setup: ".ui-review/checkpoint.mjs",
                  })),
                },
              ],
              viewports: [
                { name: "desktop", width: 1280, height: 900 },
                { name: "wide", width: 3840, height: 2160 },
              ],
            }),
          );
          await cp(
            path.join(root, "plugins/claude-code/skills/review/SKILL.md"),
            path.join(directory, "VIEWRULE.md"),
          );
        }
        trials.push({
          id,
          case: caseIndex + 1,
          arm,
          repetition: repetition + 1,
          order: order + 1,
          sourceSHA256: hash(html),
          promptSHA256: hash(await readFile(path.join(directory, "TASK.md"))),
          protectedFiles: await protectedFiles(directory),
          count: item.id === "finite-control" ? 4 : 12,
        });
      }
    }
  }
  const metadata = {
    status: "prepared-not-run",
    preparationElapsedMs: Math.round(performance.now() - started),
    authoredContractCost: null,
    evaluatorSHA256: hash(evaluator),
    viewruleTree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    impeccable: {
      cli: "4.1.0",
      engine: "0.1.5",
      skill: "4.3.0",
      revision: impeccableRevision,
      instructionsPrepared: Boolean(impeccableSource),
    },
    runner: {
      provider: null,
      model: null,
      reasoning: null,
      runnerVersion: null,
      maxTokens: null,
      wallTimeSeconds: null,
      browserVersion: null,
    },
    trials,
  };
  await writeFile(path.join(output, "manifest.json"), json(metadata));
  await writeFile(
    path.join(output, "result-template.json"),
    json({
      trialId: null,
      status: "not-run",
      inputSHA256: null,
      outputSHA256: null,
      transcript: null,
      patch: null,
      explanation: null,
      elapsedMs: null,
      inputTokens: null,
      outputTokens: null,
      providerCost: null,
      setupElapsedMs: null,
      requirementsUnchanged: null,
      evaluation: null,
      semanticReview: null,
    }),
  );
  return metadata;
}

async function verify() {
  const directory = await mkdtemp(path.join(tmpdir(), "viewrule-evaluator-"));
  const browser = await chromium.launch({
    executablePath: process.env.VIEWRULE_BROWSER_PATH || undefined,
  });
  try {
    const results = [];
    for (const item of cases) {
      await writeFile(path.join(directory, "index.html"), neutral(item));
      const result = await evaluateRepair(
        browser,
        directory,
        item.id === "finite-control" ? 4 : 12,
        null,
      );
      for (const observation of result.observations) {
        const viewport =
          observation.viewport.width === 1280 ? "desktop" : "wide";
        const expectedFailure =
          item.expectAt.includes(viewport) &&
          (item.id !== "after-filter" || observation.state === "filtered");
        assert.ok(
          !observation.failures.includes("evaluation-unavailable"),
          observation.reason,
        );
        assert.equal(
          observation.failures.length > 0,
          expectedFailure,
          `${item.id}/${viewport}/${observation.state}: ${observation.failures}`,
        );
      }
      results.push({ case: item.id, ...result });
    }
    const file = path.join(root, "dist/repair-evaluator-validation.json");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(
      file,
      json({
        kind: "evaluator-validation-not-agent-results",
        browser: browser.version(),
        results,
      }),
    );
    console.log(
      `Validated independent evaluator on ${results.length} neutral inputs; no agent trial was run.`,
    );
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}

const [command, target, input, expectedHash, stage = "after"] =
  process.argv.slice(2);
if (command === "prepare") {
  assert.ok(
    target,
    "Usage: repair-trial.mjs prepare <new-external-directory> [pinned-impeccable-checkout]",
  );
  const manifest = await prepare(
    path.resolve(target),
    input && path.resolve(input),
  );
  console.log(
    json({
      status: manifest.status,
      trials: manifest.trials.length,
      output: path.resolve(target),
    }),
  );
} else if (command === "verify") await verify();
else if (command === "evaluate") {
  assert.ok(
    target && input && expectedHash,
    "Usage: repair-trial.mjs evaluate <prepared-directory> <task-id> <frozen-evaluator-sha256>",
  );
  const directory = path.resolve(target),
    manifest = JSON.parse(
      await readFile(path.join(directory, "manifest.json"), "utf8"),
    );
  for (const field of [
    "provider",
    "model",
    "reasoning",
    "runnerVersion",
    "browserVersion",
  ])
    assert.ok(
      typeof manifest.runner[field] === "string" &&
        manifest.runner[field].trim(),
      `Pin runner.${field} before evaluating actual trials`,
    );
  for (const field of ["maxTokens", "wallTimeSeconds"])
    assert.ok(
      Number.isInteger(manifest.runner[field]) && manifest.runner[field] > 0,
      `Pin runner.${field} before evaluating actual trials`,
    );
  const evaluator = await readFile(path.join(directory, "evaluator.mjs"));
  assert.equal(hash(evaluator), expectedHash, "Frozen evaluator changed");
  assert.equal(manifest.evaluatorSHA256, expectedHash);
  assert.ok(
    ["before", "after"].includes(stage),
    "Evaluation stage must be before or after",
  );
  const trial = manifest.trials.find((t) => t.id === input);
  assert.ok(trial && /^task-\d{3}$/.test(input), "Unknown trial");
  const observedFiles = await protectedFiles(path.join(directory, input));
  assert.deepEqual(
    observedFiles,
    trial.protectedFiles,
    "Trial tool/requirement files changed; invalidate this trial",
  );
  if (stage === "before")
    assert.equal(
      hash(await readFile(path.join(directory, input, "index.html"))),
      trial.sourceSHA256,
      "Before input changed",
    );
  // Run the versioned evaluator from this checkout only if it matches the frozen copy.
  assert.equal(
    hash(await readFile(path.join(corpus, "repair-evaluator.mjs"))),
    expectedHash,
  );
  const browser = await chromium.launch({
    executablePath: process.env.VIEWRULE_BROWSER_PATH || undefined,
  });
  try {
    assert.equal(
      browser.version(),
      manifest.runner.browserVersion,
      "Trial browser differs from the pinned runner browser",
    );
    const result = await evaluateRepair(
      browser,
      path.join(directory, input),
      trial.count,
      path.join(directory, "evidence", input, stage),
    );
    await mkdir(path.join(directory, "evaluations"), { recursive: true });
    await writeFile(
      path.join(directory, "evaluations", `${input}-${stage}.json`),
      json({
        trialId: input,
        stage,
        runner: manifest.runner,
        evaluatorSHA256: expectedHash,
        browser: browser.version(),
        outputSHA256: hash(
          await readFile(path.join(directory, input, "index.html")),
        ),
        ...result,
      }),
    );
    console.log(json({ trialId: input, passed: result.passed }));
  } finally {
    await browser.close();
  }
} else throw new Error("Use prepare, verify, or evaluate");

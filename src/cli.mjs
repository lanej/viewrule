#!/usr/bin/env node
import {
  globalConfigDir,
  findProject,
  assertLocalReviewDirectory,
} from "./paths.mjs";
import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readJSON,
  validateConfig,
  validateSourceChecks,
  ruleSchema,
} from "./config.mjs";
import { impeccableProvider } from "./impeccable.mjs";
import { runSourceChecks, sourceSummary } from "./source-checks.mjs";
import { readContract } from "./contract.mjs";
import { readPlan } from "./plan.mjs";
import { readProjectDocuments } from "./project-documents.mjs";
import { runReview } from "./review.mjs";
import { defaultPreferences, presetRules } from "./presets.mjs";
import {
  feedbackEntries,
  recordFeedback,
  learnRule,
  hookDecision,
  addRule,
} from "./state.mjs";

const help = `viewrule — rendered UI checks and a versioned design feedback loop

  install-browser [--with-deps]       Install the pinned Chromium browser
  init [--url URL] [--preset baseline|analytical] [--documents]
                                       Create config, starter rules, and a missing DESIGN.md scaffold; never overwrite
                                       New projects require an authored DESIGN.md; --documents also scaffolds STYLE.md
  preset --name baseline|analytical     Print starter rules for review or adaptation
  plan [--url URL] [--incremental | --full]
                                       Print resolved input and browser obligations; no checks or state writes
  contract                             Validate required design prose; print constraints, documents, and changes
  schema [--type TYPE]                  Print the installed rule schema for authoring
  add-rule --rule FILE [--dry-run]      Validate and add a project rule; never replace an existing ID
  lint [--target PATH ...]             Run source diagnostics as JSON; no browser, project setup, or review state
                                       --target selects bundled Impeccable; otherwise use configured providers
  check [--url URL] [--incremental | --full]
                                       Validate the contract, capture pages, check rules, write HTML + JSON
  feedback --report PATH --decision approve|adjust --note TEXT [--scope project|global]
                                       Save feedback; approval preserves screenshots
  learn --feedback ID --rule FILE [--scope project|global]
                                       Convert recorded feedback into a JSON rule
  guide [ID]                           Read the versioned guide index or one Markdown page
  guidance                             Read project documents (including unfinished prose), guidance, and feedback
  hook                                 Claude Stop hook; opt-in per project

Common: --project DIR (exact application root), --help, --version
Default: nearest configured parent within this checkout; init and lint use cwd.
Project files: DESIGN.md (required for new projects), STYLE.md (optional); .ui-review/config.json, rules.json, feedback.jsonl, approved/
Global files: $XDG_CONFIG_HOME/viewrule (default ~/.config/viewrule)
Runtime URL: --url URL, then VIEWRULE_BASE_URL, then legacy config baseURL.
Override: VIEWRULE_CONFIG_DIR; UI_REVIEW_GLOBAL_DIR remains supported.
Exit codes: 0 checks pass, 1 checks fail, 2 setup/configuration/usage error.
See docs/ui-review.md for rule types and CI use; docs/project-documents.md for authoring and explicit migration.
`;
try {
  const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: "string" },
      project: { type: "string" },
      report: { type: "string" },
      decision: { type: "string" },
      note: { type: "string" },
      scope: { type: "string" },
      feedback: { type: "string" },
      rule: { type: "string" },
      preset: { type: "string" },
      name: { type: "string" },
      type: { type: "string" },
      target: { type: "string", multiple: true },
      documents: { type: "boolean" },
      "dry-run": { type: "boolean" },
      incremental: { type: "boolean" },
      full: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  const command = positionals[0];
  const project =
    args.project !== undefined || ["init", "lint"].includes(command)
      ? path.resolve(args.project ?? process.cwd())
      : await findProject(process.cwd());
  const globalDir = globalConfigDir();
  if ((args.incremental || args.full) && !["check", "plan"].includes(command))
    throw new Error(
      "--incremental and --full are only supported by check and plan",
    );
  if (args.incremental && args.full)
    throw new Error("Choose --incremental or --full, not both");
  if (args.target?.length && command !== "lint")
    throw new Error("--target is only supported by lint");
  if (args.url !== undefined && !["init", "plan", "check"].includes(command))
    throw new Error("--url is only supported by init, plan, and check");
  if (
    !args.help &&
    [
      "init",
      "plan",
      "contract",
      "add-rule",
      "lint",
      "check",
      "feedback",
      "learn",
      "guidance",
    ].includes(command)
  )
    await assertLocalReviewDirectory(project);
  if (args.help || !command) console.log(help);
  else if (positionals.length !== 1)
    throw new Error("Expected one command; use --help.");
  else if (command === "init") {
    const starter = await presetRules(args.preset ?? "baseline");
    const dir = path.join(project, ".ui-review");
    await mkdir(dir, { recursive: true });
    const existingDocuments = await readProjectDocuments(project);
    const includeStyle =
      args.documents ||
      existingDocuments.some((document) => document.role === "style");
    const config = validateConfig({
      version: 1,
      ...(args.url ? { baseURL: args.url } : {}),
      enforceOnStop: false,
      sourcePaths: ["."],
      sourceChecks: [impeccableProvider()],
      accessibility: true,
      projectDocuments: ["DESIGN.md", ...(includeStyle ? ["STYLE.md"] : [])],
      pages: [{ name: "main", path: "/", ready: "main" }],
      viewports: [
        { name: "desktop", width: 1440, height: 900 },
        { name: "wide", width: 1920, height: 1080 },
        { name: "large", width: 2560, height: 1440 },
        { name: "4k", width: 3840, height: 2160 },
        { name: "mobile", width: 390, height: 844 },
      ],
    });
    await writeFile(
      path.join(dir, "config.json"),
      JSON.stringify(config, null, 2) + "\n",
      { flag: "wx" },
    );
    for (const [name, content] of [
      ["rules.json", JSON.stringify(starter, null, 2) + "\n"],
      [".gitignore", "runs/\nlatest.json\n*.lock\n*.tmp\nauth*.json\n"],
    ]) {
      try {
        await writeFile(path.join(dir, name), content, { flag: "wx" });
      } catch (err) {
        if (err.code !== "EEXIST") throw err;
      }
    }
    for (const name of ["DESIGN.md", ...(args.documents ? ["STYLE.md"] : [])]) {
      try {
        await writeFile(
          path.join(project, name),
          await readFile(new URL(`../presets/${name}`, import.meta.url)),
          { flag: "wx" },
        );
      } catch (err) {
        if (err.code !== "EEXIST") throw err;
      }
    }
    const documents = await readProjectDocuments(project);
    console.log(
      `Created ${dir}/config.json with editable ${args.preset ?? "baseline"} starter rules (existing rules and documents are preserved). Author DESIGN.md before contract/check; a scaffold is not a completed contract. Use /viewrule:design or docs/project-documents.md. Calibrate selectors, counts, and thresholds to the task. Stop enforcement is off until enforceOnStop is true. Project guidance: ${documents.map((document) => document.path).join(", ")}. Commit the setup files (.ui-review/config.json, rules.json, .gitignore, project documents, and any checkpoint scripts) to carry them into new Git worktrees. The application URL is runtime state unless you explicitly supplied --url; use check --url <actual-url> or VIEWRULE_BASE_URL for dynamically assigned development ports. Runs, latest.json, and authentication state stay local; see docs/worktrees.md.`,
    );
  } else if (command === "preset") {
    console.log(
      JSON.stringify(await presetRules(args.name ?? "baseline"), null, 2),
    );
  } else if (command === "plan") {
    console.log(
      JSON.stringify(
        await readPlan(project, globalDir, Boolean(args.incremental), args.url),
        null,
        2,
      ),
    );
  } else if (command === "contract") {
    console.log(
      JSON.stringify(await readContract(project, globalDir), null, 2),
    );
  } else if (command === "schema") {
    const schema = args.type
      ? ruleSchema.oneOf.find(
          (entry) => entry.properties.type.const === args.type,
        )
      : ruleSchema;
    if (!schema) throw new Error(`Unknown rule type: ${args.type}`);
    console.log(JSON.stringify(schema, null, 2));
  } else if (command === "add-rule") {
    if (!args.rule) throw new Error("--rule is required");
    if (args.scope && args.scope !== "project")
      throw new Error(
        "add-rule writes project rules; use feedback/learn for shared preferences",
      );
    console.log(
      JSON.stringify(
        await addRule(
          project,
          globalDir,
          await readJSON(path.resolve(project, args.rule)),
          args["dry-run"] ?? false,
        ),
        null,
        2,
      ),
    );
  } else if (command === "lint") {
    const started = performance.now();
    const rawConfig = await readJSON(
      path.join(project, ".ui-review/config.json"),
      null,
    );
    const config = rawConfig ? validateConfig(rawConfig, project) : null;
    const providers = validateSourceChecks(
      args.target?.length
        ? [impeccableProvider(args.target)]
        : (config?.sourceChecks ?? [impeccableProvider()]),
    );
    if (!providers.some((provider) => provider.enabled !== false))
      throw new Error(
        "No enabled source checks; use lint --target PATH to scan with bundled Impeccable.",
      );
    const results = await runSourceChecks(project, providers);
    const summary = sourceSummary(results);
    console.log(
      JSON.stringify({
        version: 1,
        status: summary.errors ? "fail" : "pass",
        coverage: "source-only",
        renderedRequirements: "not-assessed",
        ...summary,
        elapsedMs: Math.round(performance.now() - started),
        sourceChecks: results,
        findings: results.flatMap((result) => result.findings),
      }),
    );
    process.exitCode = summary.errors ? 1 : 0;
  } else if (command === "check") {
    const result = await runReview(
      project,
      globalDir,
      Boolean(args.incremental),
      args.url,
    );
    console.log(
      JSON.stringify({
        status: result.report.status,
        targetBaseURL: result.report.targetBaseURL,
        ...result.report.summary,
        contract: {
          hash: result.report.contract.hash,
          comparison: result.report.contract.comparison,
          previousReportId: result.report.contract.previousReportId,
          changes: result.report.contract.changes,
          documentComparison: result.report.contract.documentComparison,
          documentChanges: result.report.contract.documentChanges,
          configurationChange: result.report.contract.configurationChange,
          policyChanged: result.report.contract.policyChanged,
        },
        report: result.reportFile,
        html: path.join(path.dirname(result.reportFile), "index.html"),
        designRules: path.join(
          path.dirname(result.reportFile),
          "design-rules.html",
        ),
        projectDocuments: path.join(
          path.dirname(result.reportFile),
          "project-documents.html",
        ),
        findings: [
          ...result.report.pages.flatMap((page) =>
            page.findings.map((finding) => ({
              page: page.name,
              viewport: page.viewport.name,
              ...finding,
            })),
          ),
          ...(result.report.sourceChecks ?? []).flatMap(
            (provider) => provider.findings,
          ),
        ],
      }),
    );
    process.exitCode = result.report.status === "pass" ? 0 : 1;
  } else if (command === "feedback") {
    if (!args.report) throw new Error("--report is required");
    console.log(
      JSON.stringify(
        await recordFeedback(
          project,
          globalDir,
          path.resolve(project, args.report),
          args.decision,
          args.note,
          args.scope ?? "project",
        ),
      ),
    );
  } else if (command === "learn") {
    if (!args.rule || !args.feedback)
      throw new Error("--rule and --feedback are required");
    console.log(
      JSON.stringify(
        await learnRule(
          project,
          globalDir,
          args.feedback,
          await readJSON(path.resolve(project, args.rule)),
          args.scope ?? "project",
        ),
      ),
    );
  } else if (command === "guidance") {
    const rawConfig = await readJSON(
      path.join(project, ".ui-review/config.json"),
      null,
    );
    console.log(
      JSON.stringify(
        {
          projectDocuments: await readProjectDocuments(
            project,
            rawConfig ? validateConfig(rawConfig).projectDocuments : undefined,
          ),
          defaults: await defaultPreferences(),
          preferences: await readJSON(
            path.join(globalDir, "preferences.json"),
            [],
          ),
          globalFeedback: await feedbackEntries(globalDir),
          projectFeedback: await feedbackEntries(
            path.join(project, ".ui-review"),
          ),
        },
        null,
        2,
      ),
    );
  } else if (command === "hook") {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    console.log(
      JSON.stringify(await hookDecision(JSON.parse(input), globalDir)),
    );
  } else throw new Error(`Unknown command: ${command}`);
} catch (err) {
  console.error(`viewrule: ${err.message}`);
  process.exitCode = 2;
}

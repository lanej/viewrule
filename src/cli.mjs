#!/usr/bin/env node
import { globalConfigDir } from "./paths.mjs";
import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readJSON, validateConfig, ruleSchema } from "./config.mjs";
import { readContract } from "./contract.mjs";
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
  init --url http://localhost:3000 [--preset baseline|analytical]
                                       Create config and editable starter rules (never overwrite)
  preset --name baseline|analytical     Print starter rules for review or adaptation
  contract                             Print effective constraints and changes since the previous report
  schema [--type TYPE]                  Print the installed rule schema for authoring
  add-rule --rule FILE [--dry-run]      Validate and add a project rule; never replace an existing ID
  check                                Capture pages, check rules, write HTML + JSON
  feedback --report PATH --decision approve|adjust --note TEXT [--scope project|global]
                                       Save feedback; approval preserves screenshots
  learn --feedback ID --rule FILE [--scope project|global]
                                       Convert recorded feedback into a JSON rule
  guidance                             Print built-in guidance, personal preferences, and feedback
  hook                                 Claude Stop hook; opt-in per project

Common: --project DIR (default cwd), --help, --version
Project files: .ui-review/config.json, rules.json, feedback.jsonl, approved/
Global files: $XDG_CONFIG_HOME/viewrule (default ~/.config/viewrule)
Override: VIEWRULE_CONFIG_DIR; UI_REVIEW_GLOBAL_DIR remains supported.
Exit codes: 0 checks pass, 1 checks fail, 2 setup/configuration/usage error.
See docs/ui-review.md for rule types and CI use.
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
      "dry-run": { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  const command = positionals[0];
  const project = path.resolve(args.project ?? process.cwd());
  const globalDir = globalConfigDir();
  if (args.help || !command) console.log(help);
  else if (positionals.length !== 1)
    throw new Error("Expected one command; use --help.");
  else if (command === "init") {
    const starter = await presetRules(args.preset ?? "baseline");
    const dir = path.join(project, ".ui-review");
    const config = validateConfig({
      version: 1,
      baseURL: args.url ?? "http://localhost:3000",
      enforceOnStop: false,
      sourcePaths: ["."],
      accessibility: true,
      pages: [{ name: "main", path: "/", ready: "main" }],
      viewports: [
        { name: "desktop", width: 1440, height: 900 },
        { name: "wide", width: 1920, height: 1080 },
        { name: "large", width: 2560, height: 1440 },
        { name: "4k", width: 3840, height: 2160 },
        { name: "mobile", width: 390, height: 844 },
      ],
    });
    await mkdir(dir, { recursive: true });
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
    console.log(
      `Created ${dir}/config.json with editable ${args.preset ?? "baseline"} starter rules (existing rule files are preserved). Calibrate selectors, counts, and thresholds to the task. Stop enforcement is off until enforceOnStop is true.`,
    );
  } else if (command === "preset") {
    console.log(
      JSON.stringify(await presetRules(args.name ?? "baseline"), null, 2),
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
  } else if (command === "check") {
    const result = await runReview(project, globalDir);
    console.log(
      JSON.stringify({
        status: result.report.status,
        ...result.report.summary,
        contract: {
          hash: result.report.contract.hash,
          comparison: result.report.contract.comparison,
          previousReportId: result.report.contract.previousReportId,
          changes: result.report.contract.changes,
          configurationChange: result.report.contract.configurationChange,
          policyChanged: result.report.contract.policyChanged,
        },
        report: result.reportFile,
        html: path.join(path.dirname(result.reportFile), "index.html"),
        designRules: path.join(
          path.dirname(result.reportFile),
          "design-rules.html",
        ),
        findings: result.report.pages.flatMap((page) =>
          page.findings.map((finding) => ({
            page: page.name,
            viewport: page.viewport.name,
            ...finding,
          })),
        ),
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
    console.log(
      JSON.stringify(
        {
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

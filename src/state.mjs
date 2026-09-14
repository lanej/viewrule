import { createHash, randomUUID } from "node:crypto";
import {
  readFile,
  writeFile,
  appendFile,
  readdir,
  mkdir,
  rename,
  open,
  unlink,
  cp,
  realpath,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  readJSON,
  loadProject,
  validateRules,
  validateConfig,
  validateRuleScopes,
} from "./config.mjs";
import { policyPaths } from "./design.mjs";

export async function writeJSON(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await rename(temp, file);
}
const excluded = new Set([
  ".git",
  "node_modules",
  ".ui-review",
  "dist",
  "build",
  ".next",
  "coverage",
  ".cache",
]);
async function walk(root, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), {
    withFileTypes: true,
  })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(root, file)));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}
export async function fingerprint(project, config, globalDir) {
  const hash = createHash("sha256");
  const listed = spawnSync(
    "git",
    [
      "-C",
      project,
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
    ],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  const files =
    listed.status === 0
      ? [...new Set(listed.stdout.split("\0").filter(Boolean))]
      : await walk(project);
  const inScope = (file) =>
    !file.split("/").some((p) => excluded.has(p)) &&
    config.sourcePaths.some(
      (p) =>
        p === "." || file === p || file.startsWith(p.replace(/\/$/, "") + "/"),
    );
  for (const file of files.filter(inScope).sort()) {
    hash.update(file + "\0");
    try {
      hash.update(await readFile(path.join(project, file)));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      hash.update("deleted");
    }
  }
  for (const file of [
    path.join(project, ".ui-review/config.json"),
    path.join(project, ".ui-review/rules.json"),
    path.join(globalDir, "rules.json"),
    path.join(globalDir, "preferences.json"),
  ]) {
    hash.update(file + "\0");
    try {
      hash.update(await readFile(file));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
  // Changing the checker itself invalidates old passing runs after a Viewrule update.
  for (const file of [
    "config.mjs",
    "capture.mjs",
    "checks.mjs",
    "design.mjs",
    "review.mjs",
    "state.mjs",
    "paths.mjs",
    "cli.mjs",
    "report.mjs",
    "presets.mjs",
    "contract.mjs",
    "../presets/preferences.json",
    "../presets/baseline.json",
    "../presets/analytical.json",
    "../bin/viewrule.mjs",
    "../package.json",
    "../npm-shrinkwrap.json",
  ])
    hash.update(await readFile(path.join(import.meta.dirname, file)));
  for (const file of (
    await walk(path.join(import.meta.dirname, "templates"))
  ).sort()) {
    hash.update(`templates/${file}\0`);
    hash.update(
      await readFile(path.join(import.meta.dirname, "templates", file)),
    );
  }
  for (const file of policyPaths) {
    hash.update(file + "\0");
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}
export async function feedbackEntries(dir) {
  try {
    return (await readFile(path.join(dir, "feedback.jsonl"), "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
export async function recordFeedback(
  project,
  globalDir,
  reportFile,
  decision,
  note,
  scope,
) {
  if (
    !["approve", "adjust"].includes(decision) ||
    !["project", "global"].includes(scope) ||
    !note?.trim()
  )
    throw new Error(
      "Feedback requires approve|adjust, project|global, and a nonempty note.",
    );
  const resolved = await realpath(reportFile);
  const runs = await realpath(path.join(project, ".ui-review/runs"));
  if (
    !resolved.startsWith(runs + path.sep) ||
    path.basename(resolved) !== "report.json"
  )
    throw new Error(
      "Use a report.json from this project’s .ui-review/runs directory.",
    );
  const report = await readJSON(resolved);
  if (
    report.project !== (await realpath(project)) ||
    report.version !== 1 ||
    !Array.isArray(report.pages)
  )
    throw new Error("Report does not belong to this project.");
  const entry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    decision,
    note: note.trim(),
    scope,
    reportId: report.id,
    fingerprint: report.fingerprint,
  };
  if (decision === "approve") {
    entry.reference = `approved/${entry.id}`;
    await cp(
      path.dirname(resolved),
      path.join(project, ".ui-review", entry.reference),
      { recursive: true, errorOnExist: true, force: false },
    );
  }
  await appendFile(
    path.join(project, ".ui-review/feedback.jsonl"),
    JSON.stringify(entry) + "\n",
    { mode: 0o600 },
  );
  if (scope === "global") {
    await mkdir(globalDir, { recursive: true });
    // Global preferences retain words and provenance, never project URLs or screenshots.
    const { reference, ...globalEntry } = entry;
    await appendFile(
      path.join(globalDir, "feedback.jsonl"),
      JSON.stringify(globalEntry) + "\n",
      { mode: 0o600 },
    );
  }
  return entry;
}
/** Additions cannot silently replace an existing local or inherited rule.
 * @param {string} project
 * @param {string} globalDir
 * @param {import("./types.js").Rule} rule
 * @param {boolean} [dryRun] */
export async function addRule(project, globalDir, rule, dryRun = false) {
  validateRules([rule]);
  if (rule.feedbackId)
    throw new Error("Use learn to attach recorded feedback provenance");
  const { config, rules } = await loadProject(project, globalDir);
  validateRuleScopes([rule], config);
  if (rules.some((existing) => existing.id === rule.id))
    throw new Error(
      `Rule ${rule.id} already exists; add-rule never replaces a boundary`,
    );
  if (dryRun) return { applied: false, added: rule };
  await writeRule(project, globalDir, rule, "project", false);
  return { applied: true, added: rule };
}

async function writeRule(project, globalDir, rule, scope, replace) {
  const dir = scope === "global" ? globalDir : path.join(project, ".ui-review");
  const file = path.join(dir, "rules.json");
  const lock = await open(file + ".lock", "wx").catch((err) => {
    throw new Error(
      `Cannot lock rules for editing (${err.code}); another writer may be active.`,
      { cause: err },
    );
  });
  try {
    const existing = validateRules(await readJSON(file, []));
    if (scope === "project") {
      const config = validateConfig(
        await readJSON(path.join(project, ".ui-review/config.json")),
      );
      // Validate the proposed result so a requested revision can repair an invalid old scope.
      validateRuleScopes(
        [...existing.filter((entry) => entry.id !== rule.id), rule],
        config,
      );
      const inherited = validateRules(
        await readJSON(path.join(globalDir, "rules.json"), []),
      );
      if (
        !replace &&
        [...existing, ...inherited].some((entry) => entry.id === rule.id)
      )
        throw new Error(
          `Rule ${rule.id} already exists; add-rule never replaces a boundary`,
        );
    }
    const next = [...existing.filter((entry) => entry.id !== rule.id), rule];
    await writeJSON(file, next);
  } finally {
    await lock.close();
    await unlink(file + ".lock");
  }
}

export async function learnRule(project, globalDir, feedbackId, rule, scope) {
  if (!["project", "global"].includes(scope))
    throw new Error("Scope must be project or global.");
  const dir = scope === "global" ? globalDir : path.join(project, ".ui-review");
  const feedback = (await feedbackEntries(dir)).find(
    (e) => e.id === feedbackId,
  );
  if (!feedback)
    throw new Error(
      "Unknown feedback ID in the requested scope. Record feedback first.",
    );
  const learned = { ...rule, feedbackId };
  validateRules([learned]);
  await writeRule(project, globalDir, learned, scope, true);
  return learned;
}
export async function hookDecision(payload, globalDir) {
  if (!payload.cwd || payload.stop_hook_active) return {};
  const project = await realpath(payload.cwd);
  const raw = await readJSON(
    path.join(project, ".ui-review/config.json"),
    null,
  );
  if (!raw || raw.enforceOnStop === false) return {};
  try {
    const { config } = await loadProject(project, globalDir);
    const latest = await readJSON(
      path.join(project, ".ui-review/latest.json"),
      null,
    );
    if (
      latest?.status === "pass" &&
      latest.fingerprint === (await fingerprint(project, config, globalDir))
    )
      return {};
    return {
      decision: "block",
      reason:
        "UI review is missing, failing, or stale. Run viewrule check, then inspect the cited design rules and full-resolution details. Repair the app and rerun; do not weaken checks or edit evidence to pass. " +
        (latest?.reportFile ? `Last report: ${latest.reportFile}. ` : "") +
        (latest?.blockingFindings?.join("\n") ?? ""),
    };
  } catch (err) {
    return {
      decision: "block",
      reason: `UI review configuration or verification failed: ${err.message}`,
    };
  }
}

import { createHash, randomUUID } from "node:crypto";
import {
  readFile,
  writeFile,
  appendFile,
  mkdir,
  rename,
  open,
  unlink,
  cp,
  realpath,
} from "node:fs/promises";
import path from "node:path";
import { assertLocalReviewDirectory } from "./paths.mjs";
import {
  readJSON,
  loadProject,
  validateRules,
  validateConfig,
  validateRuleScopes,
} from "./config.mjs";
import {
  engineFingerprint,
  engineVersion,
  fileDigest,
  inputDigest,
  digest,
} from "./fingerprints.mjs";
import { impeccableContextFingerprint } from "./impeccable.mjs";
import { resolveSourceScope } from "./source-scope.mjs";
import {
  readProjectDocuments,
  validateDocumentSources,
} from "./project-documents.mjs";

export async function writeJSON(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await rename(temp, file);
}
/** @param {string} project
 * @param {import("./types.js").ProjectConfig} config
 * @param {string} globalDir
 * @param {import("./types.js").ProjectDocument[]} [documents] */
export async function fingerprint(project, config, globalDir, documents) {
  const hash = createHash("sha256");
  const scope = await resolveSourceScope(project, config);
  const contextDirectories = scope.contextDirectories;
  hash.update(await impeccableContextFingerprint(contextDirectories));
  for (const { path: file } of scope.files) {
    hash.update(file + "\0");
    hash.update(await inputDigest(path.join(project, file)));
  }
  // Full reviews also depend on checkpoint code and authentication setup, even
  // when those files are outside the application's ordinary source selection.
  if (!config.reviewScopes?.length)
    for (const file of [
      config.storageState,
      ...config.pages.flatMap((page) =>
        (page.checkpoints ?? []).map((checkpoint) => checkpoint.setup),
      ),
    ].filter(Boolean)) {
      const resolved = path.resolve(project, file);
      hash.update("runtime-setup\0" + resolved + "\0");
      hash.update(await inputDigest(resolved));
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
  // Project guidance is part of the contract even outside sourcePaths or git.
  hash.update("project-documents\0");
  hash.update(
    JSON.stringify(
      documents ??
        (await readProjectDocuments(project, config.projectDocuments)),
    ),
  );
  hash.update(await engineFingerprint());
  if (config.reviewScopes?.length) {
    const { browserExecutable } = await import("./incremental.mjs");
    hash.update(
      digest([
        process.platform,
        process.arch,
        process.versions.node,
        browserExecutable(),
        await fileDigest(browserExecutable()),
      ]),
    );
    if (
      (config.sourceChecks ?? []).some(
        (provider) =>
          provider.enabled !== false &&
          provider.format === "impeccable" &&
          !provider.command,
      )
    ) {
      const { installedImpeccable } = await import("./impeccable.mjs");
      hash.update(digest(await installedImpeccable()));
    }
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
  const { config, rules, projectDocuments } = await loadProject(
    project,
    globalDir,
  );
  validateRuleScopes([rule], config);
  validateDocumentSources([rule], projectDocuments);
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
    const next = [...existing.filter((entry) => entry.id !== rule.id), rule];
    if (scope === "project") {
      const config = validateConfig(
        await readJSON(path.join(project, ".ui-review/config.json")),
      );
      // A requested revision can repair an invalid old scope or source citation.
      validateRuleScopes(next, config);
      validateDocumentSources(
        next,
        await readProjectDocuments(project, config.projectDocuments),
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
/** Verify existing evidence without capturing, installing, or changing state. */
export async function verifyReview(project, globalDir) {
  project = await realpath(project);
  try {
    await assertLocalReviewDirectory(project);
    const { config } = await loadProject(project, globalDir);
    const latest = await readJSON(
      path.join(project, ".ui-review/latest.json"),
      null,
    );
    const currentEngineVersion = await engineVersion();
    if (latest?.engineVersion && latest.engineVersion !== currentEngineVersion)
      return {
        status: "fail",
        reason: `UI review state was generated by viewrule engine v${latest.engineVersion}, but this verifier is running v${currentEngineVersion}. Use the same viewrule engine for check and verify, then rerun viewrule check.`,
      };
    if (
      latest?.status === "pass" &&
      latest.fingerprint === (await fingerprint(project, config, globalDir))
    ) {
      const reportFile = await realpath(latest.reportFile);
      const runs = await realpath(path.join(project, ".ui-review/runs"));
      if (
        !reportFile.startsWith(runs + path.sep) ||
        path.basename(reportFile) !== "report.json"
      )
        throw new Error(
          "The passing report must be inside this application's review runs.",
        );
      const report = await readJSON(reportFile);
      if (
        report.version !== 1 ||
        report.project !== project ||
        report.status !== "pass" ||
        report.fingerprint !== latest.fingerprint
      )
        throw new Error(
          "The stored report does not match the passing review state.",
        );
      if (config.reviewScopes?.length) {
        const { storedEvidenceProblem } = await import("./incremental.mjs");
        const problem = await storedEvidenceProblem(project, config);
        if (problem)
          return {
            status: "fail",
            reason: `${problem} Run viewrule check --incremental or --full.`,
          };
      }
      return { status: "pass" };
    }
    return {
      status: "fail",
      reason:
        "UI review is missing, failing, or stale. Run viewrule check, then inspect the cited design rules and full-resolution details. Repair the app and rerun; do not weaken checks or edit evidence to pass. " +
        (latest?.reportFile ? `Last report: ${latest.reportFile}. ` : "") +
        (latest?.blockingFindings?.join("\n") ?? ""),
    };
  } catch (err) {
    return {
      status: "fail",
      reason: `UI review configuration or verification failed: ${err.message}`,
    };
  }
}

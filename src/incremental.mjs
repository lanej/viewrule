import { createHash } from "node:crypto";
import { readFile, lstat, copyFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { readJSON } from "./config.mjs";
import { digest, fileDigest, engineFingerprint } from "./fingerprints.mjs";
import { resolveSourceScope, contained } from "./source-scope.mjs";
import { selected, pathSelection, reviewStates } from "./scopes.mjs";
import { dependencyNames, ownsState, ownsDocument } from "./review-scopes.mjs";
import {
  installedImpeccable,
  impeccableContextFingerprint,
} from "./impeccable.mjs";

/** Stable state identity includes checkpoint and dimensions, not capture numbering. */
export function stateKey(page) {
  return JSON.stringify([
    page.name,
    page.checkpoint ?? null,
    page.viewport.name,
    page.viewport.width,
    page.viewport.height,
  ]);
}
export function configuredStateKey({ page, viewport, checkpoint }) {
  return stateKey({ name: page.name, checkpoint: checkpoint?.name, viewport });
}
export function browserExecutable() {
  return (
    process.env.VIEWRULE_BROWSER_PATH ||
    process.env.UI_REVIEW_BROWSER_PATH ||
    chromium.executablePath()
  );
}
const bytesDigest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Only the last verified passing complete run is a reuse candidate. No scan of
 * arbitrary cache files, no approval inference, and no writes during planning. */
async function readCache(project) {
  try {
    const latest = await readJSON(
      path.join(project, ".ui-review/latest.json"),
      null,
    );
    if (latest?.status !== "pass" || !latest.reportSHA256)
      throw new Error("No verified passing scoped review is available.");
    const file = path.resolve(latest.reportFile);
    const root = path.join(project, ".ui-review/runs") + path.sep;
    if (!file.startsWith(root) || path.basename(file) !== "report.json")
      throw new Error("Previous report is outside this project's runs.");
    await contained(project, file);
    if (
      !(await lstat(file)).isFile() ||
      (await lstat(file)).size > 64 * 1024 * 1024
    )
      throw new Error("Previous report is not a bounded regular file.");
    const bytes = await readFile(file);
    if (bytesDigest(bytes) !== latest.reportSHA256)
      throw new Error("Previous report checksum changed.");
    /** @type {import("./types.js").ReviewReport} */
    const report = JSON.parse(bytes.toString("utf8"));
    if (
      report.version !== 1 ||
      report.project !== project ||
      report.status !== "pass" ||
      report.fingerprint !== latest.fingerprint ||
      report.measurements?.version !== 1 ||
      report.id !== path.basename(path.dirname(file))
    )
      throw new Error(
        "Previous report has no compatible complete evidence manifest.",
      );
    return { report, directory: path.dirname(file), reason: null };
  } catch (error) {
    return {
      report: null,
      directory: null,
      reason: `Evidence unavailable: ${error.message}`,
    };
  }
}

/** @param {import("./types.js").PageResult} page */
function artifactNames(page) {
  return [
    page.screenshot,
    ...(page.details?.tiles ?? []).map((tile) => tile.file),
  ];
}
async function artifactDigest(directory, file) {
  if (!/^capture-\d+(?:-detail-\d+)?\.png$/.test(file ?? ""))
    throw new Error("Invalid evidence artifact path.");
  const target = path.join(directory, file);
  const metadata = await lstat(target);
  if (!metadata.isFile() || metadata.size > 32 * 1024 * 1024)
    throw new Error(`Missing or invalid evidence artifact ${file}`);
  return fileDigest(target);
}
function ageProblem(evidence, maxAgeMs) {
  const created = Date.parse(evidence?.createdAt);
  const age = Date.now() - created;
  if (
    !Number.isFinite(created) ||
    age < 0 ||
    (maxAgeMs !== undefined && age > maxAgeMs)
  )
    return "Evidence is expired or has an invalid original capture time.";
  return null;
}
async function pageProblem(page, record, directory, maxAgeMs) {
  if (
    !page?.coverage ||
    !page.metrics ||
    !page.screenshot ||
    !page.details?.complete ||
    page.details.scale !== 1 ||
    page.details.expectedTiles !== page.details.capturedTiles ||
    page.details.capturedTiles !== page.details.tiles.length ||
    !Array.isArray(record?.rawFindings)
  )
    return "Required page measurements or full-resolution evidence are missing.";
  const age = ageProblem(record.evidence, maxAgeMs);
  if (age) return age;
  const files = artifactNames(page);
  if (
    new Set(files).size !== files.length ||
    files.length !== Object.keys(record.artifacts ?? {}).length
  )
    return "Evidence artifact coverage changed.";
  try {
    for (const file of files)
      if ((await artifactDigest(directory, file)) !== record.artifacts?.[file])
        return `Evidence artifact changed: ${file}`;
  } catch (error) {
    return error.message;
  }
  return null;
}

/** Validity is checked at report assembly too, not only when reuse was planned.
 * @param {import("./types.js").ReviewReport} report
 * @param {import("./types.js").ProjectConfig} config */
export function evidenceAgeProblem(report, config) {
  if (!config.evidenceReuse || !report.measurements) return null;
  for (const record of [
    ...report.measurements.pages,
    ...report.measurements.sourceChecks,
  ]) {
    const problem = ageProblem(record.evidence, config.evidenceReuse.maxAgeMs);
    if (problem) return problem;
  }
  return null;
}

/** Inspect every required obligation before treating a stored pass as current.
 * The hook does not need a browser, a provider, or a new approval to verify this.
 * @param {string} project @param {import("./types.js").ProjectConfig} config */
export async function storedEvidenceProblem(project, config) {
  const cache = await readCache(project);
  if (!cache.report) return cache.reason;
  const report = cache.report;
  const states = [...reviewStates(config)].map(configuredStateKey).sort();
  const providers = (config.sourceChecks ?? [])
    .filter((provider) => provider.enabled !== false)
    .map((provider) => provider.id)
    .sort();
  if (
    digest(states) !== digest(report.pages.map(stateKey).sort()) ||
    digest(providers) !==
      digest(
        (report.sourceChecks ?? []).map((result) => result.provider.id).sort(),
      ) ||
    digest(states) !==
      digest(report.measurements.pages.map((record) => record.key).sort()) ||
    digest(providers) !==
      digest(
        report.measurements.sourceChecks.map((record) => record.key).sort(),
      )
  )
    return "The stored run does not cover all current browser and source-provider obligations.";
  for (const page of report.pages) {
    const record = report.measurements.pages.find(
      (entry) => entry.key === stateKey(page),
    );
    const problem = await pageProblem(
      page,
      record,
      cache.directory,
      config.evidenceReuse?.maxAgeMs,
    );
    if (problem) return problem;
  }
  for (const record of report.measurements.sourceChecks) {
    const problem = ageProblem(record.evidence, config.evidenceReuse?.maxAgeMs);
    if (problem) return problem;
  }
  return null;
}

/** Compile explicit input ownership, dependency fan-out, and conservative global
 * fallbacks. All configured obligations remain in the plan, including unowned ones.
 * @param {string} project @param {string} globalDir
 * @param {import("./types.js").ContractSnapshot} contract
 * @param {boolean} [incremental]
 * @param {Awaited<ReturnType<typeof resolveSourceScope>>} [resolved] */
export async function executionPlan(
  project,
  globalDir,
  contract,
  incremental = false,
  resolved,
) {
  const { config, projectDocuments = [] } = contract;
  const definitions = config.reviewScopes ?? [];
  const source = resolved ?? (await resolveSourceScope(project, config));
  const cache = await readCache(project);
  const fileHashes = new Map();
  for (const { path: file } of source.files)
    fileHashes.set(file, await fileDigest(path.join(project, file)));
  const executable = browserExecutable();
  let browserHash;
  try {
    browserHash = await fileDigest(executable);
  } catch {
    browserHash = null;
  }
  const providerHashes = new Map();
  let installed;
  for (const provider of source.providers.filter(
    (entry) => entry.enabled && entry.inputs === "conservative",
  )) {
    try {
      installed ??= await installedImpeccable();
    } catch (error) {
      installed = { unavailable: error.message };
    }
    providerHashes.set(
      provider.id,
      digest({
        installed,
        context: await impeccableContextFingerprint(
          source.providerContexts.get(provider.id) ?? new Set(),
        ),
      }),
    );
  }
  const direct = new Map(
    definitions.map((scope) => {
      const scopePaths = pathSelection(scope.sourcePaths);
      const providerFiles = new Set(
        source.providers
          .filter((provider) => scope.sourceChecks?.includes(provider.id))
          .flatMap((provider) => provider.files),
      );
      const documents = projectDocuments
        .filter((document) => ownsDocument(scope, document.path))
        .map((document) => document.path);
      return [
        scope.name,
        {
          files: [...fileHashes.keys()].filter(
            (file) =>
              selected(file, scopePaths, true) ||
              providerFiles.has(file) ||
              documents.includes(file),
          ),
          documents,
        },
      ];
    }),
  );
  const globalInputs = [...fileHashes.keys()].filter(
    (file) => ![...direct.values()].some((scope) => scope.files.includes(file)),
  );
  const globalDocuments = projectDocuments.filter(
    (document) =>
      ["DESIGN.md", "STYLE.md"].includes(document.path) ||
      ![...direct.values()].some((scope) =>
        scope.documents.includes(document.path),
      ),
  );
  const common = digest({
    config,
    rules: contract.rules,
    policy: contract.policySHA256,
    engine: await engineFingerprint(),
    platform: [process.platform, process.arch, process.versions.node],
    browser: [executable, browserHash],
    preferences: await fileDigest(path.join(globalDir, "preferences.json")),
    globalInputs: globalInputs.map((file) => [file, fileHashes.get(file)]),
    globalDocuments: globalDocuments.map((document) => [
      document.path,
      document.sha256,
    ]),
  });
  /** @type {import("./types.js").ScopeStatus[]} */
  const scopes = definitions.map((scope) => {
    const dependencies = dependencyNames(scope.name, definitions);
    const inputs = [
      ...new Set(dependencies.flatMap((name) => direct.get(name).files)),
    ].sort();
    const documents = [
      ...new Set(dependencies.flatMap((name) => direct.get(name).documents)),
    ].sort();
    const providers = [
      ...new Set(
        dependencies.flatMap(
          (name) =>
            definitions.find((entry) => entry.name === name).sourceChecks ?? [],
        ),
      ),
    ].sort();
    const fingerprint = digest({
      common,
      dependencies,
      inputs: inputs.map((file) => [file, fileHashes.get(file)]),
      documents: documents.map((file) => [
        file,
        projectDocuments.find((document) => document.path === file).sha256,
      ]),
      providers: providers.map((id) => [
        id,
        providerHashes.get(id) ?? "unknown",
      ]),
    });
    const unknown = !config.evidenceReuse
      ? "Reuse requires evidenceReuse.environmentKey and maxAgeMs."
      : !browserHash &&
          dependencies.some(
            (name) => definitions.find((entry) => entry.name === name).pages,
          )
        ? "The browser executable identity is unavailable."
        : providers.some(
              (id) =>
                source.providers.find((provider) => provider.id === id)
                  .inputs === "unknown",
            )
          ? "An external source provider has unknown input dependencies."
          : providers.length && installed?.unavailable
            ? installed.unavailable
            : null;
    const previous = cache.report?.execution?.scopes.find(
      (entry) => entry.name === scope.name,
    );
    return {
      name: scope.name,
      fingerprint,
      dependsOn: dependencies.filter((name) => name !== scope.name),
      inputs,
      documents,
      status: unknown
        ? "unknown"
        : previous?.fingerprint === fingerprint
          ? "reusable"
          : "dirty",
      reason:
        unknown ??
        (previous?.fingerprint === fingerprint
          ? "Declared inputs and validity conditions are unchanged."
          : (cache.reason ??
            "Inputs, dependencies, policy, or configuration changed.")),
    };
  });
  const units = [];
  for (const state of reviewStates(config))
    units.push({
      kind: "page",
      key: configuredStateKey(state),
      scopes: definitions
        .filter((scope) =>
          ownsState(scope, state.page.name, state.viewport.name),
        )
        .map((scope) => scope.name),
    });
  for (const provider of source.providers.filter((entry) => entry.enabled))
    units.push({
      kind: "provider",
      key: provider.id,
      scopes: definitions
        .filter((scope) => scope.sourceChecks?.includes(provider.id))
        .map((scope) => scope.name),
    });
  const invalid = new Map();
  for (const unit of units) {
    unit.fingerprint = digest([
      unit.kind,
      unit.key,
      common,
      unit.scopes
        .map((name) => [
          name,
          scopes.find((scope) => scope.name === name).fingerprint,
        ])
        .sort(),
    ]);
    const records =
      unit.kind === "page"
        ? cache.report?.measurements?.pages
        : cache.report?.measurements?.sourceChecks;
    const record = records?.find((entry) => entry.key === unit.key);
    let problem =
      !record || record.fingerprint !== unit.fingerprint
        ? "No matching prior measurements."
        : null;
    if (!problem && unit.kind === "page")
      problem = await pageProblem(
        cache.report.pages.find((page) => stateKey(page) === unit.key),
        record,
        cache.directory,
        config.evidenceReuse?.maxAgeMs,
      );
    if (!problem && unit.kind === "provider") {
      if (
        !cache.report.sourceChecks?.some(
          (result) => result.provider.id === unit.key,
        )
      )
        problem = "Source-provider evidence is missing.";
      else
        problem = ageProblem(record.evidence, config.evidenceReuse?.maxAgeMs);
    }
    unit.problem = problem;
    if (problem) for (const name of unit.scopes) invalid.set(name, problem);
  }
  for (const scope of scopes) {
    const invalidDependency = [scope.name, ...scope.dependsOn].find((name) =>
      invalid.has(name),
    );
    if (scope.status === "reusable" && invalidDependency) {
      scope.status = "dirty";
      scope.reason = invalid.get(invalidDependency);
    }
  }
  const planned = units.map((unit) => {
    const blocked = unit.scopes
      .map((name) => scopes.find((scope) => scope.name === name))
      .find((scope) => scope.status !== "reusable");
    const reason = !incremental
      ? "Full review requested."
      : !unit.scopes.length
        ? "Unassigned obligation; execute conservatively."
        : (blocked?.reason ?? unit.problem);
    return {
      ...unit,
      action: reason ? "run" : "reuse",
      reason:
        reason ??
        "Reuse verified evidence with unchanged declared dependencies.",
    };
  });
  return {
    mode: incremental ? "incremental" : "full",
    scopes,
    units: planned,
    globalInputs,
    globalDocuments: globalDocuments.map((document) => document.path),
    cache,
    executable,
  };
}

/** @param {Awaited<ReturnType<typeof executionPlan>>} plan
 * @returns {import("./types.js").ExecutionSummary} */
export function executionSummary(plan) {
  const count = (kind) => {
    const units = plan.units.filter((unit) => unit.kind === kind);
    return {
      required: units.length,
      executed: units.filter((unit) => unit.action === "run").length,
      reused: units.filter((unit) => unit.action === "reuse").length,
    };
  };
  return {
    mode: plan.mode === "incremental" ? "incremental" : "full",
    scopes: plan.scopes,
    browser: count("page"),
    sourceChecks: count("provider"),
  };
}

/** Copy verified evidence into a self-contained current run. Recheck the copied
 * bytes so a concurrent artifact change cannot be re-signed as valid evidence. */
export async function reusePage(plan, key, directory, index) {
  const cached = plan.cache.report;
  const result = structuredClone(
    cached.pages.find((page) => stateKey(page) === key),
  );
  const record = cached.measurements.pages.find((entry) => entry.key === key);
  result.findings = structuredClone(record.rawFindings);
  delete result.designCoverage;
  const names = new Map(
    artifactNames(result).map((file, i) => [
      file,
      i ? `capture-${index}-detail-${i}.png` : `capture-${index}.png`,
    ]),
  );
  for (const [before, after] of names) {
    await copyFile(
      path.join(plan.cache.directory, before),
      path.join(directory, after),
    );
    if ((await artifactDigest(directory, after)) !== record.artifacts[before])
      throw new Error(`Evidence changed during reuse: ${before}`);
  }
  result.screenshot = names.get(result.screenshot);
  for (const tile of result.details.tiles) tile.file = names.get(tile.file);
  result.evidence = {
    ...record.evidence,
    kind: "reused",
    reusedFrom: cached.id,
  };
  return result;
}
export function reuseProvider(plan, id) {
  const result = structuredClone(
    plan.cache.report.sourceChecks.find((entry) => entry.provider.id === id),
  );
  const record = plan.cache.report.measurements.sourceChecks.find(
    (entry) => entry.key === id,
  );
  result.evidence = {
    ...record.evidence,
    kind: "reused",
    reusedFrom: plan.cache.report.id,
  };
  return result;
}

/** Save local findings BEFORE aggregate design evaluation. Cross-page and cross-
 * viewport constraints are recomputed over the full fresh/reused union each run. */
/** @returns {Promise<NonNullable<import("./types.js").ReviewReport["measurements"]>>} */
export async function captureManifest(report, plan, directory) {
  const pages = [];
  for (const page of report.pages) {
    const key = stateKey(page);
    const unit = plan.units.find(
      (entry) => entry.kind === "page" && entry.key === key,
    );
    if (!unit || !page.evidence) continue;
    const artifacts = {};
    for (const file of artifactNames(page).filter(Boolean)) {
      try {
        artifacts[file] = await artifactDigest(directory, file);
      } catch (error) {
        page.findings.push({
          rule: "evidence-integrity",
          severity: "error",
          message: error.message,
        });
      }
    }
    pages.push({
      key,
      fingerprint: unit.fingerprint,
      evidence: page.evidence,
      rawFindings: structuredClone(page.findings),
      artifacts,
    });
  }
  return {
    version: 1,
    pages,
    sourceChecks: report.sourceChecks.map((result) => ({
      key: result.provider.id,
      fingerprint: plan.units.find(
        (unit) => unit.kind === "provider" && unit.key === result.provider.id,
      ).fingerprint,
      evidence: result.evidence,
    })),
  };
}

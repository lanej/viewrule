import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { loadProject, readJSON } from "./config.mjs";
import { readDesignPolicy } from "./design.mjs";

// Object key order is formatting, not a change to a design boundary.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const same = (a, b) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Read the effective constraints before opening a browser or changing application code.
 * @param {string} project
 * @param {string} globalDir */
export async function readContract(project, globalDir) {
  project = await realpath(project);
  const { config, rules } = await loadProject(project, globalDir);
  const policy = await readDesignPolicy();
  const snapshot = {
    config,
    rules: [...rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    policySHA256: policy.sha256,
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(canonical(snapshot)))
    .digest("hex");
  const latest = await readJSON(
    path.join(project, ".ui-review/latest.json"),
    null,
  );
  let previous;
  if (latest?.reportFile) {
    const file = path.resolve(latest.reportFile);
    const runs = path.resolve(project, ".ui-review/runs") + path.sep;
    if (!file.startsWith(runs) || path.basename(file) !== "report.json")
      throw new Error(
        "Previous report must be inside this project's review runs",
      );
    previous = await readJSON(file, null);
  }
  const baseline = previous?.contract;
  const changes = [];
  if (baseline) {
    const before = new Map(baseline.rules.map((rule) => [rule.id, rule]));
    const after = new Map(snapshot.rules.map((rule) => [rule.id, rule]));
    for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
      if (same(before.get(id), after.get(id))) continue;
      changes.push({
        id,
        kind: !before.has(id)
          ? "added"
          : !after.has(id)
            ? "removed"
            : "modified",
        before: before.get(id) ?? null,
        after: after.get(id) ?? null,
      });
    }
  }
  return {
    version: 1,
    hash,
    ...snapshot,
    comparison: baseline ? "available" : latest ? "unavailable" : "initial",
    previousReportId: previous?.id ?? null,
    previousReportFile: latest?.reportFile ?? null,
    changes,
    configurationChange:
      baseline && !same(baseline.config, config)
        ? { before: baseline.config, after: config }
        : null,
    policyChanged: baseline ? baseline.policySHA256 !== policy.sha256 : false,
  };
}

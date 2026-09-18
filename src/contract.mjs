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

/** Reject scaffolds, not design judgments. Front matter and fenced code do not
 * explain UI intent. No required headings, token schema, or prose-length score.
 * @param {import("./types.js").ProjectDocument[]} documents */
function validateAuthoredDesign(documents) {
  for (const document of documents.filter((entry) => entry.role === "design")) {
    const lines = document.content
      .replace(/^\uFEFF/, "")
      .replace(/<!--(?:[\s\S]*?-->|[\s\S]*$)/g, (comment) =>
        comment === "<!-- viewrule:design-template -->" ? comment : "",
      )
      .split(/\r?\n/);
    let frontmatter = lines[0]?.trim() === "---";
    let fence = "";
    const body = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (frontmatter) {
        if (index > 0 && /^(---|\.\.\.)\s*$/.test(line)) frontmatter = false;
        continue;
      }
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = "";
        continue;
      }
      if (!fence) body.push(line);
    }
    const visible = body.join("\n");
    const prose = visible
      .replace(/<!--(?:[\s\S]*?-->|[\s\S]*$)/g, "")
      .split("\n")
      .filter((line, index, all) => {
        const text = line.trim();
        return (
          text &&
          !/^#{1,6}(?:\s|$)/.test(text) &&
          !/^(?:[-*_]\s*){3,}$|^=+$/.test(text) &&
          !/^\s*(?:=+|-+)\s*$/.test(all[index + 1] ?? "") &&
          !/^(?:[-*+>]\s*)?(?:TODO|TBD)[.!:]?$/i.test(text)
        );
      })
      .join("\n");
    if (
      /^\s*<!-- viewrule:design-template -->\s*$/m.test(visible) ||
      /\[TODO:[^\]]*\]/i.test(prose)
    )
      throw new Error(
        `Design contract ${document.path} is still a template. Author its decisions and remove the template marker and [TODO: ...] prompts; use /viewrule:design or docs/project-documents.md.`,
      );
    if (!prose.trim())
      throw new Error(
        `Design contract ${document.path} has no authored prose. Record UI intent and verification expectations; headings, comments, front matter, and fenced code alone are not a design contract.`,
      );
  }
}

/** Read the effective constraints before opening a browser or changing application code.
 * @param {string} project
 * @param {string} globalDir */
export async function readContract(project, globalDir) {
  project = await realpath(project);
  const { config, rules, projectDocuments } = await loadProject(
    project,
    globalDir,
  );
  // Explicit documents opt in. Legacy optional discovery is not silently migrated.
  // guidance remains readable while authoring; check calls this before any writes.
  if (
    config.projectDocuments !== undefined ||
    config.reviewScopes?.some((scope) => scope.requiredDocuments?.length)
  )
    validateAuthoredDesign(projectDocuments);
  const policy = await readDesignPolicy();
  const snapshot = {
    config,
    rules: [...rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    policySHA256: policy.sha256,
    projectDocuments,
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
  return {
    version: 1,
    hash,
    ...snapshot,
    ...compareContracts(snapshot, previous?.contract),
    comparison: previous?.contract
      ? "available"
      : latest
        ? "unavailable"
        : "initial",
    previousReportId: previous?.id ?? null,
    previousReportFile: latest?.reportFile ?? null,
  };
}

/** Compare explicit snapshots without changing the CLI's latest-run baseline.
 * @param {import("./types.js").ContractSnapshot} snapshot
 * @param {import("./types.js").ContractSnapshot} [baseline] */
export function compareContracts(snapshot, baseline) {
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
  const documentComparison = !baseline
    ? "initial"
    : Array.isArray(baseline.projectDocuments)
      ? "available"
      : "unavailable";
  const documentChanges = [];
  if (documentComparison === "available") {
    /** @type {Map<string, import("./types.js").ProjectDocument>} */
    const before = new Map(
      baseline.projectDocuments.map((document) => [document.path, document]),
    );
    const after = new Map(
      (snapshot.projectDocuments ?? []).map((document) => [
        document.path,
        document,
      ]),
    );
    for (const file of [
      ...new Set([...before.keys(), ...after.keys()]),
    ].sort()) {
      const old = before.get(file);
      const current = after.get(file);
      if (old?.sha256 === current?.sha256) continue;
      documentChanges.push({
        path: file,
        kind: !old ? "added" : !current ? "removed" : "modified",
        beforeSHA256: old?.sha256 ?? null,
        afterSHA256: current?.sha256 ?? null,
        before: old?.content ?? null,
        after: current?.content ?? null,
      });
    }
  }
  return {
    comparison: baseline ? "available" : "unavailable",
    changes,
    documentComparison,
    documentChanges,
    configurationChange:
      baseline && !same(baseline.config, snapshot.config)
        ? { before: baseline.config, after: snapshot.config }
        : null,
    policyChanged: baseline
      ? baseline.policySHA256 !== snapshot.policySHA256
      : false,
  };
}

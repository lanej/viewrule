import { createHash } from "node:crypto";

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function pageKey(page) {
  return [
    page.name,
    page.checkpoint ?? "",
    page.viewport?.name ?? "",
    page.viewport?.width ?? "",
    page.viewport?.height ?? "",
  ].join("|");
}

/** Stable identity intentionally excludes message, severity, actual, and expected so
 * wording/evidence changes do not manufacture a new violation.
 * @param {import("./types.js").Finding} finding
 * @param {import("./types.js").PageResult} page */
export function findingIdentity(finding, page) {
  const scope = [
    pageKey(page),
    finding.rule,
    finding.selector ?? finding.element ?? "",
    (finding.designRules ?? []).join(","),
  ].join("|");
  return `finding:${hash(scope)}`;
}

function flatten(report) {
  return report.pages.flatMap((page) =>
    page.findings.map((finding) => ({
      id: finding.identity ?? findingIdentity(finding, page),
      page: page.name,
      checkpoint: page.checkpoint ?? null,
      viewport: page.viewport,
      finding,
    })),
  );
}

/** @param {import("./types.js").ReviewReport} report
 * @param {import("./types.js").ReviewReport | undefined} baseline */
export function classifyChanges(report, baseline) {
  for (const page of report.pages)
    for (const finding of page.findings)
      finding.identity = findingIdentity(finding, page);

  if (!baseline)
    return {
      comparison: "unavailable",
      baselineId: null,
      newFindings: flatten(report),
      persistentFindings: [],
      resolvedFindings: [],
      newlyUnassessed: [],
    };

  const current = flatten(report);
  const previous = flatten(baseline);
  const currentIds = new Set(current.map((entry) => entry.id));
  const previousIds = new Set(previous.map((entry) => entry.id));
  const currentCoverage = new Set(
    report.pages.flatMap((page) =>
      (page.designCoverage ?? [])
        .filter((rule) => rule.status === "unassessed")
        .map((rule) => `${pageKey(page)}|${rule.id}`),
    ),
  );
  const previousCoverage = new Set(
    baseline.pages.flatMap((page) =>
      (page.designCoverage ?? [])
        .filter((rule) => rule.status === "unassessed")
        .map((rule) => `${pageKey(page)}|${rule.id}`),
    ),
  );

  return {
    comparison: "available",
    baselineId: baseline.id,
    newFindings: current.filter((entry) => !previousIds.has(entry.id)),
    persistentFindings: current.filter((entry) => previousIds.has(entry.id)),
    resolvedFindings: previous.filter((entry) => !currentIds.has(entry.id)),
    newlyUnassessed: [...currentCoverage]
      .filter((id) => !previousCoverage.has(id))
      .map((id) => ({ id, designRule: id.split("|").at(-1) })),
  };
}

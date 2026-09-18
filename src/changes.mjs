import { createHash } from "node:crypto";
import { compareContracts } from "./contract.mjs";

function identity(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

/** @param {Pick<import("./types.js").PageResult, "name" | "checkpoint" | "viewport">} page */
function pageKey(page) {
  return [
    page.name,
    page.checkpoint ?? null,
    page.viewport?.name ?? null,
    page.viewport?.width ?? null,
    page.viewport?.height ?? null,
  ];
}

/** Wording, severity, and measured values do not define finding identity.
 * Occurrences retain multiplicity when the detector cannot distinguish siblings.
 * @param {import("./types.js").ReviewReport} report
 * @returns {import("./types.js").FindingChange[]} */
function flatten(report) {
  const entries = report.pages.flatMap((page) =>
    page.findings.map((finding) => ({
      page: page.name,
      checkpoint: page.checkpoint ?? null,
      viewport: page.viewport,
      finding,
    })),
  );
  for (const result of report.sourceChecks ?? []) {
    for (const finding of result.findings)
      entries.push({
        page: `Source: ${result.provider.id}`,
        checkpoint: null,
        viewport: null,
        finding,
      });
  }
  const occurrences = new Map();
  return entries.map((entry) => {
    const { finding } = entry;
    const key = identity([
      pageKey({ name: entry.page, ...entry }),
      finding.rule,
      finding.selector ?? null,
      finding.element ?? null,
      [...(finding.designRules ?? [])].sort(),
      finding.sourceCheck?.provider ?? null,
    ]);
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);
    return { ...entry, id: `finding:${key}:${occurrence}` };
  });
}

/** @param {import("./types.js").FindingChange} entry
 * @param {import("./types.js").ReviewReport} report
 * @param {ReturnType<typeof compareContracts>} contract
 * @param {import("./types.js").ReviewReport} baseline */
function comparisonGap(entry, report, contract, baseline) {
  if (contract.comparison !== "available")
    return "The approved contract is unavailable.";
  if (contract.configurationChange || contract.policyChanged)
    return "Review configuration or design policy changed.";
  if (contract.changes.some((change) => change.id === entry.finding.rule))
    return "The governing rule changed or was removed.";
  if (
    report.pages.some((page) =>
      page.findings.some((finding) => finding.rule === "source-changed"),
    )
  )
    return "Source changed during capture.";
  const provider = entry.finding.sourceCheck?.provider;
  const predatesBaseline = (evidence) =>
    evidence?.kind === "reused" &&
    Date.parse(evidence.createdAt) < Date.parse(baseline.createdAt);
  if (provider) {
    const result = report.sourceChecks?.find(
      (result) => result.provider.id === provider,
    );
    if (!result) return "The source provider has no evidence.";
    return predatesBaseline(result.evidence)
      ? "Reused source evidence predates the approved baseline."
      : null;
  }
  const page = report.pages.find(
    (candidate) =>
      identity(pageKey(candidate)) ===
      identity(pageKey({ name: entry.page, ...entry })),
  );
  if (!page) return "The page, checkpoint, or viewport was not reviewed.";
  if (predatesBaseline(page.evidence))
    return "Reused page evidence predates the approved baseline.";
  if (
    !page.coverage ||
    page.findings.some((finding) =>
      ["review-error", "browser-error"].includes(finding.rule),
    )
  )
    return "The state could not be inspected completely.";
  if (entry.finding.rule.startsWith("axe:"))
    return page.coverage.accessibility
      ? null
      : "Accessibility checks were not run.";
  const rule = report.contract.rules.find(
    (candidate) => candidate.id === entry.finding.rule,
  );
  if (
    rule &&
    !page.metrics?.evaluations.some(
      (evaluation) =>
        evaluation.rule === rule.id && evaluation.status === "checked",
    )
  )
    return "The rule no longer has assessed evidence in this state.";
  return null;
}

/** @param {import("./types.js").ReviewReport} report
 * @param {import("./types.js").ReviewReport} [baseline]
 * @returns {import("./types.js").ReviewChanges} */
export function classifyChanges(report, baseline) {
  const current = flatten(report);
  for (const entry of current) entry.finding.identity = entry.id;
  const contract = compareContracts(report.contract, baseline?.contract);
  if (!baseline)
    return {
      comparison: "unavailable",
      baselineId: null,
      contract,
      newFindings: current,
      persistentFindings: [],
      resolvedFindings: [],
      notComparedFindings: [],
      newlyUnassessed: [],
    };
  const previous = flatten(baseline);
  const currentIds = new Set(current.map((entry) => entry.id));
  const previousIds = new Set(previous.map((entry) => entry.id));
  const resolvedFindings = [],
    notComparedFindings = [];
  for (const entry of previous.filter((entry) => !currentIds.has(entry.id))) {
    const reason = comparisonGap(entry, report, contract, baseline);
    if (reason) notComparedFindings.push({ ...entry, reason });
    else resolvedFindings.push(entry);
  }
  const previousCoverage = new Map(
    baseline.pages.flatMap((page) =>
      (page.designCoverage ?? []).map((rule) => [
        identity([pageKey(page), rule.id]),
        rule.status,
      ]),
    ),
  );
  const newlyUnassessed = report.pages.flatMap((page) =>
    (page.designCoverage ?? [])
      .filter(
        (rule) =>
          rule.status === "unassessed" &&
          previousCoverage.has(identity([pageKey(page), rule.id])) &&
          previousCoverage.get(identity([pageKey(page), rule.id])) !==
            "unassessed",
      )
      .map((rule) => ({
        id: `coverage:${identity([pageKey(page), rule.id])}`,
        designRule: rule.id,
        page: page.name,
        checkpoint: page.checkpoint ?? null,
        viewport: page.viewport,
      })),
  );
  return {
    comparison: "available",
    baselineId: baseline.id,
    contract,
    newFindings: current.filter((entry) => !previousIds.has(entry.id)),
    persistentFindings: current.filter((entry) => previousIds.has(entry.id)),
    resolvedFindings,
    notComparedFindings,
    newlyUnassessed,
  };
}

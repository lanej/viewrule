import { readFileSync } from "node:fs";
import Mustache from "mustache";
import { documentSource } from "./project-documents.mjs";

/** @param {string} name */
const template = (name) =>
  readFileSync(new URL(`./templates/${name}.html`, import.meta.url), "utf8");
const reportTemplate = template("report");
const pageTemplate = template("page");
const policyTemplate = template("design-rules");
const documentsTemplate = template("project-documents");

/** @param {import("./types.js").DesignPolicy} policy */
export function renderDesignPolicy(policy) {
  const rules = policy.rules.map((rule) => ({
    ...rule,
    bodyHtml: Mustache.escape(rule.body)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>"),
  }));
  return Mustache.render(policyTemplate, { ...policy, rules });
}

/** Preserve literal source text. Markdown, HTML, and YAML are never executed.
 * @param {import("./types.js").ProjectDocument[]} documents */
export function renderProjectDocuments(documents) {
  return Mustache.render(documentsTemplate, {
    hasDocuments: documents.length > 0,
    documents: documents.map((document, index) => ({
      ...document,
      anchor: `document-${index + 1}`,
      lines: document.content.split(/\r?\n/).map((text, line) => ({
        text,
        number: line + 1,
        id: `document-${index + 1}-L${line + 1}`,
      })),
    })),
  });
}

function stateName(entry) {
  return `${entry.page}${entry.checkpoint ? ` · ${entry.checkpoint}` : ""}${entry.viewport ? ` · ${entry.viewport.name} (${entry.viewport.width}×${entry.viewport.height})` : ""}`;
}

/** @param {import("./types.js").FindingChange} entry */
function changeView(entry) {
  return {
    ...entry,
    state: stateName(entry),
    rule: entry.finding.rule,
    severity: entry.finding.severity,
    message: entry.finding.message,
    selector: [entry.finding.selector, entry.finding.element]
      .filter(Boolean)
      .join(" · "),
    authority: entry.finding.sourceCheck?.authority ?? "rendered",
  };
}

/** @param {import("./types.js").PageResult} page
 * @param {import("./types.js").Reference} reference
 * @param {import("./types.js").ProjectDocument[]} documents */
function pageView(page, reference, documents) {
  const approved = reference?.report.pages.find(
    (candidate) =>
      candidate.name === page.name &&
      candidate.checkpoint === page.checkpoint &&
      candidate.viewport.name === page.viewport.name &&
      candidate.viewport.width === page.viewport.width &&
      candidate.viewport.height === page.viewport.height,
  );
  const density = (page.metrics?.density ?? []).map((region) => ({
    ...region,
    coveragePercent: (region.coverage * 100).toFixed(1),
    elementRate: region.elementsPer100kPixels.toFixed(1),
    verticalGap: region.largestVerticalGap.toFixed(1),
  }));
  const composition = (page.metrics?.composition ?? []).map((measurement) => ({
    ...measurement,
    evidence: JSON.stringify(measurement, null, 2),
  }));
  const growth = (page.metrics?.growth ?? []).map((measurement) => ({
    ...measurement,
    count: measurement.keys.length,
    areaLabel: measurement.area.toFixed(0),
    comparisonStatus: measurement.comparison?.status ?? "unassessed",
    yieldLabel:
      measurement.comparison?.yield == null
        ? "—"
        : measurement.comparison.yield.toFixed(3),
    evidence: JSON.stringify(measurement, null, 2),
  }));
  const peerInference = (page.metrics?.peerInference ?? []).map(
    (candidate) => ({
      ...candidate,
      residualLabel: candidate.maxResidual.toFixed(1),
      thresholdLabel: candidate.discoveryThreshold.toFixed(1),
      evidence: JSON.stringify(candidate, null, 2),
    }),
  );
  return {
    ...page,
    captureLabel:
      page.evidence?.kind === "reused" ? "Reused capture" : "Current capture",
    stateName: page.checkpoint
      ? `${page.name} · ${page.checkpoint}`
      : page.name,
    approved: approved?.screenshot
      ? { ...approved, note: reference.note }
      : null,
    hasDesignCoverage: Boolean(page.designCoverage),
    unassessedCount: page.designCoverage?.filter(
      (rule) => rule.status === "unassessed",
    ).length,
    designCoverage: page.designCoverage?.map((rule) => ({
      ...rule,
      checkNames: rule.checks.join(", "),
    })),
    hasDensity: density.length > 0,
    density,
    hasComposition: composition.length > 0,
    composition,
    hasGrowth: growth.length > 0,
    growth,
    hasPeerInference: peerInference.length > 0,
    peerInferenceCount: peerInference.length,
    peerInference,
    hasFindings: page.findings.length > 0,
    findings: page.findings.map((finding) => ({
      ...finding,
      citations: (finding.designRules ?? []).map((id, index, ids) => ({
        id,
        separator: index < ids.length - 1 ? ", " : "",
      })),
      sourceCitations: (finding.sources ?? []).map((source) =>
        documentSource(source, documents),
      ),
      evidence: JSON.stringify({
        actual: finding.actual,
        expected: finding.expected,
      }),
    })),
  };
}

/** @param {import("./types.js").ReviewReport} report
 * @param {(string | { note: string })[]} preferences
 * @param {import("./types.js").Reference} [reference] */
export function renderReport(report, preferences, reference) {
  const documents = report.contract?.projectDocuments ?? [];
  const changes = report.changes;
  const contract =
    changes?.comparison === "available"
      ? {
          ...report.contract,
          ...changes.contract,
          previousReportId: changes.baselineId,
        }
      : report.contract;
  return Mustache.render(
    reportTemplate,
    {
      ...report,
      contract,
      captureCount: report.pages.length,
      evidenceChanges:
        changes?.evidence?.map((entry) => ({
          ...entry,
          state: stateName(entry),
        })) ?? [],
      hasEvidenceChanges: Boolean(changes?.evidence?.length),
      changedCaptureCount:
        changes?.evidence?.filter((entry) => entry.status === "changed")
          .length ?? 0,
      hasChangeBaseline: changes?.comparison === "available",
      noChangeBaseline: changes?.comparison !== "available",
      newFindingCount: changes?.newFindings.length ?? 0,
      persistentFindingCount: changes?.persistentFindings.length ?? 0,
      resolvedFindingCount: changes?.resolvedFindings.length ?? 0,
      newlyUnassessedCount: changes?.newlyUnassessed.length ?? 0,
      notComparedCount: changes?.notComparedFindings.length ?? 0,
      hasNotComparedFindings: Boolean(changes?.notComparedFindings.length),
      notComparedFindings: changes?.notComparedFindings.map(changeView) ?? [],
      hasNewFindings: Boolean(changes?.newFindings.length),
      hasPersistentFindings: Boolean(changes?.persistentFindings.length),
      persistentFindings: changes?.persistentFindings.map(changeView) ?? [],
      hasResolvedFindings: Boolean(changes?.resolvedFindings.length),
      hasNewlyUnassessed: Boolean(changes?.newlyUnassessed.length),
      newFindings: changes?.newFindings.map(changeView) ?? [],
      resolvedFindings: changes?.resolvedFindings.map(changeView) ?? [],
      newlyUnassessed:
        changes?.newlyUnassessed.map((entry) => ({
          ...entry,
          state: stateName(entry),
        })) ?? [],
      hasContract: Boolean(report.contract),
      contractBaselineAvailable: contract?.comparison === "available",
      contractChanges: contract?.changes.map((change) => ({
        ...change,
        beforeJSON: JSON.stringify(change.before),
        afterJSON: JSON.stringify(change.after),
      })),
      hasContractChanges: Boolean(contract?.changes.length),
      configurationChangeJSON: contract?.configurationChange
        ? JSON.stringify(contract.configurationChange)
        : "",
      hasProjectDocuments: documents.length > 0,
      projectDocuments: documents.map((document, index) => ({
        ...document,
        href: `project-documents.html#document-${index + 1}`,
      })),
      documentBaselineUnavailable:
        contract?.documentComparison === "unavailable",
      documentChanges: contract?.documentChanges ?? [],
      hasDocumentChanges: Boolean(contract?.documentChanges?.length),
      hasPreferences: preferences.length > 0,
      preferences: preferences.map((entry) =>
        typeof entry === "string" ? entry : entry.note,
      ),
      pages: report.pages.map((page) => pageView(page, reference, documents)),
    },
    { page: pageTemplate },
  );
}

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
  return {
    ...page,
    stateName: page.checkpoint ? `${page.name} · ${page.checkpoint}` : page.name,
    approved: approved?.screenshot ? { ...approved, note: reference.note } : null,
    hasDesignCoverage: Boolean(page.designCoverage),
    unassessedCount: page.designCoverage?.filter((rule) => rule.status === "unassessed").length,
    designCoverage: page.designCoverage?.map((rule) => ({ ...rule, checkNames: rule.checks.join(", ") })),
    hasDensity: density.length > 0,
    density,
    hasFindings: page.findings.length > 0,
    findings: page.findings.map((finding) => ({
      ...finding,
      citations: (finding.designRules ?? []).map((id, index, ids) => ({ id, separator: index < ids.length - 1 ? ", " : "" })),
      sourceCitations: (finding.sources ?? []).map((source) => documentSource(source, documents)),
      evidence: JSON.stringify({ actual: finding.actual, expected: finding.expected }),
    })),
  };
}

/** @param {import("./types.js").ReviewReport} report
 * @param {(string | { note: string })[]} preferences
 * @param {import("./types.js").Reference} [reference] */
export function renderReport(report, preferences, reference) {
  const documents = report.contract?.projectDocuments ?? [];
  return Mustache.render(reportTemplate, {
    ...report,
    captureCount: report.pages.length,
    hasContract: Boolean(report.contract),
    contractBaselineAvailable: report.contract?.comparison === "available",
    contractChanges: report.contract?.changes.map((change) => ({ ...change, beforeJSON: JSON.stringify(change.before), afterJSON: JSON.stringify(change.after) })),
    hasContractChanges: Boolean(report.contract?.changes.length),
    configurationChangeJSON: report.contract?.configurationChange ? JSON.stringify(report.contract.configurationChange) : "",
    hasProjectDocuments: documents.length > 0,
    projectDocuments: documents.map((document, index) => ({ ...document, href: `project-documents.html#document-${index + 1}` })),
    documentBaselineUnavailable: report.contract?.documentComparison === "unavailable",
    documentChanges: report.contract?.documentChanges ?? [],
    hasDocumentChanges: Boolean(report.contract?.documentChanges?.length),
    hasPreferences: preferences.length > 0,
    preferences: preferences.map((entry) => (typeof entry === "string" ? entry : entry.note)),
    pages: report.pages.map((page) => pageView(page, reference, documents)),
  }, { page: pageTemplate });
}

import { readFileSync } from "node:fs";
import Mustache from "mustache";

/** @param {string} name */
const template = (name) =>
  readFileSync(new URL(`./templates/${name}.html`, import.meta.url), "utf8");
const reportTemplate = template("report");
const pageTemplate = template("page");
const policyTemplate = template("design-rules");

/** @param {import("./types.js").DesignPolicy} policy */
export function renderDesignPolicy(policy) {
  const rules = policy.rules.map((rule) => ({
    ...rule,
    // Escape source text first. Only these fixed formatting tags bypass Mustache escaping.
    bodyHtml: Mustache.escape(rule.body)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>"),
  }));
  return Mustache.render(policyTemplate, { ...policy, rules });
}

/** @param {import("./types.js").PageResult} page
 * @param {import("./types.js").Reference} [reference] */
function pageView(page, reference) {
  const approved = reference?.report.pages.find(
    (candidate) =>
      candidate.name === page.name &&
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
    hasFindings: page.findings.length > 0,
    findings: page.findings.map((finding) => ({
      ...finding,
      citations: (finding.designRules ?? []).map((id, index, ids) => ({
        id,
        separator: index < ids.length - 1 ? ", " : "",
      })),
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
  return Mustache.render(
    reportTemplate,
    {
      ...report,
      captureCount: report.pages.length,
      hasPreferences: preferences.length > 0,
      preferences: preferences.map((entry) =>
        typeof entry === "string" ? entry : entry.note,
      ),
      pages: report.pages.map((page) => pageView(page, reference)),
    },
    { page: pageTemplate },
  );
}

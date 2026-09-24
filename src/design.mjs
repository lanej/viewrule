import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { designRuleRegistry } from "./policy-ids.mjs";
import { ruleApplies } from "./scopes.mjs";

export const policyDirectory = path.resolve(
  import.meta.dirname,
  "../docs/design-rules",
);
export const policyPaths = Object.freeze(
  designRuleRegistry.map(({ file }) => path.join(policyDirectory, file)),
);
const defaults = {
  "within-bounds": ["DR-006", "DR-007"],
  "required-elements": ["DR-006"],
  "relative-position": ["DR-006", "DR-007"],
  "reading-column": ["DR-006", "DR-007"],
  "vertical-order": ["DR-006", "DR-007"],
  align: ["DR-006", "DR-017"],
  "alignment-residual": ["DR-017"],
  "gap-variance": ["DR-018"],
  "viewport-growth-yield": ["DR-007", "DR-019"],
  "chrome-allocation": ["DR-019"],
  "peer-footprint": ["DR-020"],
  "no-overlap": ["DR-006"],
  "no-clip": ["DR-006", "DR-007"],
  "visible-count": ["DR-006"],
  "comparison-set": ["DR-006", "DR-007"],
  context: ["DR-003"],
  consistent: ["DR-005"],
  "region-density": ["DR-007"],
  "repeated-metric": ["DR-007", "DR-008"],
  "evidence-proximity": ["DR-006"],
  "mark-contrast": ["DR-007", "DR-016"],
  "max-height": ["DR-008"],
  "min-size": ["DR-007"],
  "min-font-size": ["DR-007"],
  "max-text-gap": ["DR-006", "DR-007"],
};
const advice = {
  "within-bounds":
    "Reflow or resize the content and its declared container so labels remain inside the visible region. Preserve readable text and exact values.",
  "required-elements":
    "Restore the required text or visual in each component. Scope responsive alternatives explicitly; adding a text label cannot replace a missing graphic.",
  "relative-position":
    "Restore the declared peer relationship and spacing within each component. Reflow the layout while preserving readable text; grid and flex implementations may satisfy the same boundary.",
  "reading-column":
    "Center the declared content within its container and restore its bounded reading measure. Preserve readable type and use responsive gutters below the cap.",
  "vertical-order":
    "Restore the declared DOM and top-to-bottom order. Reflow supporting visuals after the prose and remove overlapping or multi-column positioning.",
  align: "Align the declared peers using their shared layout or spacing rules.",
  "alignment-residual":
    "Restore the declared peers' shared anchor. Separate intentionally different groups instead of forcing unrelated content onto one axis.",
  "gap-variance":
    "Restore consistent spacing between the declared equivalent peers. Scope different relationships separately and preserve readable content.",
  "viewport-growth-yield":
    "Use additional usable area to reveal distinct task evidence while preserving visible identities and readable type. For an exhausted finite task, declare its complete evidence set rather than manufacturing content.",
  "chrome-allocation":
    "Reduce the declared chrome allocation while preserving necessary navigation and controls. The application decides which space supports the task.",
  "peer-footprint":
    "Restore comparable footprint or type size among the declared equal-priority peers. Keep intentional differences scoped to their actual priority; symmetry is not required.",
  "no-overlap": "Reflow the affected peers so their content remains readable.",
  "no-clip":
    "Allow enough space for the full content or provide intentional local scrolling.",
  "visible-count":
    "Reduce excess spacing or reflow the comparison to reveal the required items.",
  "comparison-set":
    "Reflow the comparison to preserve the missing identities and expose the configured detail; retain readable type.",
  context:
    "Display the missing context from the underlying data beside the claim or in its shared heading.",
  consistent:
    "Correct the shared rendering configuration or identity mapping. Generate metadata from that configuration; do not change evidence alone.",
  attribute:
    "Correct the renderer or data mapping, then regenerate its metadata. Changing an annotation alone does not repair the display.",
  "region-density":
    "Use the available comparison area for useful evidence; check the detail tiles before changing spacing.",
  "repeated-metric":
    "Consolidate repeated summaries within this decision surface. Retain necessary context and stable metric identities; justified repetition needs an explicitly scoped contract.",
  "evidence-proximity":
    "Bring the declared evidence and decision text together by compacting intervening context. Preserve readable type and the map or chart detail needed for the task.",
  "mark-contrast":
    "Increase mark contrast against the actual substrate. Unsupported paint needs visual review or a supported solid treatment; changing an annotation alone is not a repair.",
  "max-height":
    "Reduce excess header or container height while preserving necessary controls and context.",
  "min-size":
    "Increase the control’s usable area while preserving readable text and separation. Review hit geometry and valid exceptions before treating the warning as an accessibility failure.",
  style: "Use the project's declared style values on the affected component.",
  "min-font-size":
    "Restore readable type, then reflow the content; do not shrink text to fit more items.",
  "max-text-gap":
    "Bound the comparison's columns or bring related values closer. Use extra space for useful detail or preserve it as whitespace outside the comparison.",
};
export const designIdsFor = (rule) =>
  rule.designRules ??
  defaults[rule.type] ??
  (rule.type === "style"
    ? [
        /font|line-height/.test(rule.property)
          ? "DR-007"
          : /shadow|border|background/.test(rule.property)
            ? "DR-008"
            : "DR-005",
      ]
    : []);

export async function readDesignPolicy() {
  const hash = createHash("sha256");
  const rules = [];
  for (const entry of designRuleRegistry) {
    const file = path.join(policyDirectory, entry.file);
    const source = await readFile(file, "utf8");
    const match = source.match(/^# (DR-\d{3}) — (.+)\n\n([\s\S]+)$/);
    if (!match)
      throw new Error(
        `Design-rule file ${entry.file} must start with '# ${entry.id} — <title>' and contain policy text`,
      );
    const [, id, title, body] = match;
    if (id !== entry.id)
      throw new Error(
        `Design-rule file ${entry.file} declares ${id}; expected ${entry.id}`,
      );
    hash.update(`${entry.file}\0`);
    hash.update(source);
    rules.push({
      id,
      title,
      enforcement: entry.enforcement,
      source: `docs/design-rules/${entry.file}`,
      body: body.trim(),
      href: `design-rules.html#${id}`,
    });
  }
  return {
    document: "docs/design-rules/",
    sha256: hash.digest("hex"),
    rules,
  };
}

// Compare observations from the same page/data state across captures. These
// checks validate DOM evidence and declared metadata, not chart data truth.
/** @param {import("./types.js").ReviewReport} report
 * @param {import("./types.js").Rule[]} rules
 * @param {import("./types.js").ProjectConfig} config */
export function evaluateDesign(report, rules, config) {
  const active = (rule, page) =>
    ruleApplies(rule, page.name, page.viewport.name);
  const add = (page, rule, message, actual, expected) =>
    page.findings.push({
      rule: rule.id,
      severity: rule.severity,
      selector: rule.selector,
      reason: rule.reason,
      message,
      actual,
      expected,
    });
  for (const rule of rules) {
    const pages = report.pages.filter((page) => active(rule, page));
    if (rule.type === "viewport-growth-yield") {
      for (const page of pages) {
        const snapshot = page.metrics?.growth?.find(
          (item) => item.rule === rule.id,
        );
        // Optional absence is still unassessed and never supplies a reference.
        if (!snapshot) continue;
        snapshot.comparison = {
          status: "unassessed",
          referenceViewport: rule.referenceViewport,
        };
        const unassessed = (message, actual) => {
          snapshot.comparison.reason = message;
          const evaluation = page.metrics.evaluations.find(
            (item) => item.rule === rule.id,
          );
          if (evaluation) evaluation.status = "unassessed";
          add(
            page,
            rule,
            message,
            actual,
            "comparable visible evidence and strictly growing usable area",
          );
        };
        if (!snapshot.valid) continue; // Local finding explains invalid evidence.
        // Aggregate comparisons may have marked reused evidence unassessed in
        // the prior run. Recompute coverage from the retained local observation.
        const evaluation = page.metrics.evaluations.find(
          (item) => item.rule === rule.id,
        );
        if (evaluation) evaluation.status = "checked";
        if (page.viewport.name === rule.referenceViewport) {
          snapshot.comparison.status = "reference";
          continue;
        }
        const baseline = pages.find(
          (candidate) =>
            candidate.name === page.name &&
            candidate.checkpoint === page.checkpoint &&
            candidate.viewport.name === rule.referenceViewport,
        );
        const previous = baseline?.metrics?.growth?.find(
          (item) => item.rule === rule.id,
        );
        if (!previous?.valid || !previous.area || !previous.keys.length) {
          unassessed(
            "Viewport-growth yield is unassessed: reference evidence is missing or invalid for this page and checkpoint.",
            {
              referenceViewport: rule.referenceViewport,
              checkpoint: page.checkpoint ?? null,
            },
          );
          continue;
        }
        if (
          page.viewport.width < baseline.viewport.width ||
          page.viewport.height < baseline.viewport.height ||
          snapshot.area <= previous.area
        ) {
          unassessed(
            "Viewport-growth yield is unassessed: target viewport dimensions must not shrink and usable area must strictly increase.",
            { referenceArea: previous.area, targetArea: snapshot.area },
          );
          continue;
        }
        const lostKeys = previous.keys.filter(
          (key) => !snapshot.keys.includes(key),
        );
        const areaGrowth = (snapshot.area - previous.area) / previous.area;
        const evidenceGrowth =
          (snapshot.keys.length - previous.keys.length) / previous.keys.length;
        const growthYield = evidenceGrowth / areaGrowth;
        const saturated = Boolean(
          rule.finiteKeys?.every(
            (key) => previous.keys.includes(key) && snapshot.keys.includes(key),
          ),
        );
        snapshot.comparison = {
          status: saturated ? "saturated" : "measured",
          referenceViewport: rule.referenceViewport,
          referenceArea: previous.area,
          referenceCount: previous.keys.length,
          areaGrowth,
          evidenceGrowth,
          yield: growthYield,
          lostKeys,
        };
        if (lostKeys.length)
          add(
            page,
            rule,
            "Larger viewport lost previously visible task evidence.",
            lostKeys,
            previous.keys,
          );
        if (!saturated && growthYield < rule.minYield)
          add(
            page,
            rule,
            "Viewport-growth yield is below the task's configured minimum.",
            snapshot.comparison,
            { minYield: rule.minYield },
          );
      }
    }
    if (rule.type === "comparison-set") {
      for (const page of pages) {
        const snapshot = page.metrics?.comparisons.find(
          (item) => item.rule === rule.id,
        );
        if (!snapshot) continue;
        const count = rule.minVisibleByViewport[page.viewport.name];
        if (!count || snapshot.keys.length < count)
          add(
            page,
            rule,
            "Too few distinct comparisons fit this viewport.",
            snapshot.keys.length,
            count ?? "configured minimum",
          );
        if (page.viewport.name === rule.preserveFrom) continue;
        const baseline = pages.find(
          (p) => p.name === page.name && p.viewport.name === rule.preserveFrom,
        );
        const previous = baseline?.metrics?.comparisons.find(
          (item) => item.rule === rule.id,
        );
        if (!previous) {
          add(
            page,
            rule,
            "Reference viewport was not captured with comparison evidence.",
            rule.preserveFrom,
            "available comparison reference",
          );
          continue;
        }
        if (
          page.viewport.width >= baseline.viewport.width &&
          page.viewport.height >= baseline.viewport.height
        ) {
          const lost = previous.keys.filter(
            (key) => !snapshot.keys.includes(key),
          );
          if (lost.length)
            add(
              page,
              rule,
              "Larger viewport lost previously visible comparisons.",
              lost,
              previous.keys,
            );
        }
      }
    }
    if (rule.type === "consistent") {
      const seen = new Map();
      for (const page of pages)
        for (const item of page.metrics?.consistency.find(
          (entry) => entry.rule === rule.id,
        )?.items ?? []) {
          const key = JSON.stringify([
            rule.acrossPages ? null : page.name,
            item.key,
          ]);
          const prior = seen.get(key);
          if (
            prior &&
            JSON.stringify(prior.values) !== JSON.stringify(item.values)
          )
            add(
              page,
              rule,
              `Inconsistent encoding for ${item.key}; reference page: ${prior.page}, viewport: ${prior.viewport}.`,
              item.values,
              prior.values,
            );
          else if (!prior)
            seen.set(key, {
              ...item,
              page: page.name,
              viewport: page.viewport.name,
            });
        }
    }
  }
  for (const page of report.pages) {
    for (const finding of page.findings) {
      const rule = rules.find((r) => r.id === finding.rule);
      finding.designRules ??= rule
        ? designIdsFor(rule)
        : finding.rule === "page-overflow"
          ? ["DR-006", "DR-007"]
          : finding.rule === "detail-coverage"
            ? ["DR-007"]
            : [];
      finding.suggestion ??= rule
        ? advice[rule.type]
        : "Resolve the capture or accessibility issue and rerun viewrule check.";
      finding.evidenceKind =
        rule?.type === "attribute" ||
        rule?.type === "repeated-metric" ||
        rule?.type === "viewport-growth-yield" ||
        (rule?.type === "consistent" && rule.attributes.length)
          ? "DOM and declared metadata"
          : "DOM/capture";
    }
    page.designCoverage = report.designPolicy.rules.map(
      ({ id, title, href, enforcement }) => {
        const assigned = rules.filter(
          (rule) => active(rule, page) && designIdsFor(rule).includes(id),
        );
        const observed = assigned.filter((rule) =>
          page.metrics?.evaluations.some(
            (e) => e.rule === rule.id && e.status === "checked",
          ),
        );
        const hasFindings = page.findings.some((finding) =>
          finding.designRules.includes(id),
        );
        const status = hasFindings
          ? "findings"
          : observed.length
            ? "checks-passed"
            : "unassessed";
        if (config.requiredDesignRules?.includes(id) && !observed.length)
          page.findings.push({
            rule: "design-coverage",
            designRules: [id],
            severity: "error",
            message: `No executed check with visible evidence for required ${id}.`,
            actual: "unassessed",
            expected: "configured applicable check with visible evidence",
            evidenceKind: "coverage",
            suggestion:
              "Add a scoped check and supply its real evidence. An absent or optional skipped selector does not establish coverage.",
          });
        return {
          id,
          title,
          href,
          enforcement,
          status,
          checks: observed.map((rule) => rule.id),
        };
      },
    );
  }
}

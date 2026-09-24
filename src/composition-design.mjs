import { ruleApplies } from "./scopes.mjs";

// The application declares task-relevant identities. This measures their yield,
// not information value, aesthetic quality, or attention from a screenshot.
/** @param {import("./types.js").ReviewReport} report
 * @param {import("./types.js").Rule[]} rules */
export function evaluateComposition(report, rules) {
  for (const rule of rules.filter((r) => r.type === "viewport-yield")) {
    const pages = report.pages.filter((p) =>
      ruleApplies(rule, p.name, p.viewport.name),
    );
    for (const page of pages) {
      const metric = page.metrics?.composition?.find((m) => m.rule === rule.id);
      if (!metric?.valid) continue;
      // Reused captures contain aggregate fields from the previous run.
      // Recompute coverage and comparisons from the raw, valid measurement.
      const evaluation = page.metrics.evaluations.find(
        (entry) => entry.rule === rule.id,
      );
      if (evaluation) evaluation.status = "checked";
      for (const field of [
        "comparison",
        "areaGrowth",
        "evidenceGrowth",
        "yield",
        "saturated",
      ])
        delete metric[field];
      const fail = (message, actual, expected, missing = false) => {
        if (missing) {
          const evaluation = page.metrics.evaluations.find(
            (e) => e.rule === rule.id,
          );
          if (evaluation) evaluation.status = "missing";
        }
        page.findings.push({
          rule: rule.id,
          severity: rule.severity,
          selector: rule.selector,
          reason: rule.reason,
          message,
          actual,
          expected,
        });
      };
      if (page.viewport.name === rule.referenceViewport) {
        metric.comparison = "reference";
        continue;
      }
      const reference = pages.find(
        (p) =>
          p.name === page.name &&
          (p.checkpoint ?? null) === (page.checkpoint ?? null) &&
          p.viewport.name === rule.referenceViewport,
      );
      const before = reference?.metrics?.composition?.find(
        (m) => m.rule === rule.id,
      );
      if (!before?.valid || !before.keys?.length) {
        metric.comparison = "unassessed";
        fail(
          "Viewport yield has no valid reference for the same page and checkpoint.",
          rule.referenceViewport,
          "captured reference evidence",
          true,
        );
        continue;
      }
      const areaGrowth = metric.viewportArea / before.viewportArea - 1;
      if (
        page.viewport.width < reference.viewport.width ||
        page.viewport.height < reference.viewport.height ||
        areaGrowth <= 0
      ) {
        metric.comparison = "unassessed";
        fail(
          "Yield comparison requires a larger viewport with neither dimension reduced.",
          page.viewport,
          reference.viewport,
          true,
        );
        continue;
      }
      const lost = before.keys.filter((key) => !metric.keys.includes(key));
      const evidenceGrowth = metric.keys.length / before.keys.length - 1;
      const value = evidenceGrowth / areaGrowth;
      const saturated = rule.expectedKeys.every((key) =>
        metric.keys.includes(key),
      );
      Object.assign(metric, {
        comparison: saturated ? "saturated" : "compared",
        areaGrowth,
        evidenceGrowth,
        yield: value,
        saturated,
      });
      if (lost.length)
        fail(
          "Larger viewport lost previously visible task evidence.",
          lost,
          before.keys,
        );
      if (!saturated && value < rule.minYield)
        fail(
          "Added viewport area did not meet the declared evidence-growth yield.",
          {
            referenceCount: before.keys.length,
            count: metric.keys.length,
            areaGrowth,
            evidenceGrowth,
            yield: value,
          },
          { minYield: rule.minYield, finiteSetSize: rule.expectedKeys.length },
        );
    }
  }
}

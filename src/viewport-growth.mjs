// A scoped comparison-yield contract, not an information- or beauty score.
// Browser collection remains in inspectPage; this compares one page/checkpoint.
/**
 * @param {import("./types.js").PageResult[]} pages
 * @param {import("./types.js").Rule} rule
 */
export function evaluateViewportGrowth(pages, rule) {
  if (!rule.growthYield) return;
  const { min, availableKeys } = rule.growthYield;
  const inventory = new Set(availableKeys);
  const snapshot = (page) =>
    page?.metrics?.comparisons.find((item) => item.rule === rule.id);
  const sameState = (a, b) =>
    a.name === b.name && (a.checkpoint ?? null) === (b.checkpoint ?? null);
  const area = (page) => {
    const w = page?.metrics?.viewportWidth;
    const h = page?.metrics?.viewportHeight;
    return Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0
      ? w * h
      : null;
  };
  // Take this before adding yield findings: iteration order must not change input.
  const invalid = new Set(
    pages.filter(
      (page) =>
        !snapshot(page) ||
        !page.metrics?.evaluations.some(
          (item) => item.rule === rule.id && item.status === "checked",
        ) ||
        page.findings.some((finding) => finding.rule === rule.id),
    ),
  );
  for (const page of pages) {
    const baseline = pages.find(
      (candidate) =>
        sameState(candidate, page) &&
        candidate.viewport.name === rule.preserveFrom,
    );
    const isReference = page.viewport.name === rule.preserveFrom;
    if (
      !isReference &&
      baseline &&
      (page.viewport.width < baseline.viewport.width ||
        page.viewport.height < baseline.viewport.height ||
        (page.viewport.width === baseline.viewport.width &&
          page.viewport.height === baseline.viewport.height))
    )
      continue;

    const current = snapshot(page);
    const prior = snapshot(baseline);
    const keys = [...new Set(current?.keys ?? [])];
    const previousKeys = [...new Set(prior?.keys ?? [])];
    const undeclared = [...new Set([...keys, ...previousKeys])].filter(
      (key) => !inventory.has(key),
    );
    const baselineArea = area(baseline);
    const currentArea = area(page);
    const referenceCount = previousKeys.length;
    const count = keys.length;
    const lost = previousKeys.filter((key) => !keys.includes(key));
    /** @type {import("./types.js").ViewportGrowthObservation} */
    const observation = {
      rule: rule.id,
      preserveFrom: rule.preserveFrom,
      status: "unassessed",
      unit: "relative-evidence-growth / relative-viewport-area-growth",
      baselineArea,
      currentArea,
      baselineCount: referenceCount,
      currentCount: count,
      availableCount: inventory.size,
      areaGrowth: null,
      evidenceGrowth: null,
      yield: null,
      requiredCount: null,
      minYield: min,
    };
    let problem;
    if (!baseline || !prior || !current || !baselineArea || !currentArea)
      problem =
        "Yield needs captured comparison evidence and positive viewport areas in the same page/checkpoint.";
    else if (invalid.has(page) || invalid.has(baseline))
      problem =
        "Yield is unassessed because a comparison prerequisite failed or was not checked; repair it before interpreting growth.";
    else if (undeclared.length)
      problem = `Yield evidence is outside the declared inventory: ${undeclared.join(", ")}.`;
    else if (!referenceCount)
      problem =
        "Yield needs at least one complete comparison in the reference viewport.";
    else if (isReference) observation.status = "reference";
    else if (currentArea <= baselineArea)
      problem =
        "Yield needs a positive increase in measured CSS viewport area.";
    else {
      const areaGrowth = (currentArea - baselineArea) / baselineArea;
      const evidenceGrowth = (count - referenceCount) / referenceCount;
      const measuredYield = evidenceGrowth / areaGrowth;
      // A finite task cannot expose more than its predeclared inventory. The
      // epsilon only absorbs floating-point error at an integer count boundary.
      const requiredCount = Math.min(
        inventory.size,
        Math.ceil(referenceCount * (1 + min * areaGrowth) - 1e-9),
      );
      Object.assign(observation, {
        status: count === inventory.size ? "saturated" : "measured",
        areaGrowth,
        evidenceGrowth,
        yield: measuredYield,
        requiredCount,
      });
      if (lost.length)
        problem = `Larger viewport lost reference identities: ${lost.join(", ")}.`;
      else if (count < requiredCount)
        problem =
          "Viewport growth exposed too few distinct declared comparisons; stretching or duplicating containers does not earn yield.";
    }
    (page.viewportGrowth ??= []).push(observation);
    if (problem)
      page.findings.push({
        rule: rule.id,
        severity: rule.severity,
        selector: rule.selector,
        reason: rule.reason,
        message: problem,
        actual: observation,
        expected: {
          minYield: min,
          availableKeys,
          preserveFrom: rule.preserveFrom,
          requiredCount: observation.requiredCount,
        },
        designRules: [
          ...new Set([...(rule.designRules ?? ["DR-006", "DR-007"]), "DR-019"]),
        ],
        evidenceKind: "DOM and declared comparison identities",
        suggestion:
          "Expose additional declared evidence without losing identities, context, or readable type. Preserve whitespace when the finite inventory is already visible; do not change the inventory to obtain a pass.",
      });
  }
}

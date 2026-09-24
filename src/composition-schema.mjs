// Opt-in relationships, not default scores for arbitrary application markup.
const selector = { type: "string", minLength: 1 };
const axis = { enum: ["x", "y"] };
export const compositionSchemas = {
  "spacing-rhythm": {
    items: selector,
    axis,
    maxSpread: { type: "number", minimum: 0 },
  },
  "group-separation": {
    groupSelector: selector,
    items: selector,
    axis,
    minRatio: { type: "number", exclusiveMinimum: 1 },
  },
  "peer-size": {
    items: selector,
    dimension: { enum: ["width", "height", "area"] },
    maxRatio: { type: "number", minimum: 1 },
  },
  "region-budget": {
    items: selector,
    maxRatio: { type: "number", minimum: 0, maximum: 1 },
  },
  "viewport-yield": {
    items: selector,
    keyAttribute: selector,
    expectedKeys: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: selector,
    },
    referenceViewport: selector,
    minYield: { type: "number", minimum: 0 },
    minFontSize: { type: "number", exclusiveMinimum: 0 },
  },
};
export const compositionTypes = Object.freeze(Object.keys(compositionSchemas));
export const compositionDesignIds = {
  "spacing-rhythm": ["DR-018"],
  "group-separation": ["DR-006", "DR-018"],
  "peer-size": ["DR-020"],
  "region-budget": ["DR-019"],
  "viewport-yield": ["DR-007", "DR-019"],
};
export const compositionAdvice = {
  "spacing-rhythm":
    "Restore the declared spacing rhythm through shared layout relationships. Preserve wrapping, readable type, and intentional differences between groups.",
  "group-separation":
    "Bring members of each declared group closer together, or separate unrelated groups. Preserve usable targets and the task's reading order.",
  "peer-size":
    "Restore the declared footprint relationship between semantic peers. Do not force equal heights on different amounts of content or equal weight on different priorities.",
  "region-budget":
    "Reduce the declared chrome's share of the visible task region without hiding required context, navigation, or controls. Review the native-scale capture.",
  "viewport-yield":
    "Use added viewport area to expose more distinct declared evidence while preserving previously visible identities and readable type. A finite task may retain whitespace once all declared evidence is visible.",
};

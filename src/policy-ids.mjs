// Stable policy identities and enforcement modes, shared by runtime validation
// and the policy reader. Append new IDs; never renumber an existing requirement.
//
// `enforcement` names the strongest mechanism Viewrule expects for the complete
// rule: automated = native observable checks can gate it, behavioral = an
// application journey/assertion is required, review = semantic/design judgment
// remains the deciding evidence. Partial native checks may still support a
// behavioral or review rule.
export const designRuleRegistry = Object.freeze([
  { id: "DR-001", enforcement: "automated" },
  { id: "DR-002", enforcement: "automated" },
  { id: "DR-003", enforcement: "automated" },
  { id: "DR-004", enforcement: "automated" },
  { id: "DR-005", enforcement: "automated" },
  { id: "DR-006", enforcement: "automated" },
  { id: "DR-007", enforcement: "automated" },
  { id: "DR-008", enforcement: "review" },
  { id: "DR-009", enforcement: "behavioral" },
  { id: "DR-010", enforcement: "behavioral" },
  { id: "DR-011", enforcement: "review" },
  { id: "DR-012", enforcement: "behavioral" },
  { id: "DR-013", enforcement: "review" },
  { id: "DR-014", enforcement: "behavioral" },
  { id: "DR-015", enforcement: "automated" },
  { id: "DR-016", enforcement: "review" },
]);

export const designRuleIds = Object.freeze(
  designRuleRegistry.map(({ id }) => id),
);

export const designRuleEnforcement = Object.freeze(
  Object.fromEntries(designRuleRegistry.map(({ id, enforcement }) => [id, enforcement])),
);

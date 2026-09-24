// Stable policy identities, source files, and enforcement modes. Append new IDs;
// never renumber an existing requirement. The filename is part of the human-facing
// policy identity: rule ID plus a short, durable label.
export const designRuleRegistry = Object.freeze([
  {
    id: "DR-001",
    file: "DR-001-comparable-scales.md",
    enforcement: "automated",
  },
  {
    id: "DR-002",
    file: "DR-002-proportional-magnitude.md",
    enforcement: "automated",
  },
  {
    id: "DR-003",
    file: "DR-003-quantity-context.md",
    enforcement: "automated",
  },
  {
    id: "DR-004",
    file: "DR-004-missing-estimated-values.md",
    enforcement: "automated",
  },
  {
    id: "DR-005",
    file: "DR-005-consistent-meanings.md",
    enforcement: "automated",
  },
  {
    id: "DR-006",
    file: "DR-006-related-evidence.md",
    enforcement: "automated",
  },
  {
    id: "DR-007",
    file: "DR-007-responsive-detail.md",
    enforcement: "automated",
  },
  {
    id: "DR-008",
    file: "DR-008-earned-decoration.md",
    enforcement: "review",
  },
  {
    id: "DR-009",
    file: "DR-009-state-honesty.md",
    enforcement: "behavioral",
  },
  {
    id: "DR-010",
    file: "DR-010-context-continuity.md",
    enforcement: "behavioral",
  },
  {
    id: "DR-011",
    file: "DR-011-action-scope.md",
    enforcement: "review",
  },
  {
    id: "DR-012",
    file: "DR-012-recovery-safeguards.md",
    enforcement: "behavioral",
  },
  {
    id: "DR-013",
    file: "DR-013-task-emphasis.md",
    enforcement: "review",
  },
  {
    id: "DR-014",
    file: "DR-014-keyboard-access.md",
    enforcement: "behavioral",
  },
  {
    id: "DR-015",
    file: "DR-015-content-resilience.md",
    enforcement: "automated",
  },
  {
    id: "DR-016",
    file: "DR-016-semantic-color.md",
    enforcement: "review",
  },
  {
    id: "DR-017",
    file: "DR-017-alignment.md",
    enforcement: "review",
  },
  {
    id: "DR-018",
    file: "DR-018-rhythm.md",
    enforcement: "review",
  },
  {
    id: "DR-019",
    file: "DR-019-spatial-economy.md",
    enforcement: "review",
  },
  {
    id: "DR-020",
    file: "DR-020-balance.md",
    enforcement: "review",
  },
]);

export const designRuleIds = Object.freeze(
  designRuleRegistry.map(({ id }) => id),
);

export const designRuleEnforcement = Object.freeze(
  Object.fromEntries(
    designRuleRegistry.map(({ id, enforcement }) => [id, enforcement]),
  ),
);

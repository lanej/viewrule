// Stable policy identities, shared by runtime validation and the policy reader.
// Append new IDs; never renumber an existing requirement.
export const designRuleIds = Object.freeze(
  Array.from(
    { length: 16 },
    (_, index) => `DR-${String(index + 1).padStart(3, "0")}`,
  ),
);

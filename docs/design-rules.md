# Design rules for evidence and interaction

Viewrule's design policy is defined by the individual files in [`docs/design-rules/`](design-rules/). This page is the human-readable index; rule files are canonical and are loaded directly by the engine.

DR-001–DR-008 apply ideas from Edward Tufte's *The Visual Display of Quantitative Information* and later writing. DR-009–DR-016 add task-scoped interaction and resilience requirements with their own cited sources. These are our interpretations, not quotations, endorsements, or universal prescriptions for every interface.

[Detection and enforcement](ui-review-enforcement.md) describes the implemented checks and their limits. [UI review](ui-review.md) covers setup. The [illustrated examples](design-examples.md) pair good and bad versions of common components, and the generated `/rules/` site provides one page per design rule.

## How to apply the rules

- **Must** defines a requirement when the stated condition applies.
- **Should** defines a default that calls for judgment in the particular screen.
- A **comparison group** is a set of values or charts the reader is expected to compare for one task. Its membership and intended comparison must be explicit.
- Scope requirements to the task, page state, comparison group, and viewport. There is no universal density percentage, row count, or font size.
- Document an exception with its rule ID, scope, reason, and how it preserves the intended comparison. A disclosure cannot make a misleading encoding accurate.

## DR-001 — Comparable charts use comparable scales

[Canonical rule →](design-rules/DR-001-comparable-scales.md)

## DR-002 — Visual magnitude reflects numerical magnitude

[Canonical rule →](design-rules/DR-002-proportional-magnitude.md)

## DR-003 — Quantities carry the context needed to interpret them

[Canonical rule →](design-rules/DR-003-quantity-context.md)

## DR-004 — Missing and estimated values remain distinguishable

[Canonical rule →](design-rules/DR-004-missing-estimated-values.md)

## DR-005 — Visual meanings stay consistent

[Canonical rule →](design-rules/DR-005-consistent-meanings.md)

## DR-006 — Related evidence stays visible together

[Canonical rule →](design-rules/DR-006-related-evidence.md)

## DR-007 — Larger screens expose useful detail and preserve legibility

[Canonical rule →](design-rules/DR-007-responsive-detail.md)

## DR-008 — Decoration earns its space and visual weight

[Canonical rule →](design-rules/DR-008-earned-decoration.md)

## DR-009 — System status reflects the available evidence

[Canonical rule →](design-rules/DR-009-state-honesty.md)

## DR-010 — Interactions preserve the working context

[Canonical rule →](design-rules/DR-010-context-continuity.md)

## DR-011 — Controls communicate their action and scope

[Canonical rule →](design-rules/DR-011-action-scope.md)

## DR-012 — Safeguards match consequences and preserve work

[Canonical rule →](design-rules/DR-012-recovery-safeguards.md)

## DR-013 — Visual emphasis follows the task's priority

[Canonical rule →](design-rules/DR-013-task-emphasis.md)

## DR-014 — Essential interactions do not require a pointer

[Canonical rule →](design-rules/DR-014-keyboard-access.md)

## DR-015 — Layout survives content variation and text adaptation

[Canonical rule →](design-rules/DR-015-content-resilience.md)

## DR-016 — Color scales match the structure of the data

[Canonical rule →](design-rules/DR-016-semantic-color.md)

## Refining the rules

Use feedback on concrete screens to refine a rule or add a scoped example. Record what decision became easier or harder and at which viewport. Preserve rule IDs and durable filenames so future detection and enforcement refer to the same requirements.

## Sources

The [research notes](design-principles.md) explain the scope and limits of additional W3C and U.S. Web Design System guidance.

- Edward Tufte, [The Visual Display of Quantitative Information](https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/)
- Edward Tufte, [Baseline for amount scale](https://www.edwardtufte.com/notebook/baseline-for-amount-scale/)
- Edward Tufte, [Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- Edward Tufte, [Making better inferences from statistical graphics](https://www.edwardtufte.com/notebook/making-better-inferences-from-statistical-graphics-edward-tufte/)
- Carl Bergstrom and Jevin West, [The principle of proportional ink](https://www.callingbull.org/tools/tools_proportional_ink.html)

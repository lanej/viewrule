# Design rules for evidence, interaction, and composition

Viewrule's design policy is defined by the individual files in [`docs/design-rules/`](design-rules/). This page is the human-readable index; rule files are canonical and are loaded directly by the engine.

DR-001–DR-008 apply ideas from Edward Tufte's *The Visual Display of Quantitative Information* and later writing. DR-009–DR-016 add task-scoped interaction and resilience requirements with their own cited sources. DR-017–DR-020 add scoped composition guidance for alignment, rhythm, spatial economy, and balance. These are our interpretations, not quotations, endorsements, or universal prescriptions for every interface.

[Detection and enforcement](ui-review-enforcement.md) describes the implemented checks and their limits. [UI review](ui-review.md) covers setup. The [illustrated examples](design-examples.md) pair good and bad versions of common components, and the generated `/rules/` site provides one canonical page per design rule, with interactive good/bad examples embedded beside the requirement and verification guidance. The `/examples/` gallery is optional browsing; rule pages do not depend on it.

Each rule has a short “Rule of …” name for discussion and recall. Its principle and full requirement define its scope; the DR ID remains the stable reference.

The [design guide](../plugins/claude-code/guide/v1/index.md) distinguishes patterns,
evidence, and enforceable conditions. DR IDs provide policy rationale; only configured
measurements are automated requirements. No DR citation alone establishes coverage
of semantic claims such as decision sufficiency.

## How to apply the rules

- **Must** defines a requirement when the stated condition applies.
- **Should** defines a default that calls for judgment in the particular screen.
- A **comparison group** is a set of values or charts the reader is expected to compare for one task. Its membership and intended comparison must be explicit.
- Scope requirements to the task, page state, comparison group, and viewport. There is no universal density percentage, row count, or font size.
- Document an exception with its rule ID, scope, reason, and how it preserves the intended comparison. A disclosure cannot make a misleading encoding accurate.

<a id="dr-001--comparable-charts-use-comparable-scales"></a>

## DR-001 — Rule of Shared Scales

Comparable charts use comparable scales.

[Canonical rule →](design-rules/DR-001-comparable-scales.md)

<a id="dr-002--visual-magnitude-reflects-numerical-magnitude"></a>

## DR-002 — Rule of Proportion

Visual magnitude reflects numerical magnitude.

[Canonical rule →](design-rules/DR-002-proportional-magnitude.md)

<a id="dr-003--quantities-carry-the-context-needed-to-interpret-them"></a>

## DR-003 — Rule of Context

Quantities carry the context needed to interpret them.

[Canonical rule →](design-rules/DR-003-quantity-context.md)

<a id="dr-004--missing-and-estimated-values-remain-distinguishable"></a>

## DR-004 — Rule of Uncertainty

Missing and estimated values remain distinguishable.

[Canonical rule →](design-rules/DR-004-missing-estimated-values.md)

<a id="dr-005--visual-meanings-stay-consistent"></a>

## DR-005 — Rule of Consistency

Visual meanings stay consistent.

[Canonical rule →](design-rules/DR-005-consistent-meanings.md)

<a id="dr-006--related-evidence-stays-visible-together"></a>

## DR-006 — Rule of Proximity

Related evidence stays visible together.

[Canonical rule →](design-rules/DR-006-related-evidence.md)

<a id="dr-007--larger-screens-expose-useful-detail-and-preserve-legibility"></a>

## DR-007 — Rule of Useful Space

Larger screens expose useful detail and preserve legibility.

[Canonical rule →](design-rules/DR-007-responsive-detail.md)

<a id="dr-008--decoration-earns-its-space-and-visual-weight"></a>

## DR-008 — Rule of Restraint

Decoration earns its space and visual weight.

[Canonical rule →](design-rules/DR-008-earned-decoration.md)

<a id="dr-009--system-status-reflects-the-available-evidence"></a>

## DR-009 — Rule of State Honesty

System status reflects the available evidence.

[Canonical rule →](design-rules/DR-009-state-honesty.md)

<a id="dr-010--interactions-preserve-the-working-context"></a>

## DR-010 — Rule of Continuity

Interactions preserve the working context.

[Canonical rule →](design-rules/DR-010-context-continuity.md)

<a id="dr-011--controls-communicate-their-action-and-scope"></a>

## DR-011 — Rule of Clear Action

Controls communicate their action and scope.

[Canonical rule →](design-rules/DR-011-action-scope.md)

<a id="dr-012--safeguards-match-consequences-and-preserve-work"></a>

## DR-012 — Rule of Recovery

Safeguards match consequences and preserve work.

[Canonical rule →](design-rules/DR-012-recovery-safeguards.md)

<a id="dr-013--visual-emphasis-follows-the-tasks-priority"></a>

## DR-013 — Rule of Priority

Visual emphasis follows the task's priority.

[Canonical rule →](design-rules/DR-013-task-emphasis.md)

<a id="dr-014--essential-interactions-do-not-require-a-pointer"></a>

## DR-014 — Rule of Access

Essential interactions do not require a pointer.

[Canonical rule →](design-rules/DR-014-keyboard-access.md)

<a id="dr-015--layout-survives-content-variation-and-text-adaptation"></a>

## DR-015 — Rule of Resilience

Layout survives content variation and text adaptation.

[Canonical rule →](design-rules/DR-015-content-resilience.md)

<a id="dr-016--color-scales-match-the-structure-of-the-data"></a>

## DR-016 — Rule of Meaningful Color

Color scales match the structure of the data.

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

## DR-017 — Rule of Alignment

Related elements share intentional visual anchors.

[Canonical rule →](design-rules/DR-017-alignment.md)

## DR-018 — Rule of Rhythm

Equivalent relationships use consistent spacing and clearer grouping.

[Canonical rule →](design-rules/DR-018-rhythm.md)

## DR-019 — Rule of Spatial Economy

Allocate visual space according to task value, not container availability.

[Canonical rule →](design-rules/DR-019-spatial-economy.md)

## DR-020 — Rule of Balance

Visual weight reflects semantic priority, not mirror symmetry.

[Canonical rule →](design-rules/DR-020-balance.md)

[Composition contracts, measurements, and calibration](composition.md).

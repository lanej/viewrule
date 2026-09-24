# DR-020 — Rule of Balance

**Principle:** Equal-priority peers receive comparable visual allocation.

**Requirement:** Declare which items have equal priority in the task and which
measurable footprint should be comparable. Bound unexplained variation within
that group. Unequal priorities can warrant unequal allocation; use DR-013 to
state the intended hierarchy rather than forcing equality across the page.

**Why:** An outsized peer can imply a distinction the task does not intend. A
declared allocation relationship makes one source of that mismatch testable.
This is a Viewrule composition convention, not a formula for aesthetic balance.

**Computationally falsifiable:** `peer-footprint` measures at least two declared
items per group using `area` (axis-aligned border-box width times height in CSS
px²) or `font-size` (each item's computed CSS font size in CSS px). It compares
the population standard deviation divided by the mean with
`maxCoefficientOfVariation`. The coefficient is dimensionless. Missing groups,
insufficient peers, or unusable measurements cannot establish comparable
allocation. Choose the actual label elements for a font-size contract; a card's
inherited size cannot establish the size of every descendant.

**Application:** Compare the footprint of equal-role option cards, or the type
size of peer values whose importance is intended to be equal. These are separate
contracts; a similar card area does not prove similar typographic emphasis.

**Exception:** Longer content, accessibility needs, selected states, or a
higher-priority action can justify a different footprint. Declare or scope that
difference explicitly; do not truncate essential evidence to equalize boxes.
An asymmetric layout can satisfy this rule. Symmetry itself is never required.

**Human judgment:** Decide priority, useful exceptions, and acceptable variance.
Area and computed font size are proxies, not measurements of perceived salience
or visual weight. Contrast, position, imagery, whitespace, optical size, and
the task can outweigh these measurements. Passing cannot establish overall
balance, hierarchy, or design quality.
[Measurement reference](https://github.com/lanej/viewrule/blob/main/docs/ui-review.md#composition-contracts).
[Good/bad example](../examples/composition.html?rule=DR-020).

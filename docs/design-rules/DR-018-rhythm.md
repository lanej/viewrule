# DR-018 — Rule of Rhythm

**Principle:** Equivalent relationships use consistent spacing.

**Requirement:** Identify a repeated row or column whose adjacent items have the
same relationship, then declare an acceptable variation in their gaps. Scope
different relationships separately. Within-group spacing and between-group
separation need not match.

**Why:** Consistent spacing can make repetition and grouping easier to follow.
DR-006 establishes which evidence belongs together; this rule makes a declared
spacing relationship testable. The metric is a Viewrule convention, not a
research-backed universal spacing scale.

**Computationally falsifiable:** `gap-variance` orders at least three declared
items per group by their border-box coordinate on the configured `x` or `y`
axis; the items must share a row or column band on the other axis. It measures
each adjacent edge-to-edge gap in CSS px and compares the
population standard deviation divided by the mean with
`maxCoefficientOfVariation`. This coefficient is dimensionless. All-zero gaps
have a coefficient of zero; any negative gap is an invalid overlapping sequence
and fails. Missing groups or insufficient peers cannot establish rhythm.

**Application:** Measure the gaps between successive equal-role queue rows or
toolbar actions. Use separate contracts for section breaks or another layout
at a narrower viewport. Existing `relative-position` can also bound a declared
inter-group gap, but the engine does not infer groups or a preferred separation.

**Exception:** Deliberately larger gaps may distinguish sections, safety-critical
actions, or a change in meaning. Content-driven wrapping can change the intended
sequence; review and rescope it rather than compressing text to reduce variance.

**Human judgment:** Select equivalent relationships and judge whether the absolute
spacing is useful. Uniformly excessive or cramped gaps can pass a variance check.
The check does not establish optical rhythm, reading order, grouping semantics,
two-dimensional grid quality, or an appropriate spacing-token system. Combine
with task-specific gap bounds, legibility, and overlap checks where needed.
[Measurement reference](https://github.com/lanej/viewrule/blob/main/docs/ui-review.md#composition-contracts).
[Good/bad example](../examples/composition.html?rule=DR-018).

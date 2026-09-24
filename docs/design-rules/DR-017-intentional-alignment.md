# DR-017 — Rule of Alignment

**Principle:** Related elements share intentional visual anchors.

**Requirement:** Declare which elements are peers, the shared edge, the page state,
and the applicable viewport. Their measured edge spread must stay within the
project's CSS-pixel tolerance. Declare separate sets for separate rows, columns,
and semantic roles; aligning unrelated elements is not an improvement.

**Falsifier:** Three declared peer headings have top coordinates 48, 48, and 60
CSS pixels against a 1-pixel tolerance. The 12-pixel spread fails regardless of
whether all three use the expected CSS class.

**Enforcement:** Existing `align` measures max(edge) minus min(edge). Use
`required-elements` to require the expected members and `relative-position` for
within-component relationships. Test an actual displaced peer and the corrected
layout with the same contract. Missing members must not turn a broken peer set
into an apparently aligned smaller set.

**Limits:** Bounding-box edges are not typographic baselines or optical alignment.
Intentional indents, differently sized content, responsive stacking, and reading
direction need scoped contracts. A pass does not establish that the chosen anchor
is appropriate. This is a Viewrule authoring convention, not an experimentally
validated aesthetic threshold.

[Executable composition example and measurement scope](../composition.md).

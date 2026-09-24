# DR-018 — Rule of Rhythm

**Principle:** Equivalent relationships use consistent spacing, and stronger
relationships are expressed within clearer groups.

**Default:** Establish a repeatable spacing rhythm for equivalent peers. Where
proximity is the grouping cue, keep within-group separation smaller than
between-group separation. A heading and its content should not look more closely
associated with the next section than with each other. Judge the rendered
relationships, not whether the stylesheet happens to use grid, flex, or tokens.

**Application:** Review a toolbar's equivalent controls as one sequence and its
separate action groups as a different relationship. Compare repeated heading/body
relationships with each other, not with margins around an entire section.

**Exceptions:** Wrapping text, enlarged type, variable content, hierarchy, reading
direction, and intentional group boundaries can change gaps. A repeated series
may need more than one rhythm. Scope each row or column explicitly rather than
forcing a wrapped grid into a single sequence. Borders, headings, or backgrounds
can establish grouping without a larger external gap; do not apply a
proximity-only contract to a different grouping system.

**Enforcement:** `spacing-rhythm` measures the maximum minus minimum adjacent box
gap in a declared, nonoverlapping line of at least three peers. `group-separation`
compares the smallest external group gap with the largest internal member gap
when the application declares proximity as the grouping cue. Groups and members
must form lines on the configured axis. Missing members, overlap, nesting, or
wrapped geometry cannot masquerade as a passing ratio. Pixel tolerances and
separation ratios belong in the application, not a universal preset.

**Basis:** Carbon's [grid guidance](https://carbondesignsystem.com/elements/2x-grid/overview/)
illustrates consistent spacing and visual rhythm. The operational tests here are
Viewrule conventions, not validated measures of comprehension. [Text-spacing
adaptation](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) is an
independent accessibility concern: a rhythm check is never a reason to clip text
or prevent user adjustments, and does not certify accessibility.

[Composition contracts and calibration example](../composition.md).

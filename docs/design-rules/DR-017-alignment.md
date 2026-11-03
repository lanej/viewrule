# DR-017 — Rule of Alignment

**Principle:** Related peers share intentional visual anchors.

**Requirement:** Declare the peers and the edge or center they should share for
the current task and layout. Keep their rendered anchors within the project's
tolerance. Scope separate columns, rows, nested groups, and responsive states
separately; unrelated content does not need a common anchor.

**Why:** A stable anchor makes a declared relationship visible and gives scanning
a predictable path. This extends DR-006's comparison guidance into an explicit
composition contract. The measurement is a Viewrule convention, not an empirical
threshold for attractive or usable layouts.

**Computationally falsifiable:** `alignment-residual` measures the configured
left, right, top, bottom, horizontal-center, or vertical-center coordinate of at
least two declared items per group. Its residual is the greatest absolute
distance from the group's median anchor, in CSS px. A residual greater than
`maxResidual` fails. The reported anchors and residual expose how the contract
was violated; missing groups or insufficient peers cannot establish alignment.
Existing `align` instead limits the full edge spread; its tolerance is not
interchangeable with this median residual.

**Application:** Align the value edges in one comparison column, or the centers
of equal-role controls in one toolbar. Author independent groups for distinct
columns rather than counting every page anchor as accidental complexity.

**Exception:** Indentation may encode a hierarchy, and offset placement may
distinguish roles. Declare those relationships rather than flattening them to
obtain a pass. Symmetry is not required.

**Human judgment:** Choose which peers belong together, which anchor supports
reading, and what tolerance is appropriate. Border-box coordinates do not measure
text baselines, optical alignment, semantic relatedness, or overall composition
quality. Inspect clipping, overlap, transformed shapes, and actual text separately.
[Measurement reference](https://github.com/lanej/viewrule/blob/main/docs/ui-review.md#composition-contracts).
[Good/bad example](../examples/composition.html?rule=DR-017).

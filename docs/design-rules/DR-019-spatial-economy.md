# DR-019 — Rule of Spatial Economy

**Principle:** Space allocated to a task supports its evidence and interaction.

**Requirement:** Declare the usable task region, the relevant evidence identities,
and the role of surrounding chrome. Where growing the region should expose more
evidence, compare it with a named reference viewport in the same page and
checkpoint. Preserve reference evidence and readable type. State the expected
return on additional area instead of treating larger containers as more useful.

**Why:** DR-007 requires useful adaptation and DR-008 asks decoration to earn its
place. This rule adds comparative measurements of allocation. The formulas and
thresholds are project-authored contracts, not universal economic or aesthetic
laws; empty space may support reading, interaction, or a finite task.

**Computationally falsifiable — viewport-growth yield:** Let `A` be the CSS-pixel
area of one declared region intersected with the initial viewport. Let `N` be the
number of distinct declared evidence identities whose complete item bounds fit
inside that intersection and whose visible DOM text meets `minFontSize`.
For reference `r` and larger target `t`:

`yield = ((Nt - Nr) / Nr) / ((At - Ar) / Ar)`

`viewport-growth-yield` compares this dimensionless yield with a project's
`minYield`. For example, 50% more qualifying evidence in 100% more usable area
gives a yield of 0.5. Container growth alone produces zero yield. Reference
identities must remain qualifying at the target; replacing them with different
items cannot compensate for their loss. Missing or duplicate identities do not
count as useful growth. Both counts and the reference area must be positive,
target area must strictly grow, and target viewport dimensions must not shrink.
Missing references or invalid measurement evidence remain explicit findings at
the configured severity, rather than passing or claiming a numeric yield.

**Finite evidence:** Optional `finiteKeys` declares the exhaustive evidence
universe for the task. The yield threshold is exempt only when all those keys
already qualify at the reference and still qualify at the target. The report
identifies saturation; it does not claim a positive yield. Reaching the full set
only at the target still requires the configured yield. Do not invent extra
evidence, shrink text, or silently relabel the universe to obtain a pass.

**Computationally falsifiable — chrome allocation:** `chrome-allocation` limits
the ratio of declared chrome's unioned border-box area to the visible area of
one usable region. Chrome rectangles are clipped to that region and the initial
viewport; overlapping or nested rectangles are counted once. `maxRatio` is a
project-selected ceiling. This tests a declared allocation, not whether every
toolbar or boundary deserves its space.

**Human judgment:** Choose relevant evidence units, usable regions, exhaustive
finite sets, and warranted chrome. Counts do not measure information quality,
importance, visual complexity, or the usefulness of a larger map. Geometry and
computed text size do not establish occlusion-free visibility or readable paint.
Unique identities do not establish independent facts: subdividing or duplicating
one fact under new keys does not make it additional task evidence.
Tasks needing richer detail in the same item may need a different contract.
Inspect the examples and native-scale captures; there is no occupancy minimum.
[Measurement reference](https://github.com/lanej/viewrule/blob/main/docs/ui-review.md#composition-contracts).
[Good/bad example](../examples/composition.html?rule=DR-019).

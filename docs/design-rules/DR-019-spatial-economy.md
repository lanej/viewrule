# DR-019 — Rule of Spatial Economy

**Principle:** Additional visual space earns its cost by exposing useful evidence
or improving the task, not merely inflating containers.

**Requirement:** For a task that benefits from additional simultaneous evidence,
declare a stable finite inventory, a reference viewport, and the minimum relative
viewport-growth yield. Preserve reference identities and readable type. Capture
the same page, checkpoint, data state, and text scale at both sizes.

**Measurement:** For positive reference evidence count E0 and positive CSS viewport
areas A0 and A1, with A1 > A0:

```text
area growth     = (A1 - A0) / A0
evidence growth = (E1 - E0) / E0
viewport-growth yield = evidence growth / area growth
required count = min(inventory size, ceil(E0 * (1 + minimum yield * area growth)))
```

E is the number of distinct declared comparison identities that fit in the initial
viewport, not container area, duplicated summaries, or a subjective information
score. The denominator in this implementation is the measured full CSS viewport
area, not inferred usable content area; shrinking a panel does not shrink the
budget. Both target dimensions must be at least as large as the reference.

**Falsifier:** At constant height, doubling viewport width while retaining four
of twelve available comparisons has yield 0. A scoped minimum yield of 1 requires
eight. Four becoming eight passes; eight boxes repeating the original four do not.

**Finite exception:** When only four declared comparisons exist, retaining all
four passes at the larger size with status `saturated`. The measured yield remains
0; saturation caps the required count, it does not fabricate a positive yield.
Do not shrink the inventory after inspecting a failure merely to obtain a pass.

**Enforcement:** Opt in through `comparison-set.growthYield`; pair it with required
context, non-clipping, and interaction-target checks. Missing reference evidence,
undeclared visible identities, unreadable comparison text, and failed comparison
prerequisites cannot certify yield. See the [measurement contract](../composition.md).

**Limits:** Identity and task relevance are supplied by the application. This is a
Viewrule convention, not an empirically established cognitive-efficiency score.
It does not value map resolution, prose comprehension, navigation, or necessary
whitespace; those tasks need different explicit evidence or human review. A
universal minimum, occupancy target, or universal chrome tax would be unjustified.
DR-007 remains the broader responsive principle; this rule supplies one falsifiable
spatial-allocation contract where additional comparison evidence is meaningful.

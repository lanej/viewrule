# DR-019 — Rule of Spatial Economy

**Principle:** Allocate visual space according to task value, not container
availability.

**Default:** Identify the task's evidence, actions, and supporting chrome before
judging their area. Additional space should support comparison, inspection,
orientation, or comfortable interaction. Enlarging cards, repeating a summary,
or stretching columns is not additional information. Preserve useful whitespace
and bounded reading widths when the task is already adequately supported.

**Application:** A persistent header can be checked against a declared area budget
without calling all navigation waste. Compare the same task and data state at two
viewports: does the larger one reveal more distinct evidence, or just inflate
containers? DR-007 supplies the cross-viewport evidence requirement; this rule
adds explicit allocation and opportunity-cost review. DR-008 still governs
whether decoration has a useful function.

**Enforcement:** `region-budget` measures the union of declared chrome rectangles
inside the visible part of a declared task region. It does not infer which UI is
chrome, count overlapping boxes twice, or call the remainder useful information.
`viewport-yield` measures relative growth in fully visible, readable, declared
evidence identities divided by relative growth in CSS viewport area. It preserves
reference identities and compares only the same page and checkpoint. The app
supplies the finite evidence set, reference viewport, and minimum yield.

**Finite tasks:** Once all declared identities are visible, the yield floor no
longer applies. Preserve their identities and legibility; do not manufacture
content to fill the screen. The report explicitly marks saturation. A small
screen requiring an alternative interaction needs its own scope, not this
larger-viewport contract.

**Limits:** Identity counts are a task-specific proxy, not a measure of information
value. Mark relevance and state comparability as application assumptions. Maps,
charts, and prose can gain useful detail without more DOM identities. Occlusion,
canvas content, optical balance, and task success require review. Budgets are
scoped warnings by default in the example, not universal occupancy targets.

**Basis:** This allocation framework and the normalized yield are Viewrule
conventions extending DR-007 and DR-008. They are not experimentally established
laws or a general design score. Preserve independent [text-resizing
requirements](https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html).

[Metric definitions, limits, and calibration example](../composition.md).

# DR-007 — Rule of Useful Space

**Principle:** Larger screens expose useful detail and preserve legibility.

**Requirement:** For the same task and data state, moving to a larger supported
viewport must preserve the critical comparison set. Where additional evidence
helps the task, define which extra rows, columns, time history, or comparison
panels become visible at larger sizes. Preserve readable type and interaction
targets as density changes.

**Why:** Additional screen area is an opportunity to improve comparison and
inspection. Stretching containers alone does not demonstrate that improvement.

**Application:** Judge density by useful, distinct observations and relationships.
Repeated values, larger cards, and decorative marks do not count as additional
evidence. A larger carrier table might expose volume and service breakdowns while
keeping cost and reliability visible. Do not increase density by shrinking text
below the project's readable type scale. Preserve usable controls as density changes.
For prose, use bounded reading widths and natural word spacing; avoid fully justified
paragraphs. The default control-size and prose checks are scoped review warnings.

**Finite comparisons:** Align peer headings and sample surfaces through shared
layout relationships rather than fixed-height explanation slots or empty panel
allowances. Let wrapped content determine the required height. A scoped ceiling
may catch a known regression at one declared viewport and state; pair it with
legibility and required-context checks, and do not apply it unchanged to enlarged
text, different content, or narrower layouts.

**Exception:** A finite comparison or focused task may already show all useful
evidence. Retain useful whitespace and bounded reading widths in that case;
do not manufacture content to meet an occupancy target.

**Comparative allocation:** [DR-019](DR-019-spatial-economy.md) adds opt-in
viewport-growth yield: fractional growth of qualifying evidence divided by
fractional growth of usable region area, with reference identities preserved.
Its explicit finite-set exception distinguishes an already complete task from
empty container growth. The metric cannot decide which evidence is useful.

**Review:** Assess both the whole layout and detail at its intended reading size
for every target viewport. A reduced overview alone cannot establish legibility
on a large screen. Viewport dimensions refer to CSS pixels; account for browser
zoom and display scaling when choosing representative screen sizes.

**Decision surfaces:** Retain enough map or chart area for the required labels and
marks. Compact the supporting context, not the type. Reuse `region-density` on scoped
text regions as a geometry proxy; a large map box is not evidence of semantic density.
Declared repeated metrics and scalar container heights can supply additional partial
checks. [Expanded decision-surface reference](https://github.com/lanej/viewrule/blob/main/docs/design-examples.md#expanded-analytical-decision-surface).

**Discovery application:** Reduce redundant spacing before reducing readable
type. Bound the gap between a heading and its description without fixing the
item height; let wrapped titles and enlarged text use the space they need.
Exact type scales, icon sizes, gaps, and column choices remain project decisions.

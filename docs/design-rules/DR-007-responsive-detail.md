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

**Exception:** A finite comparison or focused task may already show all useful
evidence. Retain useful whitespace and bounded reading widths in that case;
do not manufacture content to meet an occupancy target.

**Review:** Assess both the whole layout and detail at its intended reading size
for every target viewport. A reduced overview alone cannot establish legibility
on a large screen. Viewport dimensions refer to CSS pixels; account for browser
zoom and display scaling when choosing representative screen sizes.

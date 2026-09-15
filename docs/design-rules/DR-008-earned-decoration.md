# DR-008 — Rule of Restraint

**Principle:** Decoration earns its space and visual weight.

**Default:** Remove redundant frames, nested cards, repeated labels, ornamental
icons, and effects that compete with the evidence. Gridlines and separators
should support reading without dominating the data. Headers and controls should
leave room for the task's primary comparisons.

**Why:** Prominent visual elements should communicate relevant information.

**Exception:** Grouping, selection, warnings, and interaction affordances may
need visible boundaries or emphasis. Preserve these functions. Minimal decoration
is not a reason to erase useful labels, context, or controls.

**Review:** Treat excessive decoration as a design concern requiring judgment.
An empty screen is not automatically a successful reduction of non-data ink.

**Decision surfaces:** Avoid repeating the expanded item's headline summary in another
large card. A scalar position often needs only its value and range as compact context.
`repeated-metric` can limit declared summary identities per surface; `max-height` can
bound explicitly selected scalar containers. Neither decides whether repetition or
a richer visualization is justified. [Expanded decision-surface reference](https://github.com/lanej/viewrule/blob/main/docs/design-examples.md#expanded-analytical-decision-surface).

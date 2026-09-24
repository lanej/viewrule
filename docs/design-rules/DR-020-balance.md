# DR-020 — Rule of Balance

**Principle:** Visual weight reflects semantic priority; peers do not acquire
accidental differences in prominence.

**Default:** Declare what is equally important and what is not. Comparable roles
should receive deliberate, comparable treatment. When task priority differs,
asymmetry may be correct: a primary workspace can be larger than its supporting
sidebar. Evaluate the composition against the attention order defined by DR-013,
not against mirror symmetry or equal-sized boxes.

**Application:** Three equivalent options can share a width and type role. A
primary decision panel and a context panel need not. Compare headings with
headings and actions with actions. Extra content may require more height even
when priority is equal; match relevant roles rather than entire containers.

**Exceptions:** Variable content, uncertainty, warnings, selection, readable
wrapping, and responsive reflow can justify different footprints. A safety alert
can legitimately outweigh ordinary peers. Do not hide context, truncate content,
or reduce type to meet a balance constraint. [Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)
remains an independent accessibility requirement.

**Enforcement:** `peer-size` measures the largest-to-smallest width, height, or
rectangle-area ratio within explicitly declared peer groups. Choose the dimension
that matters. Combine with scoped `style`, alignment, and legibility checks when
those are part of the contract. Size is only a footprint proxy: the engine does
not infer priority or estimate perceived weight from color, content, contrast,
or a screenshot. Do not interpret a passing area ratio as balanced attention.

**Review:** Inspect intentional asymmetry alongside rejected accidental emphasis.
A primary task can deserve most of the space while secondary material stays easy
to find. Symmetry itself is neither a requirement nor an automatic finding.
These are Viewrule composition conventions extending DR-013, not a universal
formula for visual weight.

[Composition contracts and calibration example](../composition.md).

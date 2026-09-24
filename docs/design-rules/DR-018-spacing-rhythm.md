# DR-018 — Rule of Rhythm

**Principle:** Equivalent relationships use consistent spacing; grouping remains
perceptible without sacrificing legibility.

**Requirement:** Declare the repeated relationship before selecting the layout:
which label belongs to which value, which controls form a group, and which groups
are separate. Apply the same scoped gap interval to equivalent relationships.
Internal and inter-group intervals should communicate the intended grouping.

**Falsifier:** A label-to-value contract allows 8–12 CSS pixels. One component
uses 24 pixels while its peers remain within the interval. The relationship fails
even if every element uses an approved spacing token.

**Enforcement:** Existing `relative-position` measures rendered edge gaps and a
shared reading band inside each selected component. Use separate relationships
for within-group and between-group gaps, with declared non-overlapping intervals
when stronger grouping is required. `required-elements` protects membership.
Checks must reject the actual misplaced or missing element, not a class name.

**Limits:** This first contract uses explicit intervals, not automatic gap-variance
or group-inference detection. Do not impose equal row heights on wrapped text,
force a horizontal relationship onto a stacked mobile view, or close every gap to
zero. Group meaning and comfortable reading remain review judgments. The interval
is a project decision, not a universal spacing scale or behavioral law.

[Executable composition example and measurement scope](../composition.md).

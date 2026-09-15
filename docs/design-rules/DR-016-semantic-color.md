# DR-016 — Rule of Meaningful Color

**Principle:** Color scales match the structure of the data.

**Requirement:** Choose color encodings according to what they represent: unordered categories, ordered magnitude, or deviation around a meaningful reference. Identify the mapping and preserve essential distinctions without color alone.

**Why:** ColorBrewer's scheme guidance distinguishes qualitative, sequential, and diverging encodings. This rule asks whether the mapping is appropriate; DR-005 asks whether an established meaning remains consistent. Those are separate questions.

**Application:** Use qualitative colors for carrier identity, a sequential treatment for increasing dwell, and a diverging treatment for deviations around an actual service target. Provide readable labels and a legend or equivalent explanation.

**Exception:** An explicitly ordered category set or a meaningful threshold may justify a different treatment. Explain it. A diverging midpoint must not imply an analytical reference merely because it is the mathematical midpoint of a palette.

**Review:** Inspect the variable's semantics and the actual renderer mapping. Matching color attributes cannot establish either. A grayscale or accessible data view can be a valid alternative when color adds no necessary distinction. [Good/bad example](../examples/behavior.html?rule=DR-016).

**Mark visibility:** Meaningful marks must also be distinguishable against their actual
map/chart substrate. A semantically appropriate palette can still have weak contrast.
[W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
describes 3:1 against adjacent colors for relevant graphical objects. `mark-contrast`
provides a partial check for solid CSS backgrounds only; complex paint is unassessed.
Retain redundant labels and review the full rendered substrate. This does not automate
semantic palette selection or certify accessibility. [Expanded decision-surface reference](https://github.com/lanej/viewrule/blob/main/docs/design-examples.md#expanded-analytical-decision-surface).

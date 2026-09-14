# DR-016 — Rule of Meaningful Color

**Principle:** Color scales match the structure of the data.

**Requirement:** Choose color encodings according to what they represent: unordered categories, ordered magnitude, or deviation around a meaningful reference. Identify the mapping and preserve essential distinctions without color alone.

**Why:** ColorBrewer's scheme guidance distinguishes qualitative, sequential, and diverging encodings. This rule asks whether the mapping is appropriate; DR-005 asks whether an established meaning remains consistent. Those are separate questions.

**Application:** Use qualitative colors for carrier identity, a sequential treatment for increasing dwell, and a diverging treatment for deviations around an actual service target. Provide readable labels and a legend or equivalent explanation.

**Exception:** An explicitly ordered category set or a meaningful threshold may justify a different treatment. Explain it. A diverging midpoint must not imply an analytical reference merely because it is the mathematical midpoint of a palette.

**Review:** Inspect the variable's semantics and the actual renderer mapping. Matching color attributes cannot establish either. A grayscale or accessible data view can be a valid alternative when color adds no necessary distinction. [Good/bad example](../examples/behavior.html?rule=DR-016).

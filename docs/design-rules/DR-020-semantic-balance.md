# DR-020 — Rule of Balance

**Principle:** Visual weight reflects semantic priority; peers do not acquire
accidental differences in prominence.

**Requirement:** Declare which elements have equivalent priority and which have
different roles. Specify the observable treatment that should be shared by peers
or reserved for a primary role: type scale, supported color treatment, alignment,
and bounded dimensions. Do not infer those roles from their current appearance.

**Falsifier:** Two equivalent service offers share an 18-pixel heading contract;
one renders at 28 pixels without a difference in its declared role. The computed
style fails even when its class and metadata still say it is a peer.

**Enforcement:** Existing scoped `style`, `align`, `relative-position`, and size
checks can falsify those declared choices. A concrete accepted/rejected pair must
keep the facts and task constant and alter the actual treatment. This is partial
enforcement: equal font sizes alone do not establish equal visual prominence.

**Exception:** Different priorities may justify intentional asymmetry. An urgent
exception and its supporting totals should not be forced into equal prominence.
Variable content length need not produce identical card heights. A primary panel
beside a smaller supporting panel is not a failure of symmetry.

**Limits:** No universal symmetry, salience, balance, or beauty score is implemented.
The semantic choice remains review, as in DR-013; measurements protect its chosen
expression. These are Viewrule conventions, not experimental claims about the
viewer’s attention.

[Executable composition example and measurement scope](../composition.md).

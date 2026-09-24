# DR-017 — Rule of Alignment

**Principle:** Related elements share intentional visual anchors.

**Default:** Declare which elements are peers and which edge or reading anchor
expresses their relationship. Align those peers consistently within that scope.
Do not create an extra alignment axis for one item without a functional reason.
This applies to headings, labels, controls, and component boundaries, not only
numeric tables. It complements DR-006's requirement to keep evidence together.

**Application:** Align form labels with their inputs and section headings with the
content they introduce. Compare like roles within each repeated component; do not
align every element on the page to one global edge. In a mixed content/action row,
a shared optical or text baseline may matter more than matching outer rectangles.

**Exceptions:** Hierarchical indentation, different semantic roles, responsive
reflow, and optical correction can justify different anchors. Preserve content,
text adaptation, and usable targets rather than forcing geometrical uniformity.
An icon's border box is not necessarily its visible center.

**Enforcement:** Existing `align` measures the spread of a declared peer set's
left, right, top, or bottom edges in CSS pixels. Declare each set separately and
calibrate its tolerance. `relative-position` can check relationships within
repeated components. Neither infers peers, measures a font baseline, nor proves
optical alignment. Baselines and unnecessary anchor proliferation remain review.
Start composition constraints as warnings; use errors only for established
application contracts.

**Basis:** Carbon's [2x Grid](https://carbondesignsystem.com/elements/2x-grid/overview/)
provides a design-system example of consistent spatial structure. This rule and
its scope conventions are Viewrule guidance, not a requirement to adopt Carbon,
a particular grid, or experimentally established pixel tolerances.

[Composition contracts and calibration example](../composition.md).

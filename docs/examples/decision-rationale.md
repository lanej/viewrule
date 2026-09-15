# Synthetic operations decision contract

This is an authored fixture contract, not user approval. All content and schematic
geography are invented. The same 1440×1100 CSS px desktop rules apply to both layouts.

## Summary density

DR-007. In the summary region, require text union coverage of at least 0.06 and
an empty vertical band no greater than 48 CSS px. This existing `region-density`
proxy targets oversized supporting space; it does not measure semantic information
yield or treat the large map's box as additional evidence.

## Repeated summaries

DR-007/008. Each declared headline measure appears once per decision surface.
Readiness and observation count are required identities. Repetition in the detailed
evidence table can supply legitimate comparison context and is outside this summary
scope. Distinct populations/periods/units need distinct keys. Counts do not infer
semantic redundancy or completeness of the application's annotations.

## Evidence distance

DR-006. Require at most 80 CSS px between the evidence text bounds and recommendation
text bounds. Compact intervening content without shrinking text. The relationship
is authored; geometry cannot establish semantic support or simultaneous visibility.

## Scalar context

DR-007/008. The two labeled scalar positions have a 56 CSS px container-height limit
using existing `max-height`. Rich plots are outside this selector. Whether an
indicator needs a chart or compact text remains a task-specific judgment.

## Mark contrast

DR-007/016. The six HTML facility marks use opaque CSS backgrounds over a containing
solid map background. Require an unrounded contrast ratio of at least 3:1. This follows
[W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
for relevant graphical objects. It is a partial computed-color model, not WCAG
certification. Unsupported paint is explicitly unassessed; sibling map layers,
anti-aliasing, outlines, palette semantics, and actual mark visibility need review.

## Preserved evidence

DR-003/007. Keep all summary, scalar, table, facility labels, caption, recommendation,
and action content. Retain at least 14px computed text and a 480×340 CSS px map.
The map occupies roughly half the evidence width. Facility/locality resolution and
meaningful use of the map remain human-reviewed. The good layout compresses hierarchy,
not type; the bad layout intentionally wastes supporting space.

The density, distance, and dimension thresholds are fixture choices, informed by
[Tufte's graphical economy and comparison principles](https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/).
They are not source-prescribed values or universal design requirements.

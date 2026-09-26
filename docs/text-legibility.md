# Scoped text legibility

Two opt-in contracts close specific gaps found in the [archived capacity
trial](../benchmarks/workflow/capacity-trial-2026-09-25/README.md). Neighboring
labels can collide despite separate element boxes. A native select can lose its
visible selected label while its DOM value and scroll dimensions remain valid.
These are layout measurements, not a universal readability score.

## Neighboring text fragments

```json
{
  "id": "queue-labels",
  "type": "no-text-overlap",
  "selector": ".queue-row",
  "items": ".mobile-label",
  "tolerance": 1,
  "severity": "error",
  "reason": "Keep the queued and used-capacity labels distinguishable."
}
```

Each selected group needs 2–64 visible, non-nested descendant text peers. Hidden
responsive alternatives are excluded. Text under `display: contents` is included.
Whitespace-trimmed DOM `Range` fragments are compared **between peers**, never
within one label. A failure means that two fragments intersect by more than
`tolerance` CSS px on **both** axes. Tolerance is authored, from 0 to 4 CSS px;
there is no inferred relationship or page-wide all-text scan.

Wrapped labels can pass even when their enclosing boxes overlap: empty space
between lines is not text. Measurements record peer descriptions, bounded text
excerpts, fragment counts, the total intersecting fragment-pair count, and up to
64 intersections with zero-based peer indices and width/height. Repeated fragment
intersections are not independent usability defects.

Missing required groups, insufficient peers, empty text, nested peers, or more
than 256 fragments in a group are unassessed. So are non-HTML content, native
control internals, generated text, detected shadow content, scaled/rotated text,
vertical writing, clipping fragments, and detected masks/paint effects. Scope
such content separately and inspect its capture. Closed shadow trees cannot be
enumerated; avoid mixing their hosts into a DOM-text contract.

This falsifies a declared fragment-separation boundary (DR-006/DR-015). Range
rectangles include typographic space and are not glyph outlines. Occlusion,
background contrast, optical spacing, font comprehension, and the relevance of
the declared neighbors remain human judgments. It does not certify all text is
visible, nor replace `no-clip` or `within-bounds`.

## Native selected-label space

```json
{
  "id": "queue-sort-label",
  "type": "select-label-space",
  "selector": "#sort",
  "tolerance": 1,
  "severity": "error",
  "reason": "The current sorting criterion must be identifiable without opening the menu."
}
```

For each visible native single-selection dropdown, copy its computed styles into
a temporary, isolated single-option select containing the **currently selected
option's label**. Measure its unconstrained intrinsic border-box width in the
capture browser, then remove the probe. This includes that browser's native
theme allocation; no fixed arrow inset is guessed. The authored boundary is:

`max(0, required intrinsic width − available border-box width) ≤ tolerance`

The report retains the selected label (bounded excerpt), both widths, and the
deficit in CSS px. Unselected longer options do not increase the requirement;
use representative selected states/checkpoints to cover them. HTML `label`
attributes take precedence over option text. Native `scrollWidth` is not a
selected-text clipping detector.

This is a conservative **intrinsic-space contract**, not measurement of the
painted selection or the open popup. Chromium's [intrinsic select
layout](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/layout/layout_box.cc)
uses option text and native theme padding; [CSS UI](https://www.w3.org/TR/css-ui-4/#appearance-switching)
allows native widgets to disregard some CSS. Inspect the current browser's
native-scale image, including control height. Different operating systems,
themes, or engines can produce different widths; comparisons already retain
browser identity. This contract does not claim pixel-exact truncation detection.

No selected label, a non-select target, multi-select/listbox, grouped/rich option,
custom appearance/background image, text indentation, ancestor clipping,
unsupported geometry/paint, or loading fonts is unassessed. Supported appearances
are `auto`, `menulist`, and `menulist-button`, with horizontal writing and no scale
or rotation. An unassessed observation emits a finding at the configured severity
and cannot supply checked coverage. Optional absent selectors remain skipped.

Choosing which labels must fit, acceptable shortening, accessible full-text
inspection, control meaning, and task usability remain human decisions (DR-015).
No default rules or existing `no-overlap` / `no-clip` meanings change.

## Regression and application evidence

The existing installed workflow exercises [reduced failures, repairs, valid
wrapping, and unsupported evidence](../test/templates/text-legibility.html) in one
capture. These are calibration cases derived from observed defects, not held-out
evidence of prevention effectiveness. Historical trial reports are unchanged.

Parcel desk adds persistent filter captions under its own scoped contract. Its
previous controls already had sufficient native width. Saved first/final source,
reports, native images, and an annotated comparison distinguish that passing UI
change from the deliberately failing regression. See [the application exercise
protocol](../benchmarks/workflow/text-legibility-protocol.md).

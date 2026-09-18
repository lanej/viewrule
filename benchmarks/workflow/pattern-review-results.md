# Pattern review calibration evidence

The [executable fixture](../../docs/examples/pattern-review.html) reconstructs the
supplied screenshot's layout relationships using invented neutral data. It runs
through the existing packed/installed CLI regression, using one explicit contract per revision
shared by all four states. The source screenshot is not a repository asset.

## Initial calibration at ea502da (superseded after feedback)

Captured on 2026-09-18 with Node 24.9.0, macOS arm64, Playwright 1.62.1 and its
Chromium 151.0.7922.34, at **1440 × 1000 CSS px**, device scale 1. Heights below
are rounded CSS px, not portable screenshot baselines. CI regenerates measurements
on Linux; assertions use the authored bounds and relative relationships.

| Stage | Component findings | Composition findings | Evidence panel height | Total surface height |
| --- | --- | --- | ---: | ---: |
| Before | Header 176 > 128; toolbar 100 > 64 | Evidence height > 360; 0 of 3 complete ranking cards fit | 652 | 1,266 |
| Component only | None | Evidence height > 360; 0 of 3 complete ranking cards fit | 556 | 1,067 |
| Composition | None | None | 264 | 676 |
| Hidden evidence | None | Required denominator, trend value and comparison missing from visible context | 264 | 676 |

That initial composition retained the **234 px chart height and identical chart
width, samples, and text sizes**. The user subsequently rejected its remaining
overhead and the before-by-default handoff; these are historical measurements. It preserves every ranking value/weight,
denominator, comparison window, confidence/direction label, context-only label,
and missing-value summary. Five initial tall cards and one full-width context card
are retained as six evidence groups; repeated framing and stretching are removed.
The finite accepted layout may leave unused page space. The equally small hidden
control fails, so height alone cannot establish acceptance.

The same application walkthrough passes actual history range changes (4/8/all
cycles), retains the fixed ranking window, operates native disclosure with Enter,
retains focus and required facts, and verifies that neither viewing nor expanding
queues a review. The explicit local action targets Q7; later view changes preserve
that action state. The built example also loads below the `/viewrule/` Pages prefix.

## Revision after direct layout feedback

The default route now opens the revised composition, with before/component/hidden
states explicitly labeled rejected. Identity and status share a row; the latest
cycle value sits next to the chart selectors. One context pill owns three aligned
single-line context rows, including collection mix. The chart and ranking evidence
sit side by side, with context directly below the chart. A current/prior bullet
comparison replaces the redundant narrative while preserving the denominator,
trend, weights, missing-value states, and secondary explanations.

After follow-up feedback, the three ranking weights also use horizontal bars on
aligned, equal-width 0–100% tracks, retaining exact 45%, 35%, and 20% labels. They
encode comparable shares of the total assigned weight. Each Details control sits
under its row's subject label at the left. The review-rate comparison and weight
bar share a horizontal centerline; distinct colors and labeled domains keep their
different meanings clear. Expanded supporting text remains below the control.
Application assertions check proportions, shared tracks, bar alignment, and
disclosure placement.

The user's feedback explicitly changes the earlier chart-size assumption: retain
the 0–50% scale and samples in a 120–160 px figure, not an arbitrary 234 px area.
Additional checks cap the full surface at 560 px and the title/status header at
56 px. Application assertions verify header/control centerlines, adjacent latest
value, context-label alignment and single-line values, a shared visible/contextual
pill, and the current bar/prior marker proportions. Existing type, target, fact,
and interaction requirements remain enforced. This is a fixture-contract revision;
no preset or engine rule is weakened.

The revised capture at the same 1440×1000 CSS px viewport measures:

| Measurement | Previous composition | Revised composition |
| --- | ---: | ---: |
| Full surface | 676 px | 452 px |
| Identity/status header | 88 px | 47 px |
| History figure | 234 px | 150 px |
| Latest-value gap from selectors | Far edge of toolbar | 10 px |
| Repeated context-role labels | 3 | 1 shared pill |

All three context rows are 32 px tall; their labels and values each occupy one
20.3 px text line. Header/status and selector/latest-value centers align within
one CSS pixel. Current/prior marks use 52.8% and 57.75% of the shared 0–50% track.
The composition has no findings; the equally compact hidden-evidence control still
fails the three required-context selectors. Before and component-only also fail
new header/chart/whole-surface budgets. The right-hand evidence panel now contains
only the three ranking factors, so its height is not directly comparable to the
old six-group panel; the full-surface measurement includes all six groups.

Current measurements are retained in `captures.json` with the full CLI report and
native-scale captures. Original tall five-card/full-width-card states remain
available as regression controls.

## Evidence and limits

`npm test` writes `dist/pattern-review-evidence/`: `cli/` contains the raw report,
contract snapshot, overview and native-scale detail tiles; the PNGs capture all
four states plus expanded detail; `captures.json` records browser, viewport, rule
findings by scope, geometry, concrete facts, and interaction results. PR CI uploads
that directory as **pattern-review-evidence**. Captures are review evidence, not
image snapshot assertions. The fixture [contract](../../docs/examples/pattern-review-design.md)
and [expected findings](../../docs/examples/pattern-review-catalog.json) define the
specific claims; no new detector or preset threshold is introduced.

This is an inspected calibration case. It demonstrates the need for both scopes
under the authored task assumptions, not an observed improvement in autonomous
generation quality or cost. Relevance, sufficiency, semantic redundancy, and real
ranking/forecast validity still require task-owner judgment. No human design
approval is recorded. The paired agent trial and other unmaterialized cases in the
[workflow protocol](README.md) remain outstanding.

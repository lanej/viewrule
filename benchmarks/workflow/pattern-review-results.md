# Pattern review calibration evidence

The [executable fixture](../../docs/examples/pattern-review.html) reconstructs the
supplied screenshot's layout relationships using invented neutral data. It runs
through the existing packed/installed CLI regression, using one unchanged contract
for all four states. The source screenshot is not a repository asset.

## Observed local result

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

The accepted composition retains the **234 px chart height and identical chart
width, samples, and text sizes**. It preserves every ranking value/weight,
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

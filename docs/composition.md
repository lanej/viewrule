# Composition contracts

Composition adds a second review question: after preserving the evidence needed
for the task, has the interface organized it to reduce unnecessary visual work?
This is guidance, not a claim that geometry proves task success.

The policies are [Alignment](design-rules/DR-017-alignment.md),
[Rhythm](design-rules/DR-018-rhythm.md),
[Spatial Economy](design-rules/DR-019-spatial-economy.md), and
[Balance](design-rules/DR-020-balance.md). Their enforcement mode remains `review`:
scoped automated checks establish only the declared geometric relationships.

## Declare meaning before measuring geometry

Name the task and attention order, its finite evidence set when applicable,
semantic peers, group boundaries, and intentional asymmetries. Select meaningful
roles, not all cards or all descendants. State the supported viewport and content
state. Record exceptions before implementing the UI, not after a failed check.

Start with warnings and calibrate against a rejected and an acceptable example.
Promote only established application boundaries to errors. Never weaken a
requirement or relabel evidence merely to make a layout pass. No composition
threshold is installed into existing application rules or added to the default
baseline/analytical presets.

## Measurements

All new checks are opt-in, use `selector` for a containing scope and `items` for
its descendants, and share the usual `id`, `reason`, `severity`, page/viewport
scope, and optional-selector fields. Existing `align` instead selects peers
directly. Configuration/report versions remain 1.

| Check | Required fields beyond the common fields | Measurement and limits |
| --- | --- | --- |
| `align` (existing) | `edge`, `tolerance` | Spread of declared peer edges in CSS px. No optical or text-baseline inference. Default rationale now includes DR-017. |
| `spacing-rhythm` | `items`, `axis`, `maxSpread` | At least three independent peers on one line. Sort by rendered x or y position; compare largest minus smallest adjacent gap in CSS px. Reject overlap and wrapping rather than flattening them. |
| `group-separation` | `groupSelector`, `items`, `axis`, `minRatio` | At least two disjoint groups, each with at least two members. Compare smallest gap between member envelopes with largest adjacent gap inside any group. Every selected item must belong to one group. `minRatio` is greater than 1. |
| `peer-size` | `items`, `dimension`, `maxRatio` | Largest/smallest width, height, or area among at least two independent peers. `maxRatio` is at least 1. It is not a salience score. |
| `region-budget` | `items`, `maxRatio` | Union of declared chrome rectangles / visible region area. `maxRatio` is between 0 and 1. Clip to viewport and overflow ancestors; overlapping or nested boxes are counted once. |
| `viewport-yield` | `items`, `keyAttribute`, `expectedKeys`, `referenceViewport`, `minYield`, `minFontSize` | Exactly one task region. Count distinct declared identities with complete visible boxes and readable text, then compare the same page/checkpoint across viewports. Preserve reference identities and exempt a saturated finite task from the yield floor. |

`axis` is `x` or `y`; `dimension` is `width`, `height`, or `area`. Selector
ownership, relevance, and thresholds remain application decisions. General
padding, typography, and content changes can affect these measured relationships
without any change to a CSS `gap` value.

For grouping, require positive external separation and
`minBetween >= minRatio * maxWithin`. When all internal gaps are zero, report the
ratio as null rather than divide by zero; positive external separation still
satisfies the relationship. Use this only where proximity is the grouping cue.

### Viewport-growth yield

Let `N` be the count of eligible identities and `A` the CSS viewport area:

```text
areaGrowth     = current.A / reference.A - 1
evidenceGrowth = current.N / reference.N - 1
yield          = evidenceGrowth / areaGrowth
```

The relative-growth form is dimensionless; dividing a raw evidence count by raw
pixels would not be comparable between applications. The reference must expose
at least one eligible identity. The target must be larger with neither dimension
reduced. Missing reference captures, changed checkpoints, invalid identities,
unreadable evidence, or incomparable viewport geometry cannot create a pass.

A 100% area increase with 50% more evidence has yield 0.5. This is a description,
not a recommended threshold. `expectedKeys` declares the complete finite set for
the fixture/task, not an inferred collection. When every key is visible, report
`saturated` and stop demanding growth. Repeated identities cannot increase the
count. Declare separate `comparison-set` checks for critical evidence that must
always remain visible; identity counts alone do not establish decision sufficiency.

### Missing evidence and reporting

An optional missing root is skipped. Missing required roots or insufficient,
nested, wrapped, or otherwise unmeasurable required member sets emit findings and
remain unassessed for required design coverage. One complete group does not hide
another incomplete group. A region budget with no visible declared chrome is not
a zero-cost success; scope an intentionally chromeless state separately.

Raw observations are in `page.metrics.composition`. Failures join the normal
findings with selectors, measured/expected values, reasons, DR citations, and
remediation guidance. Cross-viewport observations include the reference/comparison
state and measured growth. A passing check is not approval of semantic grouping,
priority, task value, or overall design quality.

### Geometric limits

Measurements use axis-aligned client rectangles. Overflow clipping is considered
for area/yield, but arbitrary painted occlusion, clip paths, masks, rounded corners,
canvas content, transformed ancestors, optical alignment, and perceived visual
weight are not certified. Inspect full-resolution captures. Hidden responsive
variants do not count; offscreen peers can still be measured for rhythm and size.
Scope initial-viewport visibility separately when that matters.

Prefer width contracts over equal heights when content may wrap. Preserve
readable type, content variation, text adaptation, and usable interaction targets.
Do not invent an occupancy target, a global symmetry requirement, an alignment
anchor-count ceiling, or a universal good-design score.

## Runnable calibration example

The [composition fixture](composition-fixture.html?variant=good) and its
[warning-only contracts](composition-rules.json) are a small engine calibration
example, not a new canonical Easy UI showcase. The same fixture supports
`?variant=bad` (accidental misalignment, uneven gaps, confused groups, oversized
peers/chrome, and stretching without more evidence) and `?variant=finite`
(intentional asymmetry and useful whitespace after all task evidence is visible).
The data is synthetic and no human approval is recorded.

The test-package workflow exercises the fixture through the real CLI, asserting
the specific rejected findings and the accepted/saturated observations. Its
fixtures use error severity deliberately to test enforcement. Application adoption
still requires editing selectors, identities, and thresholds to match the task.

## Deliberately not implemented

No optical-baseline detector, salience model, arbitrary anchor-count score,
spacing-token entropy score, inferred container inflation, or automatic relevance
classifier is provided. These require explicit review or more narrowly defined
contracts. The available measurements do not pretend to establish those claims.

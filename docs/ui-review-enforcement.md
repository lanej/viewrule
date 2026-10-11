# Detecting and enforcing design rules

Saved-run [comparisons](saved-comparisons.md) can display scoped measurements and
optional recorded DOM regions with authored commentary. Comparison annotations
have no enforcement authority, satisfy no design-rule coverage, and do not record
approval. Missing region geometry is an explicit presentation gap; use a required
rule when the region's presence is part of acceptance.

The [design rules](design-rules.md) define the intended outcomes. `viewrule`
checks configured, observable conditions and cites the relevant rule IDs in its
HTML report, JSON output, and verification findings. Each run preserves a local
design-rule reference and its source hash so the cited text stays with the report.

Before selecting a layout, use `contract` to read the effective merged boundaries.
The [authoring workflow](rule-authoring.md) previews scoped additions and makes
constraint changes visible in reports. [Research notes](design-principles.md) explain
why controls/prose use warnings and numeric alignment uses explicit annotations.

## Coverage and evidence

| Design rule | Available detection | What still needs judgment or integration |
| --- | --- | --- |
| [DR-001](design-rules.md#dr-001--comparable-charts-use-comparable-scales) — Comparable scales | `consistent` checks declared units, periods, domains, transformations, and computed plot dimensions for a comparison identity. | The app must expose metadata from its actual renderer configuration. Equality of attributes cannot prove the drawn scales are correct or the comparison appropriate. |
| [DR-002](design-rules.md#dr-002--visual-magnitude-reflects-numerical-magnitude) — Proportional magnitude | `attribute` checks explicit baseline, area-encoding, or projection declarations. | Actual mark-to-value proportionality requires the renderer and data; generic DOM checks do not measure canvas marks or validate the underlying quantities. |
| [DR-003](design-rules.md#dr-003--quantities-carry-the-context-needed-to-interpret-them) — Context | `context` requires visible, nonempty labels within the declared component or shared group. | The source, denominator, period, and baseline must actually describe the data. |
| [DR-004](design-rules.md#dr-004--missing-and-estimated-values-remain-distinguishable) — Missing/estimated values | `context` can require labels on elements the app identifies as estimates, forecasts, or missing values. | Detection of null-to-zero coercion, undeclared interpolation, or fabricated uncertainty requires data integration. |
| [DR-005](design-rules.md#dr-005--visual-meanings-stay-consistent) — Consistent meanings | `consistent` compares computed colors/styles and declared symbols by stable identity; optionally compares inline SVG structure and identities across pages. | Identity and semantics must be correct. SVG structure is not painted equivalence; scope themes and interaction states explicitly. |
| [DR-006](design-rules.md#dr-006--related-evidence-stays-visible-together) — Simultaneous comparison | `comparison-set`, alignment, overlap, clipping, visible-count, declared `evidence-proximity`, per-component `required-elements` and `relative-position` checks. | Decide which alternatives and relationships matter; geometry alone cannot select the task. |
| [DR-007](design-rules.md#dr-007--larger-screens-expose-useful-detail-and-preserve-legibility) — Larger screens | `comparison-set` preserves identities, requires configured counts and readable type, plus density and full-resolution capture checks. | Useful additional information and comfortable reading still require visual review. |
| [DR-008](design-rules.md#dr-008--decoration-earns-its-space-and-visual-weight) — Decoration | Scoped `max-height` (including declared scalar context), `style`, and `repeated-metric` identity-count checks can limit known sources of clutter. | Whether a boundary, label, or control earns its place is a design judgment; start these checks as warnings. |
| [DR-009](design-rules.md#dr-009--system-status-reflects-the-available-evidence) — State honesty | Scoped `context` checks can require visible state, as-of, and refresh labels in controlled fixture states. | Truth against server responses, completion, freshness, and status announcements need integration and interaction review. |
| [DR-010](design-rules.md#dr-010--interactions-preserve-the-working-context) — Continuity | Existing attribute checks can inspect a declared final selection; they do not run journeys. | Compare real identity, filters, entered values, focus, and position before and after interaction. |
| [DR-011](design-rules.md#dr-011--controls-communicate-their-action-and-scope) — Action clarity | `context` can require visible scope; axe checks some name/role failures. | Understandability, signifiers, disabled explanations, and actual consequences require review. |
| [DR-012](design-rules.md#dr-012--safeguards-match-consequences-and-preserve-work) — Safeguards and recovery | `context` can require persistent error and review information in a fixture state. | Verify retained input, correction, retry, real reversal, and proportional safeguards through the application. |
| [DR-013](design-rules.md#dr-013--visual-emphasis-follows-the-tasks-priority) — Task emphasis | Explicit project `style` checks can flag known token deviations. | Task importance and attention order remain judgment; no universal hierarchy score is implemented. |
| [DR-014](design-rules.md#dr-014--essential-interactions-do-not-require-a-pointer) — Input access | Existing axe checks report their actual static findings. | Real keyboard traversal, activation, dismissal, focus, touch, and screen-reader behavior require interaction review. |
| [DR-015](design-rules.md#dr-015--layout-survives-content-variation-and-text-adaptation) — Content resilience | Existing clipping, overlap, font-size, and overflow checks run against difficult fixtures and configured `textScale`. | Truncation's effect on meaning, full zoom, spacing preferences, and unsupported locales remain unassessed. |
| [DR-016](design-rules.md#dr-016--color-scales-match-the-structure-of-the-data) — Semantic color scales | Explicit `style`, `attribute`, and `consistent` checks can inspect a known renderer contract; `mark-contrast` measures a declared solid CSS mark/substrate relationship. | Variable structure, a meaningful center, actual color mapping, and useful redundant labels need review. |
| [DR-017](design-rules/DR-017-alignment.md) — Alignment | `alignment-residual` bounds the maximum distance of declared peer edges or centers from their median anchor in CSS px. | Peer membership, the useful anchor, optical alignment, text baselines, and appropriate exceptions need review. |
| [DR-018](design-rules/DR-018-rhythm.md) — Rhythm | `gap-variance` bounds the coefficient of variation of adjacent border-box gaps along one declared axis; overlapping sequences fail. | The intended sequence, equivalent relationships, group separation, and useful absolute spacing need review. |
| [DR-019](design-rules/DR-019-spatial-economy.md) — Spatial economy | `viewport-growth-yield` compares fractional growth of visible, legible identities with fractional growth of usable region area against a named reference; `chrome-allocation` bounds a declared union-area ratio. | Relevant evidence units, exhaustive finite sets, justified chrome, information quality, and useful whitespace remain task judgments. |
| [DR-020](design-rules/DR-020-balance.md) — Balance | `peer-footprint` bounds the coefficient of variation of declared peer areas or computed font sizes. | Equal priority, warranted differences, optical size, contrast, imagery, and perceived salience need review; symmetry is not required. |

Each page/viewport lists all twenty IDs as `checks-passed`, `findings`, or
`unassessed`. `checks-passed` means the configured conditions passed; it does not
certify the complete requirement. Optional selectors with no visible matches
remain unassessed. An unavailable capture cannot establish coverage.

The [behavior examples](examples/behavior.html) and their machine-readable
[catalog](examples/behavior-catalog.json) distinguish fixture assertions from native
engine checks. No new default heuristic, interaction runner, or subjective score is
added for DR-009–DR-016. New IDs are supported by the schema, policy, reports,
`requiredDesignRules`, and explicit rule citations; unrelated checks do not gain
those citations automatically.

The [composition examples](examples/composition.html) exercise DR-017–DR-020
through explicit groups and region contracts. These checks introduce no default
thresholds or page-wide aesthetic score. Missing or insufficient required
measurement evidence cannot establish a pass. A yield reference supplies observed
identity, legibility, and area evidence; only non-reference targets have an assessed
growth comparison. See the [full semantics](ui-review.md#composition-contracts)
before authoring a contract.

## Project requirements

Keep routes, readiness selectors, and viewports in `.ui-review/config.json`.
Choose representative CSS viewport sizes and stable data for the same page state.
Add a coverage requirement when a design rule must have executed evidence:

```json
"requiredDesignRules": ["DR-001", "DR-003", "DR-006", "DR-007"]
```

This fails the check if any configured page/viewport has no executed check with
visible evidence for a required ID. It prevents an absent or skipped check from
satisfying the gate. It does not transform a partial check into proof of the
whole design rule. Scope the configured pages/states to the evidence you require.

In `.ui-review/rules.json`, `severity: "error"` blocks a pass; `"warning"`
reports a concern without blocking. Cite `designRules` explicitly when a check
serves a different requirement from its default type mapping. Attribute checks
always require an explicit citation. Unknown IDs and unknown check fields fail
configuration validation.

## Preserve comparisons across viewports

Give each selected observation a stable identity generated from the underlying
entity and measure. Repeated elements with the same identity count only once.

```html
<tr data-comparison="carrier-a">...</tr>
```

Example rule for a fixture with at least twelve relevant alternatives. The
counts and type size below are illustrative project choices, not global defaults:

```json
{
  "id": "carrier-comparison",
  "type": "comparison-set",
  "selector": "tbody tr",
  "keyAttribute": "data-comparison",
  "requiredKeys": ["carrier-a", "carrier-b"],
  "preserveFrom": "desktop",
  "minVisibleByViewport": {"desktop": 8, "4k": 12},
  "minFontSize": 14,
  "viewports": ["desktop", "4k"],
  "designRules": ["DR-006", "DR-007"],
  "severity": "error",
  "reason": "Keep the primary alternatives together and expose more at 4K."
}
```

The check requires complete boxes inside the initial viewport and their clipping
ancestors, counts distinct identities, and checks the text sizes inside each
selected element. At viewports at least as wide and tall as `preserveFrom`, it
also requires every identity visible in the reference to remain visible. The
reference must be among the check's active captures; each active viewport needs
a count. It does not detect every form of occlusion, CSS transform scaling, or
text drawn in canvas. Use clipping/accessibility checks and inspect detail tiles.

## Compare renderer metadata and styles

An app can expose its real configuration on the chart container. Generate these
attributes from the same values passed to the renderer; independently maintained
annotations would provide weak evidence. This example compares magnitudes:

```html
<figure data-comparison-group="carrier-cost"
        data-unit="USD/parcel" data-period="2026-08"
        data-y-domain="[0,10]" data-y-scale="linear">...</figure>
```

```json
{
  "id": "carrier-cost-scales",
  "type": "consistent",
  "selector": "[data-comparison-group='carrier-cost']",
  "keyAttribute": "data-comparison-group",
  "properties": ["width", "height"],
  "attributes": ["data-unit", "data-period", "data-y-domain", "data-y-scale"],
  "designRules": ["DR-001"],
  "severity": "error",
  "reason": "Comparable cost plots share units, periods, scales, and dimensions."
}
```

Use the actual plot-area element if the outer container includes variable labels
or margins. Values are compared as strings, so serialize metadata consistently.
Dimensions in this example must match across active captures too; scope the rule
to one viewport or omit them when intentional resizing preserves interpretation.
For DR-005, use an entity identity with properties such as `color`, `fill`, or
`stroke` and attributes for symbols; choose properties actually used by the mark.

An `attribute` rule can require a declared bar baseline:

```json
{
  "id": "amount-bar-baseline",
  "type": "attribute",
  "selector": "[data-chart-kind='amount-bar']",
  "attribute": "data-y-min",
  "allowed": ["0"],
  "designRules": ["DR-002"],
  "severity": "error",
  "reason": "Ordinary amount bars use a zero baseline."
}
```

For DR-004, scope `context` to actual estimated/forecast elements, require their
visible explanatory labels, and cite `"designRules": ["DR-004"]`. This checks
the presentation of declared states; data correctness remains unassessed.

## Starter constraints and text geometry

[Built-in preferences and presets](defaults.md) provide an editable starting opinion.
`init` defaults to baseline rules; `--preset analytical` adds explicit comparison
annotations and thresholds. Existing application rules are not rewritten on upgrade.

`min-font-size` checks computed CSS text sizes below its selector and cites DR-007.
`max-text-gap` checks adjacent text-range gaps within declared rows and cites DR-006
and DR-007. It requires two nonempty text items with a shared reading band, so a
missing pair or stacked layout cannot masquerade as a passing proximity check.
The measurement uses actual text bounds rather than cell widths: widening a table
can increase the measured gap while preserving the same comparison count.
Neither check establishes semantic relevance or every form of clipping/occlusion.

[Component relationships](component-relationships.md) extend these checks to
text-free graphics and peer positioning. They preserve each component's required
parts and bounded spacing without prescribing grid/flex CSS or universal density.
Optional `consistent` settings compare SVG structure and shared identities across
selected pages; existing page-local behavior remains the default.

DR-017 also has a narrow advisory discovery path for ordinary text-entry controls.
The browser groups nearby side-by-side inputs/selects/textareas only when similar
control heights and a shared local grid/flex ancestor support the hypothesis. A
top-anchor residual above the discovery trigger is preserved under
`metrics.peerInference` with the controls, anchors, heuristic signals, reason, and
remediation suggestion. This is deliberately not a configured finding: inferred
peer membership can be wrong, the trigger is not a project acceptance threshold,
and the candidate never changes the check exit code or design-rule coverage. Use it
to inspect a likely omission, then author a scoped `alignment-residual` rule only
when the task actually requires that relationship. The report visualizes the same
saved candidate geometry over the original capture with a dashed group outline,
individual control boxes, a median-anchor guide, and signed per-control offsets.
That overlay is evidence navigation only: it is toggleable, does not modify the PNG,
does not use pixel inference, and has no enforcement authority.

## Enforcement and repair

`viewrule check` returns 0 when configured error checks pass, 1 for detected
failures, and 2 for configuration/setup errors. A required CI job can gate a
merge on that exit code. Warnings and unrequired unassessed rules stay visible.
Required coverage, missing required selectors, incomplete captures, and stale
source/configuration/policy evidence cannot satisfy the corresponding gate.

`viewrule verify` requires a current passing report and includes up to five
blocking findings with their design IDs and report path. Optional Git gates reuse
that verification for affected staged or pushed UI inputs; Stop events are never
blocked. Code, runtime setup, rules, and design documents participate in freshness
checks. See [Git gates](git-gates.md) for installation and migration.

Findings include page, viewport, selector, measured and expected values, the
design-rule citation, and a suggested next action. A coding agent can use this
feedback to repair the application and rerun the same check. There is no
autonomous repair command or automatic source edit. Never fix a result by changing
metadata independently of the renderer, removing comparison identities, or
weakening requirements. Intentional policy adjustments belong in the feedback
and rule-review workflow.

The regression detector remains one representative CLI workflow. It exercises
the broken and repaired responsive comparison, cited findings, feedback
promotion, capture evidence, and stale-result blocking.


The [expanded analytical example](design-examples.md#expanded-analytical-decision-surface)
combines these partial checks under DR-006/007/008/016. Density remains the existing
`region-density` proxy, summary redundancy uses explicit identities, scalar height
uses `max-height`, and unsupported contrast paint stays unassessed. See the
[rule reference](ui-review.md#analytical-decision-surfaces) for scopes, units, and
missing-evidence behavior. DR-008 and DR-016 retain their review enforcement modes.

## Contained chart labels and controls

`within-bounds` compares each selected HTML or SVG element's rendered bounding
rectangle with its nearest matching ancestor's border box. Specify `container`
and a `tolerance` from 0 to 4 CSS px. Missing or hidden required containers fail.
This catches SVG tick labels outside the viewport, where `no-clip` cannot rely on
HTML scroll dimensions. It also works for declared controls and other child boxes.

This is a geometric boundary, not a chart-truth or comprehensive clipping check.
It does not inspect canvas text, SVG clip paths or masks, occlusion, rounded
corners, or intermediate ancestors. Transforms use axis-aligned client rectangles;
rotated content may require a different scope. Intentional local scrolling should
be scoped to its content region rather than the smaller scroll viewport.

The installed regression checks a long currency label crossing its SVG's left
edge and a contained alternative in the same capture, with specific excess, rule,
and DR-006/DR-007 assertions. No default rule is added: the application declares
which content must fit which boundary.

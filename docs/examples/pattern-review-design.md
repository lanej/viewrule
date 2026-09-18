# Pattern review: component and composition contract

This executable calibration case reconstructs the **layout relationships** of a
user-supplied screenshot. The source image is neither committed nor packaged.
Names, identifiers, domain terminology, periods, counts, percentages, weights, and
chart samples are invented. No source pixels, metadata, dates, geographic labels,
or real records are used. This is a proposed fixture contract, not human approval.

## Task and information roles

Decide whether synthetic group Q7 warrants a review. Always show its identity,
status, observation window, rate **with numerator and denominator**, trend and
comparison window, volume, and all three ranking weights. Keep three context-only
summaries visible under one shared **Not used in ranking** pill, including unavailable
values. The pill must visibly and accessibly own all three context rows. Context corroborates investigation; it must not silently become a score.

The three weights are comparable shares of the same ranking score, totaling 100%.
In the revised composition, show their exact percentages and horizontal bars on
equal-width, aligned **0–100%** tracks. Place each factor's Details control below
its weight bar. Keep weight distinct from the measured review rate and trend.

One parent owns the group/window context. Chart range controls change only the
history window, not the ranking window or review state. Queueing a review targets
Q7 only. Explanations, collection diagnostics, and sample values are secondary;
disclosure must preserve the required evidence, chart selection, and action state.
If those diagnostics become routine decision factors, change this contract first.

## Frozen states

The same HTML template and data supply four routes in `pattern-review.html?stage=…`:

| Stage | Component judgment | Composition judgment |
| --- | --- | --- |
| `before` | Rejected: stacked title/context/status and separate chart-control bands. | Rejected: repeated “Why flagged”, five stretched evidence cards plus a full-width context card, expanded explanations, and nested framing. |
| `components` | Accepted for the declared units: compact header/toolbar, labeled controls, readable evidence, secondary disclosure. | Still rejected: the parent retains duplicate framing, a stretched five-card row, and a separate oversized context band. Local cleanup does not repair their composition. |
| `composition` | Same usable units and facts. | Accepted for this fixture: one inline identity/status row, adjacent chart controls/latest value, a compact history plot, ranked evidence beside it, and three aligned context rows under one shared pill. Finite content may leave whitespace. |
| `hidden` | Readable and compact. | Rejected: the denominator and trend are moved inside closed supporting detail. Smaller is insufficient. |

These are authored expectations tested against rendered content, not workflow-agent
transcripts or a before/after generation experiment. Consulted P-001/P-002 corpus
1.2.0, and DR-003/006/007/008/012. Human review still owns relevance, sufficiency,
semantic redundancy, and whether this example generalizes to an actual application.

## Executable boundaries

The revised contract applies to all stages at **1440 × 1000 CSS px**, scale 1:

- Component header: at most **128 CSS px**. This task has one short identity,
  status/context, and a scoped action; avoid multiple tall bands.
- Chart toolbar: at most **64 CSS px**, with direct labeled history controls.
- Type: at least **14 CSS px**; controls at least **32 × 32 CSS px**; chart at
  least **120 CSS px** tall and **600 CSS px** wide. The same data/domain and
  readable scale labels must survive the smaller chart.
- Composition evidence panel: at most **360 CSS px in its initial state**. Five
  short evidence summaries and one context strip should not consume another
  viewport through stretching. Expanded supporting detail has no height budget.
- Composition header: at most **56 CSS px**, with title and status on one row.
- History figure: at most **160 CSS px**; latest value shares the control row.
- Complete initial surface: at most **560 CSS px**, including all context rows.
- All three ranking summaries must fit completely in the initial desktop viewport.
- Required visible, nonempty context selectors include each value, unit, denominator,
  comparison, weight, status, context-only label, missing-value label, and action.

These are fixture-specific `max-height`, `min-size`, `min-font-size`, `visible-count`,
`context`, and `no-clip` checks, not new detectors or universal density thresholds.
The component rule subset is reported separately from the composition subset in
the catalog; running only that subset is not a complete page review. DOM visibility
does not establish semantic truth or rule out every occlusion. Application assertions
independently check concrete text/data, unique framing, same-row header/toolbar
centers, aligned context labels, one-line collection mix, readable chart labels and
unchanged samples/domain, current/prior bar geometry, keyboard disclosure, chart
control scope, and the local review action. The no-query route opens composition.
Weight assertions compare rendered lengths to 45%, 35%, and 20% on the common
track and check that each disclosure sits beneath its own weight.

## Explicit contract revision after user feedback

The initial example incorrectly opened the rejected before state by default. The
user also rejected unnecessary header/status bands, repeated context labels,
inconsistent wrapping, remote latest-value placement, and excessive chart space.
The revised default is composition; the before/component routes retain those
failures for comparison. There is one context pill governing three aligned rows.

This feedback supersedes the original **200 px minimum / unchanged chart size**
assumption. A bounded 120–160 px history figure replaces that arbitrary preservation
rule, while adding whole-surface/header height checks and alignment/data assertions.
This is an explicit fixture-contract change authorized by the user's feedback, not
a preset or engine change. Keep the history's 0–50% domain, samples, 14 px labels,
and controls. A compact 0–50% current/prior bullet comparison replaces the redundant
narrative: current 26.4%, prior 28.875%, with the denominator and trend still visible.
No data or required context may disappear to satisfy the new budgets.

## Run and inspect

From a source checkout, `npm ci`, `npm run browser:install`, then `npm test` exercises
the packed CLI and this example in the existing installed workflow. `npm run
site:preview` serves the example at `/examples/pattern-review.html`. For an isolated
manual CLI run, use a clean checkout with no existing `.ui-review` configuration.
Create that directory and copy `pattern-review-config.json` and
`pattern-review-rules.json` to `.ui-review/config.json` and `.ui-review/rules.json`.
Serve that same checkout, set `baseURL` to the preview server, and run
`node bin/viewrule.mjs contract` then `node bin/viewrule.mjs check`. The contract
and fixture sources are fingerprinted from that checkout.

The regression retains native-scale captures, raw per-stage reports and their
artifacts, component/composition finding groups, CSS measurements, browser identity,
and interaction results in `dist/pattern-review-evidence/`. The default all-stage
check intentionally fails because it includes rejected states. No human approval
is recorded. Paired agent-quality and cost evaluation remains unperformed.

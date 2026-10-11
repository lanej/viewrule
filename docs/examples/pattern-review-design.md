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

The three weights are comparable shares of the total assigned weight, totaling 100%.
In the revised composition, show their exact percentages and horizontal bars on
equal-width, aligned **0–100%** tracks. Place each factor's Details control below
its subject label in the left column. The review-rate comparison and its weight
bar share a horizontal centerline, with distinct colors and labeled domains.
Keep weight distinct from the measured review rate and trend.

One parent owns the group/window context. Chart range controls change only the
history window, not the ranking window or review state. Queueing a review targets
Q7 only. Explanations, collection diagnostics, and sample values are secondary;
disclosure must preserve the required evidence, chart selection, and action state.
Every disclosure's accessible name includes its visible label, **Details**, plus
the subject. Context disclosure controls stay in their original column and row
when opened; only the supporting text expands below. Opening and closing preserves
keyboard focus and the visible context summary (DR-010).
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
track, align the review-rate and weight bars, and check that each disclosure sits
beneath its row's subject label.
The application regression also verifies the six accessible disclosure names and
each context control's position, expanded-text placement, and focus through open
and close interactions.

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


## Remaining review patterns

The same page renders `?case=toolbar|whitespace|changed-task|scopes&quality=good|bad`.
Each pair starts from a complete three-group queue (Q7, Q8, Q9). Both sides retain
identities, sources, classified counts and denominators, authorization constraints,
queue actions, history windows, disclosure text, type and control sizes. Good has
no configured failures; Bad has only the named controlled failure. No source
screenshot or real data enters these cases. Task relevance and human approval
remain judgments, not manufactured machine outcomes.

| Pattern | Baseline and controlled mutation | Verification |
| --- | --- | --- |
| Toolbar scope (DR-003/012) | Direct source filter and visible active-scope label. Bad hides only that label. | `pattern-active-scope` rejects the invisible label; app assertions filter Catalog to Q7/Q8, distinguish view changes from queueing, and retain action state after filtering. |
| Legitimate whitespace (DR-007/008) | Three natural-height rows leave unused viewport space. Bad changes only row minimum height to 240 px. | `pattern-finite-height` caps these short summaries at 180 px. No box-coverage or occupancy minimum is asserted; all facts/actions/type remain equal. This fixture-specific ceiling is not a general whitespace detector. |
| Changed task (DR-003/006) | Revision 1 treats trend as supporting detail. Revision 2 requires it initially before every queue decision. Good moves only the trend out of disclosure; Bad retains the old placement. | Both variants pass the retained v1 contract. Only Bad fails `pattern-routine-trend` under v2; report hashes and artifacts remain separate. This is an explicit requirement change, not retroactive failure or approval. |
| Independent controls (DR-012) | Each group owns its different history window. Bad hoists only those controls into the common toolbar. | `pattern-local-scope` rejects lost row ownership. App assertions preserve independent values and change only Q7's window; the common source filter governs all groups. Shared appearance does not imply shared scope. |

`pattern-review-cases.json` freezes these boundaries and mutations. Browser
assertions retain native-scale separate Good/Bad captures at 1440 × 1000, scope,
measurements, facts and interaction results. Keyboard expansion preserves focus
and never queues; Q8 remains blocked, and Q7's action never queues another group.
These interaction results are scoped to this synthetic application; geometry
cannot infer arbitrary action semantics.

During development run `npm run check:patterns`; it uses the same assertion source
as CI without building/installing the distribution. PR CI retains the exhaustive
installed workflow and artifacts. A focused pass is not full package proof, and
neither constitutes evidence of better agent outcomes.


The initial new baseline's changed-task rows measured 180.1875 px and failed the
frozen 180 px ceiling. Reducing the shared inter-row grid gap from 8 to 6 px repaired
that overhead while preserving facts, type and controls; the 240 px stretched
counterexample remains rejected. No threshold was relaxed.

| Case | Accepted capture | Controlled rejection |
| --- | --- | --- |
| Toolbar scope | [Good](images/pattern-toolbar-good.png) | [Bad](images/pattern-toolbar-bad.png) |
| Finite whitespace | [Good](images/pattern-whitespace-good.png) | [Bad](images/pattern-whitespace-bad.png) |
| Changed task | [Good](images/pattern-changed-task-good.png) | [Bad](images/pattern-changed-task-bad.png) |
| Independent controls | [Good](images/pattern-scopes-good.png) | [Bad](images/pattern-scopes-bad.png) |

These inspected source captures used Chromium 153.0.8010.0 as a local substitute
for the unavailable pinned download. CI regenerates installed-package captures
with the pinned Playwright browser; raw reports and scope stay explicit.

# Regression fixtures

The same installed workflow also exercises the [complete mock application](../docs/mock-application.md):
it accepts the reference, rejects specific deliberate rule violations, then walks
through filtering, selection, drawers, tabs, URL restoration, and an empty search.

`npm test` installs the packed CLI through the isolated Claude plugin and runs one
workflow over the client-rendered React app in `react/Comparison.jsx`, with styles
in `react/analytical.css` and an HTML shell in `templates/analytical.html`.
`analytical-fixtures.mjs` bundles React with esbuild for the temporary app; neither
React nor esbuild is a production dependency of the Viewrule engine.
These are specified test expectations using illustrative data, not user approvals.

| State | Intentional condition | Required result |
| --- | --- | --- |
| `broken` | 18×18px export control; justified prose; left-aligned numeric amounts; 450px header; metric peers offset and overlapping; 12px table text; clipped carrier labels; hidden caption; wide viewport drops carrier 2 and changes the period | Specific control/prose/numeric findings plus header, alignment, overlap, type, label, context, identity-preservation, and period findings with the expected DR citations; verification fails |
| `compact` | 440px comparison width, 14px data text, complete caption and labels; eight desktop rows and twelve at 4K | Fresh pass, zero warnings, preserved comparison identities, complete original-size 4K detail tiles |
| `sidebar` | 440px table beside a trend and explanation panel, with the same comparisons and exact rules as compact | Zero errors/warnings and an identical contract hash; a different composition is permitted |
| `stretched` | Same text and rows as compact; table alone expands to the full 4K width | Fails the text-distance rule at 4K while identity counts remain unchanged; desktop still passes |
| `finite` | Four relevant alternatives in a bounded comparison; a scoped four-item count for this finite task | Passes at desktop and 4K despite substantial surrounding whitespace |

The workflow uses the shipped presets through the installed `init` and `preset`
commands. It only narrows viewport names to the two captured sizes; no fixture-only
replacement of preset measurement rules or thresholds is used. The finite case
explicitly changes the comparison count to match its four-alternative task.
A scoped period-consistency rule additionally checks the existing metadata contract.

It checks expected finding IDs, measurements, and citations, rather than accepting
any failure. Passing cases must have no errors or warnings. Missing comparison
annotations are also exercised and must fail, rather than silently dropping coverage.
The broken header guidance uses 14px text in `#aaa` on `#fff` (about 2.32:1,
below the 4.5:1 AA minimum). Both captured viewports must report a blocking
`axe:color-contrast` finding on that element. Accepted layouts restore the inherited
dark text and must remain clean; axe supplies the detector, without a custom rule.
The feedback portion learns a stricter text-distance limit from fixture feedback,
then checks the corrected layout; the same rule is retained for the stretched case.

Installation checksum rejection, default guidance and personal overrides, configuration
preservation, retired Stop compatibility, staged/pushed Git gates, report/reference preservation, and stale-result enforcement
are exercised within this workflow. It does not assess chart truth, image-only content,
model skill selection, or visual taste. `npm run demo` presents the same five layouts
and their reports for human inspection using `templates/gallery.html`.
`fixtures.mjs` supplies the shared project configuration. The same workflow verifies
escaped report text, approved-image links, and template-change freshness. It also
checks pre-design/evaluated contract identity, scoped rule-add previews, rejection of
invalid scopes and duplicate IDs without writes, and before/after rule changes.
The compact/sidebar contract is unchanged; the finite count is an explicit exception
reported separately. These are executable-contract tests, not claims of agent behavior.

Keep cases tied to concrete claims. Extend this workflow for a demonstrated omission;
do not create a browser, viewport, or per-helper test matrix.

The saved-comparison scenario applies a fixed presentation override to the complete
Parcel desk application, then removes it under the same contract. Desktop and wide
captures reject the declared framing, anchor, gap, and footprint defects; the mobile
reflow is retained. Application assertions preserve shipment/chart data and exercise
filters, selection, keyboard disclosure, tabs, and URL restoration on both revisions.
The installed `compare` command preserves exact report/image bytes, exports annotated
views, and leaves latest state unchanged. A damaged pair exposes changed contracts,
unavailable geometry, old reused evidence, absent states, unsafe paths, and escaping.
The viewer is checked for equal image scale, keyboard controls, working originals,
and mobile overflow. Full output is retained in `dist/saved-comparison-evidence/`;
the [predeclared protocol](../benchmarks/workflow/saved-comparison-protocol.md)
distinguishes synthetic workflow validation from agent prevention efficacy.

The [screenshot-informed pattern review](../docs/examples/pattern-review.html) uses
one synthetic DOM/data template in four states. At 1440×1000 CSS px, the packed CLI
rejects the before header/toolbar and composition overhead, then rejects the
component-only composition even though every component check passes. The final
composition passes the same rules with no warnings. A compact negative control fails
exactly the denominator/trend context requirements hidden in closed disclosures.
Assertions check specific findings, measured heights/counts, selectors, and DR/source
citations. Application checks preserve the concrete facts, chart samples/domain, readable
type, all three ranking weights, shared context-only labeling, and missing-data states;
exercise history range controls, keyboard disclosure/focus, and Q7-only local review;
and verify assets below the Pages prefix. The revised composition is the default.
It also checks title/status and selector/latest-value alignment, single-line context
rows, shared pill ownership, correct current/prior chart proportions, and the explicit
header/chart/full-surface budgets added after user feedback. There is no second test suite or snapshot
assertion. Raw CLI reports/artifacts, captures and the evidence ledger are retained in
`dist/pattern-review-evidence/` and uploaded by PR CI. These results validate this
authored calibration case, not agent generation quality, real scoring semantics,
or human approval. The source screenshot never enters the repository or package.

The same workflow also exercises `templates/reading.html`: bounded columns,
DOM/visual reading order, paragraph flow, alignment and columns, plus print,
enlarged root text, and contract/CSS mismatches. These cases replace the former
lanej.io essay detector regression; there is no separate reading-layout suite.


The paired [interaction and resilience gallery](../docs/examples/behavior.html)
adds DR-009–DR-016 to this same installed workflow. Its native checks reject two
missing freshness labels and two clipped service names with exact DR citations;
the good panels have no corresponding findings. Requiring DR-016 without an
executed check produces an explicit coverage failure rather than a semantic pass.
The schema accepts the twenty registered IDs and rejects unknown DR-021.

The fixture walkthrough exercises refresh/completion states, detail-return identity
and focus, publication scope, rejection without losing input, review/cancel/undo,
and real Tab/Enter/Escape disclosure. One enlarged-text mobile example checks
page overflow. Screenshots are original review evidence, not snapshot assertions;
`dist/behavior-evidence/captures.json` records browser, viewport, scale, and state.
These examples verify their own declared interactions, not a generic engine
journey runner, backend truth, visual hierarchy, or color semantics.


The synthetic [analytical decision surface](../docs/examples/decision.html) extends
this same installed workflow. One shared template uses invented operations coverage
and schematic geography. The bad route must fail summary `region-density`, repeated
headline identities, evidence/decision distance, scalar height, and solid mark contrast
with exact rule IDs, measured values, and citations. The good route passes the same
contract. Both retain map size, evidence, context, locality labels, and readable type;
the good surface is materially shorter. A checkpoint removes required evidence and
adds a gradient to prove missing identities/anchors and unassessed paint cannot pass.
The rendered gallery also works below the Pages prefix, expands/collapses, and performs
its local sample action. Native-scale captures and metadata are generated in
`dist/decision-evidence/`. There are no image snapshot assertions. Task relevance,
semantic density, complex map contrast, and recommendation quality remain human review.

## Guide and original examples

The same installed workflow retrieves one pattern and its evidence from an isolated
plugin **before engine setup**, verifies setup removes legacy Stop handlers from
mixed user/project settings while preserving dotfile symlinks, permissions, other
hooks, and malformed files, and checks that repeated migration is a no-op. It then
checks identical Markdown through the packed
engine. Unknown IDs return usage failure. `npm run guide:check` handles the authoring
contract and links; the Pages build is also a PR CI gate.

The pricing scenario uses one desktop viewport and a scoped `no-clip` contract:
compact, sparse, and overloaded variants pass; clipped identity labels must produce
`pricing-labels`. The latter two passing designs remain task-disfavored advice.
The encoding comparison must produce `encoding-shared-domain` for independently
rescaled panels; truthful area and position examples pass that declaration check.
The browser interaction checks expansion, retained identity, local action state,
return focus, and reset. These tests do not prove decision sufficiency, actual SVG
truth, or Claude's autonomous skill selection. No separate suite was added.

## Scoped execution

The installed review workflow ends with a two-scope application, shared inputs,
a checkpoint, two real bundled providers, and required design documents. It
verifies unchanged reuse, local invalidation, shared/global fan-out, cross-page
failures involving reused evidence, provenance, damaged artifacts, full fallback,
expiry, and evidence verification. Captures are observations, not snapshots. Actual
workload counts/timings and inputs are retained in
`dist/review-evidence/incremental-workload.json`; they are not agent-cost estimates.
The same workflow verifies plan/check agreement with deliberately unsorted rule IDs
and checkpoint-symlink retargeting between byte-identical modules with distinct
relative imports. Every possible target and helper is a declared input. Retargeting
must invalidate evidence verification, rerun the affected page, and detect the changed
rendered encoding while preserving the other page's verified reused capture.

The expanded installed workflow has a 360-second test-harness budget. This bounds
the combined regression workload, not individual application captures or provider
execution. Production timeout settings and all evidence assertions are unchanged.

The [composition examples](../docs/examples/composition.html) extend this same
installed workflow with four controlled pairs: median-anchor residual, peer-gap
variation, viewport-growth yield, and equal-priority footprint variation. Bad
fails only its declared target; the workflow asserts actual values and preserves
shared content, type, identities, semantic color, and total surface width. A
checkpoint workflow checks complete finite-universe whitespace, nested chrome
rectangle union and excessive allocation, unequal peer heading type, and missing
growth identity evidence isolated from an intact checkpoint, and loss of a baseline
identity despite a growing total. One concrete queue capture also distinguishes
readable and undersized `display: contents` text, preserves hidden text exclusion,
accepts a fully fitting percentage-width child in a fractional content-box overflow
wrapper despite CSSOM rounding, and distinguishes an
absolute item's escape from a static wrapper from actual containing-block clipping.
It also retains evidence painted into a reserved scrollbar gutter under the capture
browser's hidden-scrollbar setting. Equal and unequal font-size comparisons include
rendered `display: contents` labels while excluding a hidden label.
The same scenario also serves a synthetic form pair with no authored alignment
selector. The accepted form aligns three same-row text-entry controls; the rejected
form offsets the first control through an uneven label stack. The rejected capture
must produce one advisory `metrics.peerInference` candidate citing DR-017 while
the accepted counterpart produces none. Its report overlays the inferred group,
member boxes, median anchor, and signed offsets on the unchanged saved capture and
provides a toggle back to the original. Neither candidate nor overlay is a finding
or changes the check exit code.

Native-scale Good and Bad images and both reports are retained in
`dist/composition-evidence/`. These thresholds and inference heuristics do not
establish general beauty, symmetry, semantic utility, peer membership, or human
approval.

For local composition-detector iteration, run `npm run check:composition`. The
command uses `test/composition-scenario.mjs`, the exact scenario called by the
installed workflow, against the current source CLI. It includes the controlled
pairs and escaped-defect reproductions above, with identical assertions and
accessibility checks. Evidence goes to `dist/composition-focus/` and is clearly
separate from installed-package evidence. The command neither builds the public
site nor installs/packs the engine, and never creates or replaces the release
archive. Run `npm test` for complete installed-package validation before delivery;
a focused pass is not a full test pass. Failed assertions and capture errors remain
nonzero exits. Keep one assertion source rather than maintaining a lighter duplicate.

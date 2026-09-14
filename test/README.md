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
| `broken` | 18×18px export control; justified prose; left-aligned numeric amounts; 450px header; metric peers offset and overlapping; 12px table text; clipped carrier labels; hidden caption; wide viewport drops carrier 2 and changes the period | Specific control/prose/numeric findings plus header, alignment, overlap, type, label, context, identity-preservation, and period findings with the expected DR citations; Stop blocks |
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
preservation, hook opt-in, report/reference preservation, and stale-result enforcement
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

The same workflow also exercises `templates/reading.html`: bounded columns,
DOM/visual reading order, paragraph flow, alignment and columns, plus print,
enlarged root text, and contract/CSS mismatches. These cases replace the former
lanej.io essay detector regression; there is no separate reading-layout suite.


The paired [interaction and resilience gallery](../docs/examples/behavior.html)
adds DR-009–DR-016 to this same installed workflow. Its native checks reject two
missing freshness labels and two clipped service names with exact DR citations;
the good panels have no corresponding findings. Requiring DR-016 without an
executed check produces an explicit coverage failure rather than a semantic pass.
The schema accepts the sixteen registered IDs and rejects unknown DR-017.

The fixture walkthrough exercises refresh/completion states, detail-return identity
and focus, publication scope, rejection without losing input, review/cancel/undo,
and real Tab/Enter/Escape disclosure. One enlarged-text mobile example checks
page overflow. Screenshots are original review evidence, not snapshot assertions;
`dist/behavior-evidence/captures.json` records browser, viewport, scale, and state.
These examples verify their own declared interactions, not a generic engine
journey runner, backend truth, visual hierarchy, or color semantics.

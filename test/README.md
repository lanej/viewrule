# Regression fixtures

`npm test` installs the packed CLI through the isolated Claude plugin and runs one
workflow over the actual browser-rendered fixtures in `analytical-fixtures.mjs`.
These are specified test expectations using illustrative data, not user approvals.

| State | Intentional condition | Required result |
| --- | --- | --- |
| `broken` | 450px header; metric peers offset and overlapping; 12px table text; clipped carrier labels; hidden caption; wide viewport drops carrier 2 and changes the period | Specific header, alignment, overlap, type, label, context, identity-preservation, and period findings with the expected DR citations; Stop blocks |
| `compact` | 440px comparison width, 14px data text, complete caption and labels; eight desktop rows and twelve at 4K | Fresh pass, zero warnings, preserved comparison identities, complete original-size 4K detail tiles |
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
The feedback portion learns a stricter text-distance limit from fixture feedback,
then checks the corrected layout; the same rule is retained for the stretched case.

Installation checksum rejection, default guidance and personal overrides, configuration
preservation, hook opt-in, report/reference preservation, and stale-result enforcement
are exercised within this workflow. It does not assess chart truth, image-only content,
model skill selection, or visual taste. `npm run demo` presents the same four layouts
and their reports for human inspection; `fixtures.mjs` retains legacy fixture exports.

Keep cases tied to concrete claims. Extend this workflow for a demonstrated omission;
do not create a browser, viewport, or per-helper test matrix.

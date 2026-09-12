# Code review

Review for regressions in useful evidence, correct enforcement, and compatibility.
Read the diff, the surrounding implementation, and the affected design rule before
raising a finding. Review only; change source when the task also requests a repair.

## What warrants a finding

Report a concrete defect introduced or materially worsened by the change. Explain
an affected input or state, the observed or deduced behavior, its user impact, and
why the code causes it. Cite the relevant file and location. Label deductions and
uncertainty; do not claim execution without test output or a verified CI result.

Prioritize findings by impact:

| Priority | Use |
| --- | --- |
| P0 | Immediate, broadly occurring data loss or comparable critical failure |
| P1 | A likely false pass, loss of required evidence, privacy exposure, or broken primary workflow |
| P2 | A scoped correctness or compatibility defect with a concrete affected case |
| P3 | A small actionable defect; avoid preference-only nits |

Do not manufacture findings to fill a quota. Report a pre-existing problem separately
only when it materially affects this change. The known density proxy limitation is
not, by itself, grounds to block every PR; flag changes that conceal or worsen it.

## Review the relevant boundaries

| Boundary | Questions |
| --- | --- |
| Rules and scope | Do schema, runtime behavior, defaults, selector scope, CSS units, and DR mapping agree? Can missing required evidence silently pass? |
| Browser measurements | Does the observation measure the stated constraint? Are coordinate systems and viewport comparisons consistent? Is a DOM or metadata proxy being presented as semantic truth? |
| Large-screen evidence | Are comparison identities and legibility preserved? Is tile coverage complete and inspectable at original size? Can empty spacing masquerade as improvement? |
| Feedback and state | Is approval genuinely supplied by the user and tied to the correct report? Does changed source/rule/tool state invalidate a pass? Are writes atomic and project/global boundaries respected? |
| Integration and packaging | Do installed entrypoints, policy documents, compatibility aliases, exit codes, and hook opt-in still work? Is the distributed artifact the one tested? |
| Privacy | Can changed handling expose authentication state, private screenshots, URLs, or feedback? Is untrusted report content escaped? |

Use only the rows relevant to the diff. Guidance to improve a UI must not silently
become an automatic source edit or a rule change made only to satisfy the checker.

## Proportionate validation

For a behavioral change, inspect the existing installed-CLI regression and whether
it exposes the specific risk. If a real regression needs stronger coverage, improve
that workflow. Do not demand helper tests, snapshots, or a viewport matrix for each
branch. For documentation-only changes, check examples, links, and claims against
actual behavior. A new test file is not evidence of quality on its own.

When tools are available, use the affected validation once. A reviewer with only
file-reading tools should inspect supplied evidence and clearly identify what was
not executed. Do not repeat passing CI checks without a concrete remaining risk.

## Review output

Lead with actionable findings ordered by priority. Each finding needs a precise
location, triggering condition, impact, and concise reasoning; cite a DR ID when
relevant. Offer the smallest correction direction without redesigning the feature.
Keep questions or nonblocking suggestions separate. If no actionable findings are
found, say so and state any material validation limits. A review is not permission
to merge, publish, weaken a check, or record a user's design approval.

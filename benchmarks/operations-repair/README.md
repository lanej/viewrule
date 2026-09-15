# Operations repair trial

One fresh agent repaired the synthetic operations decision surface on 2026-09-15.
The baseline failed five rule families (13 errors); the repaired source passed all
eight authored rules with zero errors or warnings. Independent verification retained
the original data, text sizes, 630×470 CSS px map, and disclosure/action behavior.
This is one functional trial, not a comparative benchmark or human design approval.

## Inputs and procedure

The starting UI came from the bad [decision fixture](../../docs/examples/decision.html)
at source commit `94e41f775002eaf9280f387a1dd9d761384386ac`. Preparation rendered only
that expanded surface, removed the gallery navigation, explanation, good template,
and good-specific outcome styling, and renamed the bad wrapper to `workspace`.
The action retained its local synthetic status message. No proprietary reference
image, data, or subject matter was supplied.

The agent started without conversation history in a separate application directory.
It received the task, source, frozen contract/rationale, baseline findings, and a
wrapper exposing `contract` and `check`. It could edit only application HTML, CSS,
and JavaScript, and was instructed to preserve all unique data, labels, boundaries,
facility positions, map size, readable type, and actions. It was instructed not to
inspect the engine, repository, good fixture, or separate evaluator. This was an
instruction boundary in a shared environment, not a security-enforced blind study.

The wrapper used an isolated copy of the engine from the commit above. Its package
still identified itself as development version 0.4.0; it was **not** the published
0.4.0 release. Chromium 151.0.7922.34 rendered at 1440×1100 CSS px and scale 1 on
macOS. The evaluator was frozen outside the agent's allowed inputs before repair.
It compared hashes, exact normalized unique content, fonts, map geometry, six
visible facility identities/positions, and table rows; it also exercised the action
and collapse/reopen behavior. Its assertions passed after repair.

## Observed outcome

| Measure | Before | Repaired |
| --- | ---: | ---: |
| Decision surface height, independent measurement | 1365.56px | 752.75px |
| Map width × height | 630×470px | 630×470px |
| Each declared headline's occurrences | 2 | 1 |
| Scalar container height | 112px | 40px |
| Evidence-to-recommendation text distance | 296.50px | 67.94px |
| Summary text coverage | 3.36% | 9.52% |
| Largest empty summary band | 69.44px | 3.19px |
| Facility mark contrast | 1.64:1 | 9.28:1 |

The agent changed HTML and CSS once. Its first post-edit check could not launch
Chromium because the execution sandbox denied access. An authorized rerun of the
same source passed. That operational failure was not counted as a design outcome.
The map and evidence columns remained equal in width; the recommendation moved
under the evidence table. JavaScript and all sampled text sizes stayed unchanged.

[results.json](results.json) preserves measured observations, input hashes, findings,
and remaining review items. [repair.patch](repair.patch) records the application
edits against the prepared input. These are a compact record; they do not include
the full agent transcript or constitute a complete replay harness. Raw captures,
reports, prepared source, and the independent evaluator were retained in the local
task workspace. This trial does not add another automated regression suite.

The useful feedback change was in browser-error remediation: the report had always
recommended installing Chromium even when it was already present. The guidance now
distinguishes a missing executable from denied browser launch without changing launch
permissions or flags.

## Limits

This trial supplied an authored contract and baseline findings. It does not measure
unaided defect discovery, general repair success, or comparative product quality.
There were no control arms or repetitions. The desktop subagent inherited the task's
model settings; an exact backend model revision, token usage, and provider cost were
not available and are not estimated. Setup and execution time were not benchmarked.
The [controlled three-arm protocol](../analytical/agent-trial.md) remains **not run**.

Density measures text geometry, repeated metrics rely on declared identities, and
distance does not prove that evidence supports a recommendation. Mark contrast covers
supported computed colors, not complex paint or occlusion. The passing report still
contains accessibility color-contrast review items for locality and node labels.
Visual inspection does not replace that review or establish full accessibility.
No user approval was recorded. See the [fixture rationale](../../docs/examples/decision-rationale.md)
and [measurement limits](../../docs/ui-review-enforcement.md).

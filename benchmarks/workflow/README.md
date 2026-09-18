# Component/composition workflow evaluation

Status: **not run**. This is a frozen review-case catalog and a generation-trial
protocol, not an automated detector suite or evidence that the new workflow improves
results. Follow the repo's existing installed workflow for executable regressions;
do not introduce a second renderer, helper test suite, or screenshot matrix.

The workflow under evaluation is the plugin's
[component/composition review](../../plugins/claude-code/skills/review/component-composition.md).
The prior [repair pilot](../analytical/pilot-2026-09-15.md) is historical evidence,
not validation of this change. Keep detector correctness, task usefulness, and agent
performance separate.

## Fixed review cases

For each case, keep task, required data, typography, and available actions constant.
Use the application's existing stories/fixtures or the canonical Easy UI examples;
do not edit Viewrule's generated example bundles. A variant is a concrete fixture
only after its source commit, route/story, state, and viewport are retained.
The rows below specify expected judgments, not fixtures already implemented or run.

| Case | Accepted variant | Rejected variant | Verification boundary |
| --- | --- | --- | --- |
| Header overhead | One meaningful heading; additional context/actions share space when usable. | The same context repeated as title/subtitle and a separate toolbar band pushes evidence down despite usable horizontal room. | A task-specific authored height/position check can measure overhead; human review determines redundancy. |
| Toolbar scope | Common filters direct, active scope visible, mutation actions distinguishable. | Active filters disappear into an unmarked menu or an action is indistinguishable from changing the view. | App tests check scope and behavior; geometry cannot infer action semantics. |
| Disclosure | Required evidence remains in the summary; supporting explanation expands without a mutation. | A compact row hides a routinely required factor or expansion dispatches an action. | Assert required field visibility and action calls in app tests; preserve the human sufficiency judgment. |
| Composition | The same acceptable units share genuinely common context at their parent. | Individually acceptable units repeat the parent's title, time context, filters, and framing. | Inspect/measure the assembled view, not only isolated stories. Different control scopes are a negative control: do not hoist them. |
| Legitimate whitespace | A finite three-item comparison stays readable with unused space. | The same three items are stretched or padded without adding useful evidence. | Neither whitespace nor box coverage alone determines acceptance. |
| Changed task | A newly required trend is moved into the initial comparison. | The old disclosure arrangement remains despite the new requirement. | Update the contract visibly; test the new requirement without rewriting historical approval. |

Before extending a detector, pair the relevant concrete fixtures in the existing
installed regression, freeze selectors/thresholds, and assert the intended finding,
scope, and measurement. Existing advisory fixtures that pass must continue to be
reported honestly until a separately reviewed executable contract changes. Do not
turn every judgment in this table into a fabricated rule type.

## Paired generation trial

Use clean application copies and fresh agent sessions. Baseline is the review/design
workflow at `6d36031935a824c650e049a14aeb9770e042bb95`; treatment is the exact candidate
PR commit. Record both commits, plugin/corpus/model versions, engine/browser identity,
application/data fixture commit, environment, and the allowed time/token budget.
Hold the engine, rules, tools, data, prompt, and budget constant: compare the workflow,
not a simultaneous engine upgrade. No cross-arm memory or copied implementation.
Use an authenticated local agent; do not invent a transcript or treat CLI retrieval
as proof the agent consulted the workflow.

Use both tasks below as held-out generation tasks only while their implementations
have not been used to tune this workflow. Once inspected for tuning, label them
calibration cases and reserve new tasks. All data below is synthetic.

### Task A: Import retry queue

Prompt: Build an operator view for three imports. The operator must compare source,
processed/total records, rejected records, and retry eligibility before retrying an
eligible import or inspecting its problems. Keep the import identity and action scope
clear. Row-level error samples are supporting detail. Reuse the app's components and
explain the implementation's verification limits.

| Import | Source | Processed / total | Rejected | Retry eligibility |
| --- | --- | --- | --- | --- |
| IMP-104 | Vendor catalog | 9,980 / 10,000 | 20 | Eligible |
| IMP-105 | Regional catalog with a long descriptive name | 480 / 500 | 20 | Blocked: source authorization required |
| IMP-106 | Inventory update | 1,000 / 1,000 | 0 | Complete; no retry |

Retain the initial state, an active source filter, and expanded error detail. Assert
that expansion does not retry, retry targets only the correct eligible import, and
filter scope remains apparent. Reject hiding processed/total or the blocking reason
to make the row smaller. A finite three-row queue may leave unused space.

### Task B: Rollout comparison

Prompt: Build a view to compare three feature-rollout cohorts before expanding or
holding a rollout. Each decision needs cohort identity, current and proposed rollout,
observed error count with request count, and guardrail status together. A seven-day
history is supporting detail. Shared observation-window controls affect all cohorts;
a cohort-specific action affects only that cohort. Reuse the app's components and
explain the implementation's verification limits.

| Cohort | Current -> proposed | Errors / requests | Guardrail |
| --- | --- | --- | --- |
| Internal | 10% -> 25% | 4 / 20,000 | Clear |
| Pilot | 5% -> 10% | 90 / 10,000 | Blocked |
| General | 1% -> 5% | 15 / 50,000 | Clear |

Retain the initial comparison and expanded history. Assert that shared controls are
not independently duplicated, mutation scope is correct, and denominators/status do
not disappear behind disclosure. Then change the task: the seven-day trend is required
before every decision. Observe whether the agent explicitly updates intent and the
initial comparison rather than leaving routine evidence hidden.

## Evaluation and reporting

Run the same planned repetitions per arm and task with a fixed model/configuration;
report the actual count and all failures. Randomize arm/run order and blind human
reviewers to the arm where practical. Freeze task acceptance before running; the
treatment agent cannot rewrite the evaluator or acceptance rules.

Retain redacted prompts/transcripts, implementation diffs, contract diffs, configured
check reports, component and composition captures, app-test output, and resource use.
The evaluation record must distinguish:

- **Task preservation:** required facts, comparisons, identities, scope, and behavior.
  A smaller layout that loses these is a failure, even when configured checks pass.
- **Review quality:** redundant overhead, control simplification, useful disclosure,
  accessibility, reviewer-requested corrections, and whether both passes were observed.
- **Cost and evidence:** elapsed time, tokens, tool/browser calls, actual test findings,
  unassessed requirements, and artifacts supporting each judgment.

Report paired outcomes rather than a single density/quality score. Include cases
with no benefit or regressions. No claim of better designs, reliability, speed, or
cost follows from this protocol or from passing repository CI alone.

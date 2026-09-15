# Controlled repair trial

Status: **nine-trial exploratory pilot complete; full study deferred**. The
[2026-09-15 pilot](pilot-2026-09-15.md) ran one clean control and two seeded cases
once per arm. All three arms repaired both seeds with no new evaluator failures;
the pilot showed no incremental repair benefit. The remaining 72 prepared tasks
were not run after the user narrowed scope due to latency concerns. Blind semantic
and explanation grading remain unrecorded; issue #22 stays open.

`scripts/repair-trial.mjs` creates neutral inputs, assistance, hashes, rotated trial
order, and a frozen independent evaluator. The [local container runner](execution.md)
records authenticated sessions with a pinned browser and enforced isolation. The
evaluator's separate validation against the seeded corpus is not an agent outcome.
The full-study protocol below remains the target for any later expansion.

## Conditions

| Arm | Shared inputs | Additional assistance |
| --- | --- | --- |
| Baseline | Task, UI source, browser access | None |
| Impeccable | Identical shared inputs | Pinned Impeccable instructions and CLI |
| Viewrule | Identical shared inputs | Pinned Viewrule instructions and authored development contract |

Use the same exact model version, reasoning setting, runner version, token ceiling,
wall-time limit, and browser for all arms. Record these before launching. Run three
independent repetitions per case and arm; rotate arm order across repetitions.
Report the authored-contract setup cost separately from repair time and tokens.
Do not substitute a different model when an arm fails to start.

## Isolation and evaluation

Copy each task into a fresh directory outside the repository. Supply only its UI
source and neutral task identifier; remove case labels and unused seed branches.
Do not provide the seed manifest, reference solution, other arms' results, or the
held-out evaluator. Record hashes of the prepared inputs so every arm receives
identical starting source. Controls are tasks too: unnecessary edits can regress them.

Freeze a separate evaluator before launching any arm. It checks all original
requirements at both viewports and after the filter action, plus preservation of
carrier identities, values, labels, units, and filter semantics. Store the evaluator
outside the agent workspace. Viewrule may expose its development contract to its
arm, but the held-out assertions and reference outcomes remain private to evaluation.
Reject modifications to tool configuration or requirements as invalid trials;
do not classify a missing report or failed browser launch as a clean result.

The current parameterized detector corpus needs this neutral per-task preparation
before use: simply handing agents page.html would reveal every seeded defect.

## Shared prompt

> Review and, where necessary, repair this shipping comparison UI. Preserve its
> data and behavior. Show complete service names, USD-per-parcel prices, delivery
> days, on-time rates, and reporting context. When twelve services are available,
> at least eight complete alternatives must be visible initially. If only four
> exist, show all four. Preserve comparison identities across 1280×900 and
> 3840×2160 viewports. Related numeric values must stay within 150 CSS pixels.
> Retain readable type and check the state after applying the filter. Explain
> defects with evidence, repair the application source, and verify the result.
> Do not change requirements or detector configuration to obtain a pass.

## Recorded outcomes

Save the exact prompt, tool instructions and versions, input hashes, transcript,
patch, before/after browser evidence, elapsed time, token usage, and provider-reported
cost when available. Unavailable cost is unknown, not zero. Grade anonymized outputs
without arm labels: seeded defects repaired, new requirement failures, preserved
semantics, unnecessary edits to controls, and actionable explanations. Keep raw
counts by case and repetition; do not infer statistical superiority from a small
pilot. Human semantic review remains distinct from deterministic assertions.

## Reproduce the preparation

Use a new directory outside this repository. Keep the parent directory, manifest,
other trials, evaluator, source repository, and existing benchmark results outside
every agent's filesystem boundary.

```sh
git clone https://github.com/pbakaus/impeccable.git /tmp/impeccable-trial-source
git -C /tmp/impeccable-trial-source checkout 73a6f51a540bc3938a2c40677d074c70b81fa5a0
node scripts/repair-trial.mjs prepare /tmp/viewrule-repair-trial /tmp/impeccable-trial-source
```

Preparation creates 81 neutral `task-NNN` directories: nine cases × three arms ×
three repetitions, rotating arm order. Every repetition/arm for a case receives
identical application bytes and shared task text. The source contains only its
active condition; query parameters, seed names, and unused defect branches are
removed. `manifest.json` stores grouping outside the agent workspaces. It records
input and prompt hashes, hashes of protected tool/requirement files, the evaluator
hash, tool revisions, and preparation elapsed time. Authored-contract labor/cost
is unknown until supplied; preparation runtime is not that cost.

Impeccable assistance is copied unchanged from its pinned source: CLI 4.1.0,
platform engine 0.1.5, skill 4.3.0. Viewrule gets its development rules, checkpoints,
and review instructions. Supply the matching installed plugin/packed CLI and
bundled guide as read-only tools; do not mount this source repository into an arm.
The baseline gets neither tool's instructions. Configure tool exposure and prompt
routing explicitly in the runner; the preparation script does not launch agents.

Before execution, fill every `manifest.runner` field with the same exact model,
reasoning, runner version, token ceiling, wall-time limit, and browser version.
Preinstall tools and record setup effort separately. Start a fresh session for
every directory, serve only that directory at `http://127.0.0.1:4173`, and apply the
same browser, network, and filesystem restrictions. Mount assistance read-only,
allow edits only to `index.html`, and keep evaluation outside the sandbox. Running
unrestricted agents in sibling directories does **not** establish isolation.

For each trial, capture a `before` evaluation, launch the authenticated runner with
`TASK.md` plus only that arm's assistance, retain its full transcript and patch,
then capture an `after` evaluation. Save the frozen evaluator hash separately from
the editable task directory before starting any agent:

```sh
node scripts/repair-trial.mjs evaluate /tmp/viewrule-repair-trial task-001 FROZEN_SHA256 before
# Authenticated runner executes this task with the pinned settings and budget.
node scripts/repair-trial.mjs evaluate /tmp/viewrule-repair-trial task-001 FROZEN_SHA256 after
```

Evaluation rejects changed tool/requirement files or a changed evaluator, checks
the pinned browser, and writes per-state observations and original-size captures
outside the workspace. It independently checks data/identity preservation,
visible alternatives, complete labels, reporting context, readable type, numeric
proximity, filter state, and continuity at both viewports. It imports no Viewrule
measurement implementation. The task keeps one self-contained HTML file and a
fixed synthetic dataset; it is not a general website evaluator.

`result-template.json` makes missing transcript, patch, explanation, elapsed time,
tokens, provider cost, setup effort, and semantic review explicit. Fill these from
the runner's actual records; unavailable values remain null. An evaluator pass
alone is not a valid agent trial. Verify budgets and runner settings from those
records and mark invalid or failed starts explicitly. Grade explanations and
semantics blind to the arm labels; no automated score substitutes for that review.

`node scripts/repair-trial.mjs verify` exercises the evaluator against the nine
neutral original inputs in the existing benchmark CI job. Its output is labeled
`evaluator-validation-not-agent-results` and stored in the benchmark artifact.
The issue remains open until all agent trials and their review are complete.

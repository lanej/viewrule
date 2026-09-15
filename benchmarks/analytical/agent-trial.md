# Controlled repair trial

Status: **not run**. The deterministic detector results do not measure agent repairs.
Execution requires an authenticated, pinned agent runner and a browser available to
all conditions. Neither a Claude/Codex CLI nor local Chromium was available in the
preparation workspace. No model credentials were created or inferred.

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

# Short-preflight development pilot — 24 September 2026

This exploratory comparison tests the released review workflow against a short,
task-scoped composition preflight. It does not compare Viewrule with an unaided
agent, evaluate automatic skill selection, or complete the larger generation
protocol in [README.md](README.md).

## Frozen comparison

- Baseline workflow: `0b1073a15cb46f598a7a38dc6c3c92bc00910f81` (released plugin 0.9.0).
- Treatment workflow: `6b54088daafe51ca995ee940de280f815fe679dd` (candidate plugin 0.9.1).
- Both use the published engine 0.9.0 archive, SHA-256
  `0a2fe72e8d259590d146c309e664cc05484d27ce1def937e1587feab3f705fb3`.
- Codex CLI 0.153.4, requested model `gpt-6-astra`, reasoning `ultra`, fresh ephemeral
  sessions, eight minutes and 600,000 cumulative reported tokens per session.
  Cached input counts toward that ceiling. The service does not expose an immutable
  backend revision. A ceiling can be crossed before the next usage event arrives;
  that outcome is recorded as incomplete, never as a successful completion.
- One session per workflow and task, run sequentially. Baseline goes first for the
  import queue; treatment goes first for the rollout comparison. No outcome-driven
  prompt, rule, guidance, budget, or evaluator changes are permitted between runs.

The two tasks adapt the protocol's import-retry queue and rollout comparison. Both
receive identical synthetic data, a minimal HTML/token shell, an existing authored
DESIGN.md, explicit DOM hooks, keyboard/behavior requirements, and frozen configured
checks. They must preserve required values, denominators, full labels, action scope,
and initial-view evidence at 800×900 and 1280×900 CSS px. These are controlled prototype
workloads, not independently sampled production applications. The changed-task
follow-up in the larger protocol is outside this pilot.

Both workflows are explicitly invoked. The only assistance difference is the
candidate workflow revision; the engine, task, configuration, and tools are held
constant. A common adapter runs the released CLI and browser in the host process,
so nested browser sandbox restrictions do not create different tool access. It
permits task-scoped read/check commands only. The participants receive the same
configured findings and screenshots and cannot rewrite acceptance rules.

The local runner uses workspace-write sandboxes and verifies hashes of task data,
configuration, rules, and assistance files. Read isolation is an instruction boundary,
not a container security boundary. Agents are prohibited from reading another task,
engine source, the evaluator, or the parent experiment. The runner requests disabled
personal plugins, configured MCP servers, discovered skills, web search, and
multi-agent work; normal account authentication remains outside the task material.
The host still offered browser MCP tools. Browser creation failed, and its inventory
was empty in the import baseline; this was not a sealed tool environment.
The [official App Server documentation](https://learn.chatgpt.com/docs/app-server)
and the installed CLI's generated protocol schema were consulted for the runner.

## Measurement

The first invocation of the configured check freezes the source **before** returning
findings. This is the first checked implementation, not necessarily the first edit
or render. Final source is evaluated separately after the session. An independent
browser evaluator checks exact required evidence and selected disclosure, filtering,
shared-control, and mutation interactions against the frozen task. It samples the
first row’s keyboard disclosure and specified filter/action targets; it is not an
exhaustive interaction or accessibility audit. It was validated
before the trial against legitimate controls and deliberate missing-field and
unsafe-disclosure defects. Its results are not supplied during generation.

Record completion/budget failures, changed protected files, first/final configured
findings, independent task failures, check/assistance calls, elapsed session time,
and provider-reported input, cached-input, and output tokens. Do not score duplicate
viewport findings as independent real-world defects. Semantic review is separate
from configured-check success, and no human approval is inferred.

Shared task/contract/harness authoring labor was not instrumented and is excluded
from session times. Therefore these timings cannot establish end-to-end savings.
Provider dollar cost is unknown. With one run per arm/task and no blind human
review, differences are observations, not statistically established effects.

The shared adapter forwards commands to the engine rather than implementing the
plugin's `docs` wrapper, so documentation lookup failed. It also rejects overlapping
requests rather than queuing them. These are harness defects, not Viewrule findings.
They affect assistance and effort, and prevent a faithful production workflow or
causal efficiency claim. The frozen adapter was not repaired between runs.

## Results

All four sessions completed within the frozen budgets without changing protected
inputs. Every first checked and final implementation had zero configured errors or
warnings and zero independent evaluator failures at both widths. **No incremental
defect-prevention benefit was observed.** These tasks reached the measured acceptance
ceiling under both workflows; passing them does not establish design quality.

| Task | Workflow | Elapsed seconds | Reported total tokens | Cached input tokens | Participant check calls |
| --- | --- | ---: | ---: | ---: | ---: |
| Import queue | Released | 328.1 | 542,953 | 466,688 | 1 |
| Import queue | Short preflight | 279.2 | 564,320 | 500,480 | 2 |
| Rollout comparison | Released | 340.3 | 465,718 | 390,016 | 1 |
| Rollout comparison | Short preflight | 352.8 | 450,757 | 379,776 | 1 |

Total tokens include repeated and cached input; cached input is a subset, not an
additional charge. Input/output details, completed tool-item counts, and assistance
calls are in [the results JSON](prevention-results-2026-09-24.json). Session timing
includes setup, guidance, tool failures, generation, and participant verification;
the independent post-session evaluator is excluded. Its final configured check is
also excluded from participant check counts.

Effort was mixed: treatment was faster with more tokens for imports, slower with
fewer tokens for rollout. Both treatment sessions explicitly read the short preflight
and the longer companion. This does not demonstrate reduced reading, causal speed,
lower cost, or better prevention. Adapter overlap rejections occurred in all four
sessions (2/3 for import baseline/treatment and 3/1 for rollout baseline/treatment).
All encountered the broken `docs` forwarding; all attempted unavailable interactive
browsers. Participants instead inspected supplied captures and used source/handler
checks, with real-browser interaction gaps stated in their final messages.

The independent browser evaluator subsequently passed its selected interactions.
Unblinded assistant inspection of compact/wide captures found the required initial
comparison visible in each version. That inspection is not a blind human quality
assessment. Three sessions left the first checked HTML unchanged; import treatment
removed an unused malformed CSS declaration and checked again, with no task failure
before or after. Do not describe that cleanup as a prevented user-facing defect.

## Retained before and after

The [gallery](prevention-before-after-2026-09-24.md) shows each session's first checked
and final initial state at matching widths, including unchanged results. Baseline and
treatment remain separate runs. The [evidence archive](prevention-evidence-2026-09-24.tar.gz)
and [SHA-256](prevention-evidence-2026-09-24.sha256) retain both source versions,
configured reports/captures, independent interaction output, prompts, frozen inputs,
old/new assistance, final design decisions, evaluator controls, and runner source.

Completed commands, their output, edits, visible agent messages, and browser outcomes
are retained in redacted interaction ledgers. Account/workspace paths are replaced;
internal reasoning, streaming duplicates, account diagnostics, and repeated browser
tool instructions are omitted. Original local event logs are hashed separately.
Copied-file provenance distinguishes original and retained hashes. The frozen runner
is an experiment record requiring local environment adaptation, not a supported
portable harness. No credentials are included.

## Development changes and remaining evidence

Keep the preflight as a concise entry point to explicit task, relationship,
allocation, responsive, and verification decisions, with no measured efficacy claim.
Keep failed reproductions and legitimate counterparts in the existing regression
scenario. The new `npm run check:composition` reuses that scenario directly against
source; one local run took 17.9 seconds versus 235.6 seconds for the full installed
workflow. These are different scopes, not a controlled equivalent-coverage speedup.
Full installed validation remains required before delivery.

Before a new efficacy comparison, repair the adapter's documentation handling and
request serialization, provide working interaction tools, and freeze a new protocol
using more discriminating tasks and repeated sessions. Treat these now-inspected
tasks as calibration data. Include contract/authoring labor, the changed-task case,
and blind human review before claiming end-to-end improvement. This pilot supplies
neither a general aesthetic score nor evidence of an optimal workflow.

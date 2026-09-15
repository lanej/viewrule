# Analytical detector benchmark

This corpus tests the analytical failures in [issue #22](https://github.com/lanej/viewrule/issues/22).
It compares **Viewrule with an authored contract** against **Impeccable's default
deterministic detector**. It does not rank the complete products or evaluate an
agent's taste, review quality, or repair ability. The corpus was authored by the
Viewrule project and deliberately emphasizes its stated use cases.

## Task and ground truth

A shipping operator compares complete service names, prices in USD per parcel,
delivery days, and on-time rates for one origin/destination. Eight complete options
must fit initially when twelve are available. Wide layouts preserve identities;
related numeric values stay within 150 CSS pixels. The finite control has only four
available options and explicitly requires four. Whitespace alone is not a defect.
All names, quotes, and rates are synthetic; no proprietary screenshots or data are used.

| Case | Seeded defect | Expected scope |
| --- | --- | --- |
| reference | None; bounded twelve-option comparison | Clean control at both widths |
| finite-control | None; only four options exist | Clean control despite whitespace |
| hidden-alternatives | Eight available options disappear | Both widths |
| lost-context | Reporting period and units disappear | Both widths |
| stretched | Table expands without more information; values separate | Wide |
| clipped-labels | Service suffixes are clipped | Both widths |
| spacious-dashboard | Oversized summary pushes options below the fold | Desktop |
| cross-viewport | Carrier 2 disappears, although minimum count still passes | Wide |
| after-filter | Applying the filter removes comparison context | Both widths, filtered checkpoint |

[cases.json](cases.json) defines seed presence and expected rule families before
execution. [rules.json](rules.json) is the full authored Viewrule contract; the only
per-case adaptation is the finite control's four-option requirement. [page.html](page.html)
is the common UI for both tools. Both use the same Chromium executable at 1280×900
and 3840×2160 CSS pixels. Viewrule activates the real filter button through
[checkpoint.mjs](checkpoint.mjs); Impeccable's URL activates that same handler on load.
This supplies a known state to both detectors. It does not test state discovery.

## Reproduce

```sh
npm ci
npm run browser:install
npm test
npm run benchmark
```

`npm test` produces the tested package archive. The benchmark installs that exact
archive in its own runtime and invokes its public CLI. Impeccable is pinned as a
development dependency and its installed platform binary is invoked directly, so
user cache/environment binary overrides cannot substitute another engine. No skill
or hook installation is performed. `VIEWRULE_BROWSER_PATH` can select a Chromium
binary for **both** tools; the actual version and executable SHA-256 are recorded.

`npm run benchmark -- --prepare` generates and validates input configurations without
a browser. Every run replaces its generated `dist/benchmark` directory. Full runs
record tool/package/binary versions, archive and input hashes, platform, viewport,
commands, raw findings, source configuration, and screenshots. CI uploads those as
`analytical-benchmark`; local output is under `dist/benchmark/results.json`. Execution
failures stop the run; they are never recorded as missed defects or clean scans.
Impeccable's exit 2 means findings, while exit 1 means an operational failure.

The [reviewed 2026-09-15 results](results.md) preserve the raw diagnostics and
report detected, missed, and clean outcomes separately for each viewport.

## Interpret results

The primary unit is a **seed at a viewport/state**, not an arbitrary tool exit code.
Viewrule findings must name the expected executable rule. Impeccable candidate
families are inspection aids, not automatic true-positive labels: each raw finding
must identify the seeded defect and its affected element before it counts.

Review every emitted diagnostic and record its disposition: seed detection,
valid additional concern, task-relative false positive, or unresolved. A font or
padding opinion is not automatically a detection of missing comparison context,
and it is not automatically a false positive. The clean controls and unseeded
viewport states expose false-positive candidates. Keep original findings alongside
adjudications; do not tune ignored rules after seeing results and then report the
tuned run as defaults. No overall precision/recall score is published while findings
remain unadjudicated. Detector elapsed time is one observation, not a speed benchmark.

Setup cost is explicit: Viewrule receives five scoped rules and one Playwright
checkpoint, plus the finite-task exception. Impeccable uses `detect --no-config --json
--viewport WxH URL` with no suppressed rules. The prose task above is available to
human reviewers, but a deterministic detector cannot infer every task requirement
from it. These conditions test declared enforcement versus generic detection, not
zero-configuration superiority.

CI also prints the complete result JSON and writes a per-viewport status table to
the job summary. `Clean` means no diagnostics in an unseeded state; `Missed` means
no diagnostics in a seeded state. Emitted findings require review before scoring.

## Agent review and repair trial

The [controlled three-arm protocol](agent-trial.md) includes an unaided baseline,
isolation, frozen evaluation, and explicit execution prerequisites.

No agent trial has been run. To measure the remaining issue #22 questions, use
independent clean worktrees and the same pinned model/harness, token budget, task,
source, viewport/state access, and product context. Give each arm its actual tool
instructions, without the seed manifest, expected findings, or the other arm's
results. Counterbalance case order and include multiple runs before drawing a model
comparison. Preserve prompts, transcripts, tool outputs, elapsed time, and patches.

Ask each agent to identify actionable defects and repair the UI without changing
`rules.json`, the required counts, or the fixture's data meaning. Judge location,
requirement explanation, actionable evidence, missed defects, and unrelated
recommendations. Re-run the same contracts after repair; a weaker rule is not a
successful repair. Human review must assess semantic changes the detectors cannot
prove. The deterministic run cannot stand in for this experiment.

## Sources and limits

- [Impeccable CLI and detector contract](https://github.com/pbakaus/impeccable/blob/0a4e72a254f3b175c95b36b82e5f2e60fa63f116/README.md#cli).
- [Impeccable detector rule definitions](https://github.com/pbakaus/impeccable/blob/0a4e72a254f3b175c95b36b82e5f2e60fa63f116/crates/foundation/src/registry.rs).
- [Viewrule measurement limits](../../docs/ui-review-enforcement.md).

The source links identify the implementation inspected when designing the protocol;
recorded package versions and binary hashes identify what actually ran. Linux is the
initial execution platform. Cross-viewport memory is native to Viewrule; independent
Impeccable URL scans do not claim to compare identities across runs. An absent
purpose-built detector is a capability boundary, not evidence that an Impeccable-guided
agent would miss the problem. Keep #22 open until the agent trial and full adjudication
are complete.

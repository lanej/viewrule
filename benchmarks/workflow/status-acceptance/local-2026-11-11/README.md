# Local status-task attempts — 11 November 2026

Both agents completed the same frozen task within five minutes and passed the unchanged independent acceptance checks and controller-run Viewrule checks. This is one exploratory attempt per arm, not evidence of a causal repair or speed advantage. No human design approval is recorded.

| Arm | Completion | Independent acceptance | Protected inputs | Elapsed seconds |
| --- | --- | --- | --- | ---: |
| Baseline | Completed | Passed | Unchanged | 170.32 |
| Full Viewrule assistance | Completed | Passed | Unchanged | 147.56 |

The baseline used the task and browser without Viewrule launcher calls. The assisted attempt consulted its contract and decision-context guide and ran the configured check. One guide invocation incorrectly included `--project`; the agent retried without those arguments. That friction and its correction remain in the local transcript; the run was not replaced.

## Frozen conditions

The case source is commit `10b034cea911ef39d59a324386abcca4f544fb15`. Both attempts received identical starting HTML, CSS, JavaScript, task, and synthetic data; only assistance differed. The independent evaluator was hashed before either attempt and its observations were withheld during repair. The authored passing implementation was not supplied to either agent. Original task/configuration/data hashes stayed unchanged. Fixed observations covered connected, retained stale, unavailable-without-readings, and scheduler-unavailable states at 390×844 and 1280×900, plus pause/manual-refresh/resume behavior. Evaluation recorded no failed requirement observations in either arm.

Requested model `gpt-6.1-sol`, medium reasoning; Codex CLI `0.167.1`, Node `26.13.0`, Playwright `1.62.1`, Chromium `151.0.7922.34`. The service did not report a separate returned model or immutable backend revision. The same tested Viewrule archive was used for assistance and controller checks: SHA-256 `53b0d1b274f203c25a38259c7ae3b3eff85e626729cabfe5e9fa727bcdcce9b5`. Model and headless-browser preflights succeeded before the attempts. Baseline ran first, assisted second, in fresh ephemeral sessions and separate task workspaces. Local filesystem writes were sandboxed; read isolation relied on instructions rather than a sealed container. Tool access and clock conditions do not establish human-perceived equivalence or absence of all environmental confounding.

## Provider-reported usage

| Arm | Input tokens | Cached input, included in input | Output tokens | Reasoning output, included in output |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 489,234 | 430,592 | 6,623 | 1,115 |
| Full Viewrule assistance | 527,218 | 482,816 | 5,349 | 571 |

Elapsed time covers the agent process, including its tool use, but excludes shared case/contract authoring, environment setup, subsequent independent evaluation, publication, and review. Cached input is a subset, not an additional token total. Provider dollar cost and total authored-contract effort were not measured. Timing is an observation from this pair, not a controlled estimate of Viewrule's efficiency.

## Retained outcomes

[Machine-readable results](results.json) retain exact versions, evaluator/package hashes, completion, usage, integrity, and acceptance. [Baseline patch](baseline.patch) and [assisted patch](viewrule.patch) retain the actual neutral application edits; apply either with `git apply -p1` inside a freshly prepared app to inspect that output. They are run records, not new passing references or additional CI cases. The source application Midea was not modified.

Full prompts, before/after apps and manifests, original event transcripts, stderr, original-size screenshots, and independent/engine reports remain in the task's local evidence directory. Public results omit account/transport metadata and do not substitute an agent's own completion message for acceptance. The current evaluator passes are scoped to the frozen assertions; browser captures and unblinded agent inspection do not certify overall usability or universal absence of clipping/occlusion.

The reusable result is the task and acceptance machinery: new agent outputs can be evaluated against the same frozen requirements. This pair did not show an additional repair benefit because both arms satisfied those requirements.

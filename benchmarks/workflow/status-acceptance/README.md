# Status-page acceptance

This is a repeatable acceptance case, not a model benchmark in CI. Its task asks for accessible freshness information and refresh controls on a read-only status page. Inputs, public requirements, browser conditions, and the independent evaluator are fixed; an agent's implementation may vary.

The fixture is adapted from Midea's status page at source revision `a1cf0d90469d555199158d5874fbca760824721f`. It retains the reading/next-action/schedule/history/disclosure structure and pause/resume behavior. Device names, service details, and all observations are neutral synthetic data; the history is a small observation table rather than an appliance chart. The new manual-refresh action works while automatic refresh is paused. The real Midea application, collector, credentials, and appliances are not dependencies and are unchanged.

## What CI establishes

The existing installed-CLI workflow calls `verifyFixtures` with the installed engine entrypoint. It requires the starting arrangement to fail initial control visibility, the separately authored passing implementation to pass, and the broken repair to fail independent preservation/refresh acceptance even though its configured geometry checks pass. The broken repair hides and corrupts history, changes a schedule action, hides failure warnings, resumes automatic updates after a manual refresh while paused, and uses an incorrect fifteen-second interval. These are retained contradictions, not additional agent attempts.

Viewrule owns configured geometry and evidence. Independent browser assertions own exact state values, retained content, focus, disclosure state, and refresh behavior. Fixed responses and Playwright's controlled clock avoid appliance access and thirty-second sleeps. The evaluator checks four initial states at phone 390×844 and desktop 1280×900, then exercises online → retained stale → empty → scheduler failure transitions at both widths. The independent browser blocks nonlocal and non-GET requests and skips subsequent Viewrule capture if forbidden traffic was observed. Viewrule capture is not itself a general network sandbox; run trusted local candidates, not hostile scripts. Visible boxes and DOM text are bounded evidence, not a guarantee of glyph paint, absence of occlusion, or overall usability. Human design approval remains separate.

CI needs Node, the package dependencies, and Chromium. It does not launch Codex, access a model, or use model credentials. `dist/status-acceptance-evidence/` retains requirement observations, native-scale screenshots, and complete Viewrule runs as a CI artifact. A green fixture check establishes evaluator calibration, not agent performance.

## Commands from a development checkout

Run `npm ci` and install the pinned browser through the existing `npm run browser:install` workflow when needed. On macOS, use an approved headless browser launch. Choose new output paths; commands refuse to overwrite earlier attempts.

```sh
# The same acceptance story used in the installed regression, against source.
npm run acceptance:status -- verify-fixtures /tmp/status-fixture-evidence

# Each attempt gets the same starting app, task and data.
npm run acceptance:status -- prepare /tmp/status-assisted
npm run acceptance:status -- prepare /tmp/status-baseline --baseline

# Serve one app; use the printed loopback URL, not an assumed port.
npm run acceptance:status -- serve /tmp/status-assisted

# Evaluate a completed attempt, preserving evidence outside its editable app.
npm run acceptance:status -- evaluate /tmp/status-assisted /tmp/status-assisted-result
```

`prepare` creates `app/` and a sibling `manifest.json`. Agents work only inside `app/`, editing `index.html`, `style.css`, and `app.js`. TASK/data hashes and the evaluator hash are frozen in both arms; the assisted arm also receives protected `.ui-review` rules/configuration. Baseline receives the same prose requirements and data without that tooling configuration. Keep the manifest, evaluator, reference implementations, other attempts, and output directory outside the agent workspace. Evaluation uses the evaluator's canonical data/contract, not an editable expected-values file.

`evaluate` writes `result.json`, captures, and `review/` containing the engine's full saved run. Exit 0 means accepted, 1 means completed but rejected, and 2 means setup/execution/integrity failed. Missing evidence, changed protected inputs, and engine usage errors cannot become acceptance passes. Hashes cover inputs before and after evaluation and identify the final application sources. This local workspace convention is not hermetic read isolation: do not describe evaluator access as technically sealed.

## Optional local agent attempts

No new agent runner is required. Use locally authenticated agent tooling, with one fresh baseline session followed by one fresh Viewrule-assisted session. Freeze exact task/source hashes, model/reasoning settings, CLI/browser versions, and the Viewrule package hash before either session. Give both arms the same browser installation, fixed task, and five-minute limit; give only the assisted arm the full Viewrule workflow and its authored contract. Serve each app separately and pass the actual URL. Read the task from `app/TASK.md`; do not expose reference solutions or evaluator results during repair. Do not modify rules or requirements after seeing a result.

Retain actual prompts, transcripts, patches, elapsed time, token usage when reported, stopping reason, protected-input checks, and first/final evidence. Record model preflight failure separately; unavailable model access means agent execution is unrun, not passed. Stop each attempt at five minutes, preserve any partial work, and do not replace failed attempts. Evaluate outputs independently after each session. Record setup/authoring effort separately, including unavailable measurements. Results from a single exploratory pair cannot establish a causal speed or repair advantage, and a model alias does not identify an immutable provider backend.

The fixture verifier runs in CI; these optional model sessions never do. Future agent-generated implementations can be evaluated without adopting their source as a new reference or changing the acceptance contract.

## Recorded local attempts

The [11 November 2026 pair](local-2026-11-11/README.md) completed with both outputs accepted under unchanged requirements. It retains patches, versions, hashes, usage, and important execution limits; it establishes neither a repair advantage nor a general speed advantage. These local model outcomes are separate from CI fixture calibration.

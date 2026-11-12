# Status-page acceptance

Revision 3 is a repeatable acceptance case, not a model benchmark in CI. Its task asks for accessible data-feed freshness information and refresh actions on a read-only status page. Inputs, public requirements, browser conditions, and the independent evaluator are fixed for each revision; an agent's implementation may vary.

The fixture is adapted from Midea's status page at source revision `a1cf0d90469d555199158d5874fbca760824721f`. It retains the reading/next-action/schedule/history/disclosure structure and pause/resume behavior. Device names, service details, and all observations are neutral synthetic data; the history is a small observation table rather than an appliance chart. Explicit manual refresh works while automatic refresh is paused. The real Midea application, collector, credentials, and appliances are not dependencies and are unchanged.

Revision 2 corrects review findings in the first oracle and reference: incomplete preservation checks accepted missing mode/display/sound facts, mouse clicks did not establish keyboard-accessible actions, presentation-specific strings and tags rejected equivalent implementations, and an in-flight automatic response could update the paused reference. The [recorded local agent pair](local-2026-11-11/README.md) belongs to revision 1 at `10b034cea911ef39d59a324386abcca4f544fb15`; those attempts, scores, patches, and usage have not been rerun or rescored against revision 2. Reproduce that record from its original source rather than treating its scores as evidence for the current oracle.

Revision 3 adds default viewport-sparsity discovery without changing functional acceptance: the sparse desktop reference remains accepted and receives an advisory, while a compact counterpart preserves the same facts and behavior with its content fitting above the fold. The same installed story calibrates short finite and media-led pages. These are geometry proxies, not design approval. Historical attempts retain their original revision 1 scores.

## What CI establishes

The existing installed-CLI workflow calls `verifyFixtures` with the installed engine entrypoint. It retains five concrete implementations in the same acceptance story: the starting arrangement fails initial action visibility; the separately authored passing and compact references are accepted; the broken repair fails preservation, accessible-action, and refresh obligations; and the pointer-only repair has named button roles but fails keyboard activation. Configured geometry passing alone cannot accept either broken repair. These are fixture-calibration inputs, separate from the recorded local agent attempts.

Viewrule owns configured geometry and evidence. Independent browser assertions own exact state values, the declared retained-fact inventory, accessible button roles/names, keyboard activation, focus, disclosure state, and refresh behavior. Fixed responses and Playwright's controlled clock avoid appliance access and thirty-second sleeps. The evaluator checks four initial states at phone 390×844 and desktop 1280×900, then exercises online → retained stale → empty → scheduler failure transitions at both widths, including Pause while an automatic response is in flight. State and retained values are checked through the declared IDs/regions instead of requiring incidental schedule/history tags or one literal paused-status sentence. History record identifiers establish order and identity; acceptance also requires each marked record's visible facts, while headings or context outside those regions remain flexible. The independent browser blocks nonlocal and non-GET requests and skips subsequent Viewrule capture if forbidden traffic was observed. Viewrule capture is not itself a general network sandbox; run trusted local candidates, not hostile scripts. Visible boxes and DOM text are bounded evidence, not a guarantee of glyph paint, absence of occlusion, or overall usability. Human design approval remains separate.

The passing reference demonstrates valid presentation alternatives: concise Refresh/Pause/Resume labels, named mobile icons, compact paused-state copy, and schedule actions in `<div>` wrappers. These choices are examples that satisfy the authored contract; the oracle does not require those exact labels, glyphs, or wrappers, and they do not constitute human design approval.

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

`prepare` creates `app/` and a sibling `manifest.json` identifying the case revision. Agents work only inside `app/`, editing `index.html`, `style.css`, and `app.js`. [TASK.md](TASK.md) declares the stable reading/action/disclosure IDs, the `#status-page[data-ready]` readiness marker, `.schedule-event` time/power field regions, and six stable `data-observation` record identifiers within `.history`. Inner markup and visible wording remain flexible while their facts, accessible action semantics, and behavior are preserved. TASK/data hashes and the evaluator hash are frozen in both arms; the assisted arm also receives protected `.ui-review` rules/configuration. Baseline receives the same prose requirements and data without that tooling configuration. Keep the manifest, evaluator, reference implementations, other attempts, and output directory outside the agent workspace. Evaluation uses the evaluator's canonical data/contract, not an editable expected-values file. Prepare a fresh attempt for revision 3; an old manifest is not migrated or silently rescored.

`evaluate` writes `result.json`, captures, and `review/` containing the engine's full saved run. Exit 0 means accepted, 1 means completed but rejected, and 2 means setup/execution/integrity failed. Missing evidence, changed protected inputs, and engine usage errors cannot become acceptance passes. Hashes cover inputs before and after evaluation and identify the final application sources. This local workspace convention is not hermetic read isolation: do not describe evaluator access as technically sealed.

## Optional local agent attempts

No new agent runner is required. Use locally authenticated agent tooling, with one fresh baseline session followed by one fresh Viewrule-assisted session. Freeze exact task/source hashes, model/reasoning settings, CLI/browser versions, and the Viewrule package hash before either session. Give both arms the same browser installation, fixed task, and five-minute limit; give only the assisted arm the full Viewrule workflow and its authored contract. Serve each app separately and pass the actual URL. Read the task from `app/TASK.md`; do not expose reference solutions or evaluator results during repair. Do not modify rules or requirements after seeing a result.

Retain actual prompts, transcripts, patches, elapsed time, token usage when reported, stopping reason, protected-input checks, and first/final evidence. Record model preflight failure separately; unavailable model access means agent execution is unrun, not passed. Stop each attempt at five minutes, preserve any partial work, and do not replace failed attempts. Evaluate outputs independently after each session. Record setup/authoring effort separately, including unavailable measurements. Results from a single exploratory pair cannot establish a causal speed or repair advantage, and a model alias does not identify an immutable provider backend.

The fixture verifier runs in CI; these optional model sessions never do. Future agent-generated implementations can be evaluated without adopting their source as a new reference or changing the acceptance contract.

## Recorded local attempts

The [11 November 2026 pair](local-2026-11-11/README.md) completed with both outputs accepted by the original revision 1 oracle. It retains patches, versions, hashes, usage, and important execution limits; it establishes neither a repair advantage nor a general speed advantage. These historical local model outcomes are separate from current CI fixture calibration. No revision 2 or 3 agent outcomes have been recorded here.

## Design review remains open

Review of the initial PR presentation requested desktop evidence that explains the measured failure, precise data-feed terminology, concise Refresh/Pause labels, and contextual mobile icons with accessible names. These actions update the displayed readings; they do not operate the appliance. The original screenshots did not establish why these actions deserved their proposed placement or whether the presentation was economical.

[DR-011](../../../docs/design-rules/DR-011-action-scope.md) already permits familiar compact controls with accessible names and says that repeating an unambiguous scope in every button is unnecessary. Revision 2 now checks basic accessible action semantics and demonstrates concise/mobile alternatives, but it does not establish their contextual clarity, visual priority, or the best responsive presentation for another task. Geometry and behavior passing here must not be presented as design approval. The original human feedback concerns the reference presentation; it is not a blind grade of each agent output. The recorded revision 1 automatic outcomes remain unchanged.

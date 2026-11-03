---
name: review
description: Consult cited design patterns before building or revising dashboards, charts, action lists, or disclosure flows; then validate functional components and their assembled composition with Viewrule.
---

Run from the application repository. Use this launcher for all Viewrule commands:
`node "<viewrule-root>/scripts/viewrule.mjs" <command>`.

For a request limited to automated source diagnostics, inspect the installed
engine's `--help` once. If it supports `lint`, run `lint --target <UI source>` and
report its findings and source-only coverage; no guide-reading or full visual
critique is needed for that task. A clean source scan does not assess application
rules or satisfy rendered-evidence verification. Use the rendered workflow below when the request
includes layout, interaction, comparison requirements, or visual review. Engines
without `lint` predate the bundled integration; state that limitation and use only
capabilities present in their installed help and documentation. Older engines through
0.5.1 also predate the Impeccable-specific command adapter. Do not
install or download a newer engine during a check or verification.

For substantive rendered work, start with the short
`<viewrule-root>/references/preflight.md`. Read it once and reuse unchanged
decisions during the task. Consult `component-composition.md` beside it only for
relevant header, toolbar, disclosure, or assembled-view detail. Component and
composition review are responsibilities that one configured run can cover.

When relevant guidance is not already known for this task, run `guide` for a compact index, then `guide <ID>` for only
the relevant pages (P-001 decision context, P-002 disclosure, P-003 action lists,
P-004 Tufte, P-005 encodings). Follow selected evidence IDs, examples, and related
pages as needed. Do not load the entire corpus. Direct offline reads begin at
`<viewrule-root>/guide/v1/index.md`; relative guide/evidence links stay there.
Links leaving the guide target repository/package files: use `docs` for the installed
engine's documentation root and resolve `docs/...` there. Check gallery availability
in the installed engine and state unavailable access rather than assuming it.
Bundled Markdown examples and evidence summaries remain available without network or engine setup.
Public fallback: `https://lanej.io/viewrule/guide/v1/index.json` and linked `.md` files.
Published Markdown links resolve directly; the index also supplies absolute example URLs.
Local Markdown retains repository/package paths for offline use. When following runnable
examples, read the index’s `exampleSource` (`guide/v1/examples.json`) for the pinned
Easy UI source and stories. Reuse relevant components from that revision; guidance
itself is framework-independent. Generated package examples work offline; do not
edit their bundles as if they were canonical implementation source.
Cite consulted IDs and corpus version, relevant sources, assumptions, and reasons
for adopting or departing from conditional advice. Do not claim a cited paper tested
our example UI. If the decision or essential factors are unknown, state a provisional
assumption or ask a targeted question; never certify decision sufficiency.

Patterns are advice; evidence has an explicit type and limits. Enforceable requirements
come from the application's configured contract, not an ID or an arbitrary density
preference. A passing check does not establish a useful design. For checks, if the
engine or project is unconfigured, follow [setup workflow](setup.md) within the task's scope.

Before making UI decisions, read DESIGN.md. When it is absent, unfinished, or lacks
intent needed for the task, invoke [design workflow](design.md) before substantive UI work.
For read-only review, report the contract gap without authoring or migrating files.
A linter cannot establish that the document is complete or its decisions are good;
keep unresolved material requirements and unassessed verification explicit.
Run `contract` to read the effective boundaries. Retrieve `guidance` and `docs`
when their preferences or installed references are not already available and
unchanged in this task. Read only applicable policy, measurement definitions,
project rules, and approved references; refresh after the relevant inputs change.
Identify what the user needs to compare or decide. Cite DR IDs when translating
that task into constraints; use stable selectors and CSS-pixel viewports.
Summarize the task, critical comparisons, blocking boundaries, warnings, and qualitative
choices before choosing the layout. Use [add-rule workflow](add-rule.md) for requested new boundaries.
The contract shows effective merged rules, document hashes, and changes since the
previous report. Use stable DESIGN.md section references in authored rule `sources`.

Use the preflight to sketch the affected view before implementation. Reuse existing
components and stories; no new primitive library or rendering harness is required.
For read-only review, inspect these responsibilities without changing source or intent.

With the intended app state running, validate both levels:

1. Use the actual URL reported by the running application and run
   `check --incremental --url <actual-url>` when explicit `reviewScopes` and
   `evidenceReuse` are configured; otherwise use `check --url <actual-url>`
   (or set `VIEWRULE_BASE_URL`). `check` plans its own work; use `plan --incremental`
   only to diagnose scope or invalidation decisions. Do not invent a fixed
   localhost port or probe other listeners. Read its JSON findings and saved report.
   If the installed engine's `--help` lacks `Runtime URL:`, it still uses configured
   `baseURL`; verify that it matches the running app and follow its installed docs.
   Do not assume `check --url` or the environment override works on older engines.
   Exit 1 means failed checks;
   exit 2 means setup or usage failed. A missing report is not a passing review.
   Incremental mode still covers every configured obligation and checks evidence
   freshness. An unchanged report may be reused without a new capture; identify it
   as reused. Run `check --full` and the full app suite in required application CI
   before merge. A run can cover both review levels.
2. Inspect the overview for composition and affected detail tiles at original size.
   Inspect representative text and comparison regions at each configured viewport,
   including the largest. Follow `details.tiles[].file` relative to the report folder.
   If an image tool resizes a tile or cannot inspect it, disclose that limitation.
   Assess affected functional units and their meaningful states, then separately
   assess the assembled view's shared context, comparisons, overhead, and disclosure.
   Reuse the app's interaction/accessibility tests; screenshots cannot prove behavior.
   Isolated component stories do not establish coverage of their parent composition.
3. Review `contract.changes`, `contract.documentChanges`, and configuration/policy changes
   separately from app repairs. A passing run does not approve a changed boundary.
   For each material finding, connect the rule ID and DR citation to the page,
   viewport, selector, observed value, expected value, and suggested correction.
   Distinguish measurements from visual judgment and unassessed requirements.
4. When repairs are within the user's task, change the application and rerun after
   the change. For a review-only request, report findings without editing source.
   Do not stop at a component pass. Complete both requested review scopes with fresh
   or verified reusable passing check evidence, or explicitly report remaining failures, missing coverage,
   blockers, or unresolved judgments. Do not repeat unchanged failing runs or keep
   retrying when the measurement cannot express the intended design.

Export a before/after comparison when requested or needed to evaluate a repair;
do not generate a permanent comparison archive for every edit. Before a long repair
session, copy a needed first run outside disposable `.ui-review/runs/` history;
retaining only its path will not protect it from engines with automatic cleanup.
With engine 0.10.0+ (`--help` lists `compare`), use
`compare --before <saved-first-report> --after <final-report> --output <new-directory>`.
Inspect the paired originals and gap reasons; add `--image` only for a needed
shareable image. Consult installed `docs/saved-comparisons.md` for annotations.
Keep the actual selected evidence, including failures or unchanged outcomes; never
retrofit geometry or substitute a passing attempt. Routine intermediate runs may
expire under engine retention. Read-only review needs no artificial second run,
and unchanged source needs no repeat capture just to manufacture an after image.
Report changed contracts as comparison gaps, not measured repairs; a delta does not
establish approval or semantic preservation. Use only capabilities in installed help.

Box/text coverage is a proxy: stretched empty containers or smaller unreadable type
do not establish useful density. Preserve visible comparison identities, readable
labels, truthful context, and task-appropriate whitespace. Full-resolution capture
does not prove inspection, and a green exit does not certify overall design quality.

Never loosen checks, rewrite DESIGN.md, or edit evidence solely to pass. Contract
acceptance is not screenshot approval. Record approval only from the human who
reviewed that exact result; use [feedback workflow](feedback.md) for supplied feedback.
Summarize component evidence, composition evidence, and unassessed requirements
separately using the companion's evidence ledger. Identify the actual states/viewports,
checks/tests, image inspection, and report; mark not-applicable scopes with a reason.
A configured-check pass and unresolved design judgments must be reported separately.

---
name: review
description: Consult cited design patterns before building or revising dashboards, charts, action lists, or disclosure flows; then validate functional components and their assembled composition with Viewrule.
---

Run from the application repository. Use this launcher for all Viewrule commands:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" <command>`.

For a request limited to automated source diagnostics, inspect the installed
engine's `--help` once. If it supports `lint`, run `lint --target <UI source>` and
report its findings and source-only coverage; no guide-reading or full visual
critique is needed for that task. A clean source scan does not assess application
rules or satisfy the Stop hook. Use the rendered workflow below when the request
includes layout, interaction, comparison requirements, or visual review. Engines
without `lint` predate the bundled integration; state that limitation and use only
capabilities present in their installed help and documentation. Older engines through
0.5.1 also predate the Impeccable-specific command adapter. Do not
install or download a newer engine during a check or Stop hook.

For substantive rendered work, read
`${CLAUDE_PLUGIN_ROOT}/skills/review/component-composition.md` once for the task.
Follow task and rough composition -> component pass -> assembled-composition pass,
revising either level as needed. These are workflow responsibilities, not new CLI
commands, a requirement for two full runs, or automatic design-quality enforcement.

Before relevant UI work, run `guide` for a compact index, then `guide <ID>` for only
the relevant pages (P-001 decision context, P-002 disclosure, P-003 action lists,
P-004 Tufte, P-005 encodings). Follow selected evidence IDs, examples, and related
pages as needed. Do not load the entire corpus. Direct offline reads begin at
`${CLAUDE_PLUGIN_ROOT}/guide/v1/index.md`; relative guide/evidence links stay there.
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
engine or project is unconfigured, follow `/viewrule:setup` within the task's scope.

Before making UI decisions, read DESIGN.md. When it is absent, unfinished, or lacks
intent needed for the task, invoke `/viewrule:design` before substantive UI work.
For read-only review, report the contract gap without authoring or migrating files.
A linter cannot establish that the document is complete or its decisions are good;
keep unresolved material requirements and unassessed verification explicit.
Run `contract`, `guidance`, and `docs`. Read the policy at the returned path, relevant
measurement definitions, project rules, and applicable approved references.
Identify what the user needs to compare or decide. Cite DR IDs when translating
that task into constraints; use stable selectors and CSS-pixel viewports.
Summarize the task, critical comparisons, blocking boundaries, warnings, and qualitative
choices before choosing the layout. Use `/viewrule:add-rule` for requested new boundaries.
The contract shows effective merged rules, document hashes, and changes since the
previous report. Use stable DESIGN.md section references in authored rule `sources`.

Before implementation, sketch shared context, view controls, evidence, and actions.
Identify the affected functional units and their component/composition obligations
in DESIGN.md. Refine units in their intended containers using existing components,
stories, or in-page regions; do not build a new primitive library or harness. Assemble
early, then assess repeated context, cumulative header/control overhead, action scope,
and disclosure. Keep routine decision evidence visible; sparse can be appropriate.
For read-only review, inspect those responsibilities without changing source or intent.

With the intended app state running, validate both levels:

1. Use the actual URL reported by the running application and run
   `check --url <actual-url>` (or set `VIEWRULE_BASE_URL`). Do not invent a fixed
   localhost port or probe other listeners. Read its JSON findings and saved report.
   Exit 1 means failed checks;
   exit 2 means setup or usage failed. A missing report is not a passing review.
   Keep full review as the default; this phase split does not authorize incremental
   mode, narrower coverage, or stale evidence. A run can cover both review levels.
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
   passing check evidence, or explicitly report remaining failures, missing coverage,
   blockers, or unresolved judgments. Do not repeat unchanged failing runs or keep
   retrying when the measurement cannot express the intended design.

Box/text coverage is a proxy: stretched empty containers or smaller unreadable type
do not establish useful density. Preserve visible comparison identities, readable
labels, truthful context, and task-appropriate whitespace. Full-resolution capture
does not prove inspection, and a green exit does not certify overall design quality.

Never loosen checks, rewrite DESIGN.md, or edit evidence solely to pass. Contract
acceptance is not screenshot approval. Record approval only from the human who
reviewed that exact result; use `/viewrule:feedback` for supplied feedback.
Summarize component evidence, composition evidence, and unassessed requirements
separately using the companion's evidence ledger. Identify the actual states/viewports,
checks/tests, image inspection, and report; mark not-applicable scopes with a reason.
A configured-check pass and unresolved design judgments must be reported separately.

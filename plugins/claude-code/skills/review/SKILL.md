---
name: review
description: Guide web UI design and implementation with Viewrule rules, then measure layout, comparison density, and large-screen detail. Use for building, revising, or reviewing rendered interfaces.
---

Run from the application repository. Use this launcher for all Viewrule commands:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" <command>`.
If the engine or project is unconfigured, follow `/viewrule:setup` within the task's scope.

Before making UI decisions, run `guidance` and `docs`. Read the policy at the returned
path, relevant measurement definitions, project rules, and applicable approved
references. Identify what the user needs to compare or decide. Cite DR IDs when
translating that task into constraints; use stable selectors and CSS-pixel viewports.

After implementation, with the intended app state running:

1. Run `check`. Read its JSON findings and saved report. Exit 1 means failed checks;
   exit 2 means setup or usage failed. A missing report is not a passing review.
2. Inspect the overview for composition and affected detail tiles at original size.
   Inspect representative text and comparison regions at each configured viewport,
   including the largest. Follow `details.tiles[].file` relative to the report folder.
   If an image tool resizes a tile or cannot inspect it, disclose that limitation.
3. For each material finding, connect the rule ID and DR citation to the page,
   viewport, selector, observed value, expected value, and suggested correction.
   Distinguish measurements from visual judgment and unassessed requirements.
4. When repairs are within the user's task, change the application and rerun after
   the change. For a review-only request, report findings without editing source.
   Stop when the requested scope has fresh passing evidence, or explain a blocker
   or unresolved judgment. Do not repeat unchanged failing runs or keep retrying
   when the measurement cannot express the intended design.

Box/text coverage is a proxy: stretched empty containers or smaller unreadable type
do not establish useful density. Preserve visible comparison identities, readable
labels, truthful context, and task-appropriate whitespace. Full-resolution capture
does not prove inspection, and a green exit does not certify overall design quality.

Never loosen checks or edit evidence solely to pass. Record approval only from the
human who reviewed that exact result; use `/viewrule:feedback` for supplied feedback.
Summarize the actual checks and image inspection, link the report, and state limits.

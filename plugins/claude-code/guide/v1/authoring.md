---
{
  "schemaVersion": 1,
  "version": "1.2.0",
  "id": "guide-authoring",
  "kind": "authoring",
  "title": "Contribute guidance",
  "summary": "Add one task-scoped page, primary evidence, and original examples; validate the same source for people and agents."
}
---

# Contribute guidance

## Start from a task

Copy [template.md](template.md), choose a permanent `P-NNN` ID, and write a concrete decision or action. Check the existing guide, gallery, and Design lab first. Keep a guidance ID when revising its wording. Use `kind: pattern` for conditional recommendations; executable rules remain in the engine's existing schema, presets, and manuals.

Frontmatter is **JSON inside `---` delimiters**, a restricted YAML subset. This deliberately avoids a YAML dependency. Use the [JSON Schema](schema.json). Every pattern requires a summary, applicability, related pattern IDs, DR references, evidence IDs, and an array with at least one good and one bad example. Add more examples when they show materially different solutions or limits. The validator requires the substantive sections in the template.

## Evidence and examples

Create a short `evidence/*.md` record with a stable `E-...` ID. Label `experimental`, `practitioner`, `standard`, or `convention`; state the exact source, scope, and limitations. Convention records can cite their versioned repository rationale rather than pretending to have external validation. Every substantive external recommendation must link its supporting evidence beside the claim, not only list a bibliography. Mark a new inference explicitly.

For experiments, report the tested task, stimuli/conditions, response measure, and result. Verify numbers and locators in the original paper. Do not infer sample size from trial count or convert log error to a percentage improvement. Record source access limitations; do not invent quotations or bibliographic details.

Keep example data and intended task constant wherever possible. Explain the consequence for that task, including exceptions. Identify guidance/evidence on the runnable page. Canonical React examples and fixtures belong in Easy UI’s existing `easy-ui-react/src/examples/DesignGuide.*` stories and chart gallery. Compose its components and shared tokens; do not maintain equivalent UI source here. View Rule’s `docs/examples/pricing.html`, `encodings.html`, and `easy-ui/` contain the pinned static build. The [example manifest](examples.json) records the exact source revision, source/story paths, rendered anchors, and SHA-256 asset checksums. Cite sources without copying their illustrations. Use synthetic data with explicit assumptions, especially for business examples.

For an enforceable difference, supply a scoped rules JSON and extend the **existing installed workflow** with its expected finding. Advisory counterexamples can pass: say which checks were applied. Do not assert an engine result from a visual badge. Refresh screenshots after inspecting the rendered result; include viewport/state and link the source example. Do not add another test suite.

## Refresh the Easy UI examples

Use a clean Easy UI checkout at the intended commit, then run `npm run examples:import -- /path/to/easy-ui <40-character-commit>` from View Rule. This maintenance command runs `npm ci` and the guide-only gallery build, imports local fonts and redistribution notices, and rewrites only asset URLs. Normal guide checks, site builds, plugin reads, and installed examples need neither this checkout nor network access. Rules JSON remains authored here. Do not hand-edit generated files; checksum validation rejects drift.

Run the installed workflow against the imported bundle, including actual rendered anchors and expected findings. The manifest declares client-rendered anchors because Vite entry HTML only bootstraps React; the browser regression verifies their existence. Refresh `docs/examples/images/guide-*.png` from the imported pages, record state/viewport, and review changes alongside the source pin. A checksum proves identity, not correctness.

## Validate and publish

Run `npm run guide:check`, `npm run check`, and `npm run site:build`. These validate frontmatter, identifiers, citations, related references, Markdown links/anchors, and example paths. Build renders this canonical Markdown and exports Markdown with deployment-relative links in its body and example metadata; prose is maintained only here. The build verifies exported Markdown links and anchors from their public location. The build also generates `index.json`. Raw HTML is excluded from the guide Markdown contract; use Markdown links, tables, and code fences.

A changed runnable example or retrieval behavior also needs the affected installed regression (`npm test`) and visual/interaction inspection. A prose edit does not need repeated browser runs. Semantic evidence quality still needs review: a link checker cannot prove a claim is supported.

Canonical files live at `plugins/claude-code/guide/v1/` so an isolated Claude plugin can read them offline. The npm `files` list includes that directory and the shared reader; it also contains the example assets in `docs/`. `viewrule guide [ID]` and the plugin launcher's `guide [ID]` use the same reader. Examples/manuals outside the plugin are available through the engine package or public site; their absence must not block reading the bundled advice.

Bump the corpus version across its frontmatter for a released content revision, and bump the plugin manifest for plugin changes. The engine's published pin is independent; do not point it at an unreleased archive. `v1` URLs are a compatible channel; cite ID + version and a commit URL for exact historical retrieval. Keep older major directories available if a later major is published. Git history preserves earlier minor revisions.

The existing Pages workflow deploys only from main after regression passes. A successful local build is not a live deployment. PR descriptions need rendered screenshots, example source links, executed validation, and explicit limits; label unpublished URLs as planned.

## Real Claude workflow exercise

Status: **not executed here**; the Claude CLI is unavailable. CLI retrieval tests are not evidence of autonomous consultation. On a machine with an authenticated Claude Code installation, launch `claude --plugin-dir ./plugins/claude-code` from a disposable application checkout, using the absolute plugin path if the working directory differs.

Ask: “Build a proposal-review screen. Operators compare current and proposed price, contribution range, and constraint state before queueing review or holding. Histories are supporting evidence. Use synthetic data and explain your design choices.” Do not explicitly invoke the review skill on the first attempt: record whether normal discovery consulted it. If selection fails, record that failure before separately trying `/viewrule:review`.

Retain a redacted transcript recording Claude/plugin/corpus versions, the initial prompt, selected guide and evidence IDs, fetched example paths, assumptions, implementation choice, and actual configured-check output. Verify consultation preceded implementation and that Claude did not retrieve the whole corpus or equate a passing check with decision sufficiency.

Then change the task: “Demand trends are required before every decision.” Observe whether it revises the initial comparison rather than leaving essential histories hidden. In a separate prompt with unspecified decision factors, verify that it asks a targeted question or states a provisional assumption. Report observed behavior and failed expectations; do not fill in a successful transcript from expected answers.

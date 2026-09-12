---
name: add-rule
description: Add or refine scoped Viewrule design constraints from a concrete UI problem, with schema validation and accepted/rejected evidence. Use when defining a new boundary or turning design feedback into a rule.
---

Run in the application repository with
`node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" <command>`.
Use `/viewrule:setup` if the engine or project is unconfigured.

1. Read `contract`, `guidance`, and the authoring guide returned by `docs`.
   Identify the user's task, the rejected condition, an acceptable alternative,
   applicable pages/viewports, and the DR principle. Preserve existing boundaries.
2. Run `schema --type <supported-type>` for the installed schema. Express the
   expectation using an existing measurement, a stable semantic selector, explicit
   units/thresholds, severity, reason, and DR citations. Save one JSON rule object.
   Use qualitative guidance when the intended distinction cannot be measured.
3. Run `add-rule --rule <file> --dry-run` to validate the rule and project scope.
   Show the proposed boundary and its rationale. If adding it is already authorized,
   run `add-rule --rule <file>`; do not ask for redundant approval. This command
   cannot replace an existing or inherited ID. For a requested revision, use supplied
   report feedback with `/viewrule:feedback` and `learn`; never invent feedback.
4. Exercise the rejected and acceptable states in the application's representative
   workflow. Assert the intended rule, measurement, and citation, not any failure.
   Compare desktop and the largest relevant viewport when testing responsive rules.
   Inspect the saved evidence and explain changes to the contract separately from
   application fixes. Stop once the concrete distinction is established.

A genuinely new measurement belongs in Viewrule: update schema, browser measurement,
DR mapping, types, documentation, and the existing regression together. The installed
CLI has no arbitrary detector loader. Propose the engine change rather than silently
patching the plugin's pinned runtime. Do not weaken constraints merely to obtain a pass.

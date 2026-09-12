---
name: feedback
description: Record a person's feedback on a specific Viewrule report and turn measurable expectations into scoped design rules.
---

Use the person's supplied approval or requested adjustment, tied to the exact report
they reviewed. Resolve an ambiguous report or decision before recording it. An agent's
assessment or a passing check is not human approval.

Run from the application repository using
`node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" <command>`:

1. Run `feedback --report <report.json> --decision adjust|approve --note <actual-feedback>`.
   Quote arguments safely. Preserve the person's meaning and material conditions.
   Keep project scope unless they explicitly want a preference shared across projects.
2. For measurable adjustments, use `docs` to locate the engine's rule reference.
   Translate the feedback into one rule with an ID, supported type, stable selector,
   page/viewport scope, justified threshold, reason, severity, and relevant DR IDs.
   Save it as a JSON object and run `learn --feedback <returned-id> --rule <file>`.
   Explain inferred thresholds; resolve consequential ambiguity with the person.
   Subjective feedback can remain guidance without a fabricated numeric constraint.
3. If implementation is requested, repair the application and capture a new `check`.
   The feedback remains attached to the original report. Obtain actual human feedback
   on the new result before recording a new approval.

`learn` validates supplied JSON and provenance; it does not infer rules from prose.
Approval preserves references and never clears automated failures. Do not change
rules solely to obtain a pass or expand a local preference into a universal policy.

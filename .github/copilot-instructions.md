# Viewrule instructions

Viewrule is a Node 22+ ES-module CLI using Playwright, Ajv, and axe. It measures
scoped UI constraints, captures full-resolution evidence, cites DR-001–DR-008, and
records human feedback. Read AGENTS.md for development and REVIEW.md for reviews.

For code review, prioritize concrete defects introduced or worsened by the diff:
- Missing required evidence or skipped checks turning into a pass.
- Incorrect selector scope, CSS coordinates, viewport comparisons, or DR citations.
- Lost comparison identities, unreadable type, incomplete native-scale capture, or
  empty stretched space being described as useful information density.
- Stale passes, fabricated approval, broken feedback provenance, or private data leaks.
- Broken installed CLI paths, schema/alias compatibility, exit codes, or hook opt-in.

State the file/location, triggering condition, impact, and reasoning. Distinguish
observed results from inference. Do not invent findings or treat the known density
proxy limitation as a new defect in unrelated changes. Do not demand style changes
without an established convention or concrete consequence.

Keep one representative installed-CLI regression workflow. For behavior changes,
use npm ci, npm run browser:install, then npm test once; repeat only after failure
or further changes. Documentation-only changes need example/link/diff review, not
new tests or a local browser run. Do not claim tests ran without evidence.

Keep the engine independent of dotfiles; app selectors and thresholds stay in the
app. A passing proxy does not establish chart truth or semantic density. Never
weaken rules or invent user approval to obtain a pass. Keep review, repair, merge,
and release actions within the user's requested scope.

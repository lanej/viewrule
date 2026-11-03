---
name: viewrule
description: Apply Viewrule design guidance before building or revising web UIs, dashboards, charts, action lists, or disclosure flows, then measure and inspect their rendered evidence. Also use for Viewrule setup, design contracts, scoped rules, and human feedback.
---

# Viewrule

Use the same CLI and application contract with any coding agent. This skill needs
Node.js 22.18+ and npm; it does not require Claude Code, an MCP server, or an API key.

Resolve `<viewrule-root>` to the absolute directory containing this SKILL.md, using
the skill path supplied by the host. It is a placeholder, not an environment variable.
Run commands from the application's checkout, **not** from the skill directory:

```sh
node "<viewrule-root>/scripts/viewrule.mjs" <command> --project <application-root>
```

The launcher resolves its bundled files from its own location, including when the
skill is copied into `.agents/skills/viewrule` or `~/.agents/skills/viewrule`.
It installs only on explicit `setup`. Reading guidance, checking evidence, or
verifying a Git gate must never install or upgrade an engine.

Read only the workflow needed for the request:

- [Setup](references/setup.md): install the pinned engine/browser and configure a new application. Do not run setup merely because a read-only review discovers missing tools.
- [Design](references/design.md): author or update DESIGN.md when substantive UI changes are authorized. A read-only audit reports missing intent without creating it.
- [Review](references/review.md): consult relevant guidance, apply the existing contract, run checks, inspect native-scale evidence, and repair only within the user's request.
- [Add a rule](references/add-rule.md): author and validate a scoped boundary, keeping contract changes separate from application repairs.
- [Feedback](references/feedback.md): record feedback actually supplied by the human against the exact report reviewed.

For rendered UI work, read [the short preflight](references/preflight.md) once;
use [component and composition detail](references/component-composition.md) only
when relevant. Source-only diagnostics need neither a visual review nor an invented
second render. Use `guide` and `guide <ID>` for selective offline design guidance;
`docs` returns the installed engine's policy and measurement manuals after setup.

Always retain configured coverage and the existing human-approval boundary.
A configured-check pass is not a design approval, and an overview image is not
proof that detail tiles were inspected. Report missing tools, image-inspection
limits, failed checks, and unassessed requirements. Never weaken a rule, rewrite
intent, or fabricate feedback to obtain a pass.

---
name: design
description: Author or update a project's DESIGN.md before substantive UI work, preserving accepted decisions and connecting requirements to verification.
---

Run in the application repository. This skill records UI intent; it does not approve
an implementation. Use `node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" <command>`.
For a read-only audit, report missing or incomplete intent without writing any files.
Source-only lint does not require this workflow.

1. Read applicable agent instructions, the brief, existing DESIGN.md, STYLE.md,
   PRODUCT.md, component/token sources, accepted references, and relevant decisions.
   Inspect representative implementation, but distinguish **established** requirements,
   **observed** patterns, and **proposed** decisions. Existing code is not approval.
2. When the engine is installed, run `docs`; read `project-documents.md` beside the
   returned rule-reference path and use `guidance` to inspect unfinished documents.
   Older pinned engines may lack that guide or the new preflight; use only supported
   commands and state the enforcement limit. Do not install during a review or hook.
3. Author or amend DESIGN.md when UI changes are authorized. Cover: users/tasks;
   principles/tradeoffs; visual-system ownership; behavior/resilience/accessibility;
   scoped requirements and verification; evidence, exceptions, and unresolved decisions.
   Preserve existing YAML tokens, headings, accepted choices, and canonical references.
   Link to established product/style sources rather than duplicating their contents.
   Do not replace the whole file with a template or silently ratify implementation drift.
4. Make assumptions explicit. Ask only about gaps that materially change the design;
   otherwise record provisional decisions and keep their verification unassessed.
   Use stable headings such as `### TASK-001` for requirements. Give each requirement
   a scope, mandatory/advisory status, rationale, and verification owner: Viewrule,
   application tests, or human review. No minimum line count or adjective checklist.
5. Remove scaffold instructions, the `viewrule:design-template` comment, and all
   `[TODO: ...]` prompts after authoring. Ordinary open questions may remain explicit;
   unresolved material questions prevent claiming a complete design review.
6. For configured projects, explicitly include DESIGN.md in `projectDocuments` when
   migration is authorized. Preserve all existing entries. An explicit list replaces
   discovery: retain an existing STYLE.md and add other relied-on local documents.
   Do not drop sources or create a second competing token system. Keep agent instruction
   files as small pointers to the shared contract, not copies of design policy.
7. Run `contract` before implementation and summarize its task, comparisons, boundaries,
   qualitative choices, and unresolved judgments. Use `/viewrule:add-rule` to propose
   executable checks with `sources` pointing to stable document sections. Translation
   from prose is reviewable, not automatic compilation; untested prose is not a pass.

Show contract/rule changes separately from application repairs. Never rewrite a
requirement to make a failing implementation pass. Contract acceptance and screenshot
approval are separate; record only human approval actually supplied for that result.

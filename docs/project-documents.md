# Authoring a design contract

DESIGN.md records the current UI intent, decisions, constraints, and verification
expectations. It is not a copy of every implementation detail, a palette alone, or
proof that a design is useful. Author it before substantive UI work.

## Start from evidence

Read the brief, existing product context, design/style documentation, canonical
components and tokens, accepted references, and relevant decision records. Inspect
the application, but label findings as **established**, **observed**, or **proposed**.
Existing code is evidence of what exists, not proof that it was intentionally chosen.
Do not label an inferred requirement or a generated screenshot as human-approved.

Use `/viewrule:design` in Claude Code, or author the document directly. The
[scaffold](../presets/DESIGN.md) supplies prompts; the
[worked example](design-contract-example.md) demonstrates scoped decisions and
verification limits. A compact initial document is preferable to a comprehensive
copy of other documentation. Approximately 80–150 lines is a useful writing budget,
not a test, minimum, or reason to pad a smaller contract.

## Required concerns, not required headings

| Concern | Record |
| --- | --- |
| Purpose and task | Users, scope, the decision or task, and essential information. |
| Principles and tradeoffs | Priorities when goals conflict, non-goals, and why density, whitespace, or a large analytical surface is intentional. |
| Visual system and ownership | Canonical components, tokens, typography, icons, and brand assets; reference implementation values instead of duplicating them. |
| Behavior and resilience | Loading, empty, error, stale, selection, navigation, recovery, keyboard/focus, accessibility, and content expansion. Explain exclusions. |
| Requirements and verification | Stable requirement IDs, scope, mandatory/advisory status, rationale, and whether Viewrule, application tests, or human review verifies each requirement. |
| Evidence and unresolved decisions | Accepted references, assumptions, observed inconsistencies, proposals, explicit exceptions, and decisions still needed. |

Existing sections or explicit references can satisfy these concerns. Preserve
existing front matter and additional sections, including an existing Google-format
DESIGN.md; Viewrule does not parse or export its design tokens. Semantic completeness
is an author/reviewer responsibility, not a heading or word-count heuristic.

Keep agent instructions in AGENTS.md or CLAUDE.md as small pointers. PRODUCT.md and
other product sources retain product ownership; STYLE.md may hold detailed visual
guidance; token/component files retain implementation ownership. Link substantial
historical rationale to decision records. Do not create competing copies of truth.

## Initialization and explicit migration

New `viewrule init` projects declare `projectDocuments: ["DESIGN.md"]` and create a
missing DESIGN.md scaffold without overwriting an existing file. An existing
STYLE.md is retained in the explicit list. `init --documents` also creates a missing
STYLE.md and includes it. STYLE.md is optional to adopt; once explicitly listed,
it must exist. Neither initialization nor installing the plugin approves the prose.

Author the document, remove the scaffold instructions and reserved
`<!-- viewrule:design-template -->` marker, and replace every `[TODO: ...]` prompt.
Then run `viewrule contract` before implementation and `viewrule check` afterward.
An ordinary unresolved question is not a template marker; report material unresolved
questions as blockers to a complete design review rather than inventing an answer.

Existing configurations are not rewritten on upgrade. To adopt the prerequisite,
add DESIGN.md to their `projectDocuments` list. Preserve all existing entries.
When migrating from optional discovery, retain an existing STYLE.md explicitly:

```json
{
  "projectDocuments": ["DESIGN.md", "STYLE.md", "docs/product-context.md"]
}
```

This is a property to merge into the existing configuration, not a complete config.
Include only real project files and preserve any additional required sources. An
explicit list replaces default discovery; omitting STYLE.md would otherwise remove
it from the loaded contract. Nested `docs/DESIGN.md` paths are supported. Without
an explicit list, legacy optional DESIGN.md/STYLE.md discovery remains unchanged.
Migrating an already explicitly listed DESIGN.md adds the authored-prose preflight.
Do not rerun init over an existing configuration as a migration mechanism.

## What the engine establishes

`contract` and `check` reject a missing explicit document, an explicitly loaded
DESIGN.md without authored body text, an unfinished marked scaffold, remaining
reserved prompts, and broken rule-source references. These are exit-2 preflight
errors before Chromium, source-provider execution, report directories, or latest
state writes. An audit reports them; it does not write a contract to clear them.
`guidance` can read unfinished prose, but still reports missing required files.

Headings, comments, YAML front matter, and fenced code alone are not authored UI
intent. The check imposes no mandatory heading names, token schema, length target,
or judgment score. It cannot detect every third-party template, prove completeness,
or establish that the decisions are good. An authored sentence is not evidence
that every required concern or application behavior has been verified.

`lint` remains independent: it returns source-only diagnostics, does not validate
design prose, and never creates rendered evidence or satisfies a rendered review.
Opt-in Stop enforcement and existing exit-code meanings are unchanged.

## Connect requirements to checks

Use stable ATX headings such as `### COMPARISON-001`. An executable rule can cite
`sources: ["DESIGN.md#comparison-001"]`; loaded local documents and their heading
fragments are validated. `#L<number>` is also supported. Prose is not automatically
compiled into rules. Use `/viewrule:add-rule` and the installed rule schema to
propose measurements with reviewable thresholds and selectors.

Document the verification method for each requirement. A DOM measurement, a
behavioral test, and a human judgment establish different things. Keep unassessed
requirements visible even when all configured checks pass. Do not equate a map's
area or viewport occupancy with the ability to distinguish geographic clusters.

All relied-on local prose sources must be explicitly loaded to participate in the
contract and its fingerprints. A Markdown hyperlink by itself does not load or
validate its target. There is no recursive link crawling, parent inheritance, or
network fetching. Existing file-size, UTF-8, and project-boundary checks still apply.

## Cite public rules without copying policy

Read the compact [rule index](https://lanej.io/viewrule/rules/index.json), then only
relevant rules. Each entry includes a stable ID, title, summary, enforcement mode,
HTML/Markdown URLs, canonical source path and SHA-256. Public exports also include
`markdownSHA256` for the exact published bytes, including their JSON front matter;
`sourceSHA256` identifies the canonical file before metadata and link rewriting.
The top-level `policySHA256` is the same policy fingerprint used in review reports.

```sh
viewrule guide rules   # index of the installed engine's policy
viewrule guide DR-006  # exact canonical Markdown for one rule
```

The existing `guide` index links to the rule index; pattern and evidence IDs retain
their existing meaning. These commands read local files only, without a project,
browser, or network request. The isolated plugin delegates rule IDs to its installed
engine; unlike bundled pattern pages, rule lookup needs explicit engine setup.
Engines predating this change do not implement these lookups. State that limitation;
do not silently install a newer engine or fetch a different policy during a check.

For example, write a project-specific requirement under `### COMPARISON-001`, citing
[DR-006 — Rule of Proximity](https://lanej.io/viewrule/rules/dr-006/) and its
[Markdown](https://lanej.io/viewrule/rules/dr-006/index.md), rather than copying the
whole rule. Then use `designRules: ["DR-006"]` alongside
`sources: ["DESIGN.md#comparison-001"]` in the executable rule. `sources` remains a
local-document reference, not a remote-URL field. A citation does not activate a
check, adopt every general recommendation, or establish human approval.

Public URLs track the current site, not an immutable policy revision. Record the
consulted rule ID and `sourceSHA256`; pin a Git commit when exact historical retrieval
matters. A hash identifies bytes, but does not archive them or prove authorship.
The installed policy remains authoritative for checks even when the website is newer.

The site build generates `/rules/index.json` and `/rules/dr-xxx/index.md` from the
same `docs/design-rules/` files and registry used by the engine. It preserves the
complete source body, normalizes relative inline links, and rejects unresolved
relative links. Edit canonical rule files, not generated exports. No policy text,
measurements, enforcement modes, or engine pin is changed by publishing them.

## Changes and approval

Loaded documents are snapshotted and hashed with the contract. Changes appear in
`contract.documentChanges` and invalidate existing freshness evidence, including
when a document is outside `sourcePaths`. Review document/rule/config changes
separately from application repairs. Never weaken a requirement to obtain a pass.

Contract acceptance and screenshot approval are different decisions. Record human
feedback only when it was actually supplied for the exact result. The engine's
preflight neither assigns approval nor certifies untested prose requirements.

## Related prior art

Useful companion references are [Google's DESIGN.md](https://github.com/google-labs-code/design.md),
[Impeccable](https://github.com/pbakaus/impeccable),
[AGENTS.md](https://agents.md/),
[Architecture Decision Records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions),
and the [Design Tokens Community Group](https://www.designtokens.org/).
Viewrule's contract connects project-specific UI intent to verification; it does
not replace those formats or introduce another design-token interchange schema.

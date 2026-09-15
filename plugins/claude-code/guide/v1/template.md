---
{
  "schemaVersion": 1,
  "version": "1.2.0",
  "id": "guide-template",
  "kind": "template",
  "title": "Guidance authoring template",
  "summary": "Copy the pattern frontmatter example and sections below into a new page."
}
---

# Guidance authoring template

Copy this metadata into the new page's `---` frontmatter; replace the example identifiers and text. Keep this template's own metadata unchanged.

```json
{
  "schemaVersion": 1,
  "version": "1.2.0",
  "id": "P-006",
  "kind": "pattern",
  "title": "Task-specific starting pattern",
  "summary": "One-sentence recommendation with scope.",
  "applicability": ["task or interface type"],
  "related": ["P-001"],
  "rules": ["DR-006"],
  "sources": ["E-RECALL"],
  "examples": [
    {"id": "unique-good", "quality": "good", "href": "../../../../docs/examples/index.html#numbers", "task": "The intended action", "consequence": "Why this supports it"},
    {"id": "unique-bad", "quality": "bad", "href": "../../../../docs/examples/index.html#spacing", "task": "The same intended action", "consequence": "What makes it harder"}
  ]
}
```

## What to do and why

Give the recommendation and cite the evidence beside each supported claim. Label your inferences.

## Prefer, avoid, and exceptions

Name conditions that change the recommendation.

## Examples

Link original good/bad variants; keep task and data constant; explain consequences and alternative good solutions.

## Evidence and limits

Link evidence records, distinguish their types, and explain what they did not establish.

## Automated checks and judgment

Name implemented measurements, declared scope, expected findings, and what requires task knowledge. Advisory counterexamples need not fail linting.

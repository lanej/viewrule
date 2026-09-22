# DR-010: preserve the destination query on return

**Task:** Inspect EP 1042 and return to continue the Seattle shipment comparison.
The [continuity rule](../design-rules/DR-010-context-continuity.md) requires the
working query, stable selected identity and useful focus to survive that journey.
All data is synthetic and inspection is read-only.

## Red before repair

The [frozen prior component](continuity-before.json) records the template and
initializer from [the merged baseline](https://github.com/lanej/viewrule/tree/a07b82afeb1900ef8e8bd7dc7c2a2dce4b9c90c7/docs/examples), with source hashes.
Before repairing it, the [checkpoint](continuity-checkpoint.mjs) established:

- Prior Bad loses the query, substitutes EP 1043 for EP 1042, and moves focus
  away from the invoking Inspect control. That is not an isolated query reset.
- Prior Good retains its input, but still shows Denver under a Seattle query.
  Retaining an inert filter is not evidence of a functioning comparison.

The checkpoint replays those observations before the revised component in each
supported layout. A failure in formatting or missing assets does not count as red.

A second review found the first isolated repair technically correct but too
inferential: its summary only said `2 of 3 shipments` versus `3 of 3 shipments`.
Before changing that presentation, the exact accepted pair at revision
`665ef7b` was frozen in [continuity-clarity-before.json](continuity-clarity-before.json).
The native `continuity-context` contract was then expanded to require an explicit
destination-scope surface. Replaying that frozen pair produces the expected
`continuity-context` finding on both variants because neither names the active
working set. The repaired component clears that finding while Bad still fails only
the behavioral continuity journey.

## Strong baseline, one mutation

The shared [template](behavior.html), [styles](behavior.css), and
[initializer](continuity-scene.js) implement a real filtered shipment queue.
Typing a destination updates actual rows, an explicit **Destination scope** surface, and
a result sentence such as **Showing 2 shipments**. Clearing it truthfully
changes that surface to **All destinations** and **Showing 3 shipments**. The selected record
has a stable ID and a visible Selected label, not just color. Inspect opens native
read-only details; Escape or Return restores the invoking control.

**Only Bad executes `filter.value = ""` on return.** Its additional Denver row and
updated count are truthful consequences of the lost filter, not independent
counterexample defects. Both variants retain EP 1042 and the same focus target,
control styles, scope, sorting and interaction semantics. No image or badge is
used to imply that the field is still filtered.

## Evidence

The [native baseline rules](continuity-rules.json) use Viewrule's real
[inspectPage](../../src/checks.mjs) for visible context, readable type, usable
controls and clipping. The query is checked through the actual input value and
rendered results, not `value` attributes or an expected-pass declaration.

The existing [package test command](../../scripts/test-package.mjs) invokes the
checkpoint and retains the installed-package walkthrough. The walkthrough also
checks the updated integrated rule page. The checkpoint asserts, in both layouts:

| Subject | Required result after Return / Escape |
| --- | --- |
| Prior Bad | Query, selection and focus all changed: rejected baseline. |
| Revised Good | Query Seattle, selected EP 1042, invoking focus retained. |
| Revised Bad | Only query changed; EP 1042 and invoking focus retained. |
| Both current variants | Native baseline checks pass; actual rows match the query. |

The [conformance matrix](conformance-matrix.json) covers every registered rule.
Mechanical cells name checks that must execute. Human review covers selection
meaning, useful space, restraint, action clarity, priority and resilience; declared
`pass` values are expectations, not substitute evidence.

## Captures and limits

Four separate returned-state captures: Good/Bad at 1200 × 1000 CSS pixels, and
Good/Bad at 390 × 844 with 125% component text. The narrow case permits wrapping
and vertical scrolling rather than clipping. This is not browser zoom, dark-theme
certification, or coverage of every destination length or assistive technology.

The generated manifest records source hashes, both rejected baselines,
legacy/current observations, executed native results and capture settings. Review images are published
intentionally and pinned to their commit; normal CI never recommits them.

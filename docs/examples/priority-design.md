# DR-013: emphasize the response task

**Task:** Before dispatch, inspect the three shipments blocked by address problems.
Daily volume is supporting context. Data is synthetic; inspection is read-only.
A planning task may legitimately prioritize volume instead.

## Contract before repair

The [native rules](priority-rules.json) were authored and run against the previous
[order-only revision](https://github.com/lanej/viewrule/tree/71c2992425ff03d7aa112d25bb25648f4f4b6aca/docs/examples)
**before changing the UI**. Native Viewrule found four violations on its Good:
exception type was 18px while volume was 24px, and both surfaces were transparent.
The old layout preserved order but did not implement the newly declared emphasis.

The [frozen prior component](priority-before.json) preserves that rejected input,
its source revision, and source hashes. The [checkpoint](priority-checkpoint.mjs)
replays it before the repaired component in both supported layouts. It calls the
engine's real [inspectPage](../../src/checks.mjs), not a mock checker.

| Subject | Declared type | Declared surface |
| --- | --- | --- |
| Exceptions and response | 24px; 30px with 125% text | Accent blue, light/dark theme tokens |
| Daily shipment total | 16px; 20px with 125% text | Neutral, light/dark theme tokens |

These are **application-specific choices**, not a universal hierarchy score or a
requirement that every primary element be blue or 24px. Native `style` checks read
computed properties on the task's actual subjects. `context`, `min-font-size`,
`min-size`, and `no-clip` protect the shared baseline. A class named primary or an
expected-pass matrix entry cannot satisfy a failed paint/style check.

## One controlled mutation

Both variants use one [template](behavior.html), shared [CSS](behavior.css), and
[initializer](priority-scene.js). **Which subject receives `priority-primary` is
the only variant-specific choice.** That role bundles type, accent surface, and
contrast. DOM order, facts, copy, scope, padding, controls, and disclosure behavior
are identical. Natural section height may change as larger headings wrap.

Good emphasizes the response task; Bad emphasizes routine daily volume. Both
remain readable. Accent means attention, not warning severity, carrier identity,
selection, risk, or successful execution. The same two visual roles are reused;
no oversized number, missing control, or illegible secondary text manufactures
the intended failure. Hue is not the only emphasis channel: type size/weight and
a visible border also distinguish the primary role.

## Executed evidence

The existing `npm test` command invokes the checkpoint. It requires:

- Prior Good and Bad: exactly the four native DR-013 violations, in both layouts.
- Current Good: zero native findings. Current Bad: exactly those four violations,
  all mapped solely to DR-013. Required selector coverage cannot be skipped.
- Equal content, DOM order, action styling and behavior; equal styles **by role**
  instead of requiring the same subject to have the same emphasis in both variants.
- Removing Good's actual accent and headline size while retaining its primary
  class must turn native checks red again. Restoring the rendered styles clears it.
- Opaque text/background contrast of at least 4.5:1 in the captured light theme,
  usable targets, no clipped critical text, and real Tab/Enter/Escape inspection.

The [conformance matrix](conformance-matrix.json) links mechanical cells to checks
that must execute. The target remains human-reviewed: computed style verification
establishes the chosen implementation, not whether this is the best task hierarchy.

## Human review

Review both variants against [Useful Space](../design-rules/DR-007-responsive-detail.md),
[Restraint](../design-rules/DR-008-earned-decoration.md),
[Clear Action](../design-rules/DR-011-action-scope.md),
[Priority](../design-rules/DR-013-task-emphasis.md), and
[Resilience](../design-rules/DR-015-content-resilience.md).
Also review [Consistency](../design-rules/DR-005-consistent-meanings.md): the accent
must express emphasis without silently changing any status or entity meaning.
No checkbox is pre-approved. For the target, checking attests that Good passes
and Bad demonstrates the intended priority failure.

## Capture and scope

Desktop: 1200 × 1000 CSS pixels, normal component text. Narrow: 390 × 844,
125% component text, and longer address guidance. These are finite fixtures, not
browser zoom, every locale, or a full accessibility certification. Dark-theme
style tokens are permitted but not certified by the light-theme captures.

Four real browser captures and `dr-013-evidence.json` are generated in
`dist/behavior-evidence/`; the report includes native actual/expected findings,
source hashes, keyboard evidence and contrast observations. CI retains artifacts
but must not commit regenerated screenshots. Review images are published once
and referenced at an immutable revision.

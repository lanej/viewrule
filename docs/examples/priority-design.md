# DR-013: put the response task first

**Task:** Before dispatch, inspect the three shipments blocked by address problems.
The daily total is context, not the first decision. All data is a synthetic snapshot;
no controls modify real shipments.

The [Rule of Priority](../design-rules/DR-013-task-emphasis.md) asks whether emphasis
serves this task. A planning view may legitimately lead with aggregate volume.
This example does not establish a universal requirement to put exceptions first.

## One controlled mutation

Both variants use one [template](behavior.html), shared
[styles](behavior.css), and the same [initializer](priority-scene.js).
Bad moves the intact daily-total section before the exception section **in the DOM**.
No font, color, size, copy, count, control, spacing token, or disclosure behavior changes.
Assistive reading and visual order therefore agree rather than relying on CSS reversal.

Good reads: exceptions and response, then total. Bad reads: total, then exceptions
and response. Both disclose the same three shipment identities on request and preserve
focus when that disclosure closes. An address correction is not performed or claimed.

## Evidence and boundaries

The [checkpoint](priority-checkpoint.mjs) is invoked by the existing
[package-validation workflow](../../scripts/test-package.mjs). It mounts the actual
component template, shared styles, and initializer offline; the existing installed-package
walkthrough independently exercises the integrated rule page. There is no new engine detector.

It asserts matching content, computed component styles and dimensions, opposite DOM
and rendered section order, unclipped critical text, and actual Tab/Enter/Escape interaction
on both variants. The desktop also keeps both complete sections visible together.

The [conformance matrix](conformance-matrix.json) covers all registered DRs. DR-013's
machine-evidence cells name checks that must actually execute successfully in both layouts;
`pass` declarations alone are not evidence. The position check proves this authored
mutation, not the broader correctness of visual emphasis. Human review remains necessary.

### Human acceptance questions

A checked PR item attests to the stated **expected result**, not that both sides pass
the target rule. Non-target rules must pass on both. For the target, Good must pass
and Bad must demonstrate the intended failure. Do not pre-check review items.

| Rule | Inspect both variants |
| --- | --- |
| [DR-007 — Useful Space](../design-rules/DR-007-responsive-detail.md) | Readable type, bounded form width and usable controls; no stretched filler or shrinking text to satisfy a bound. |
| [DR-008 — Restraint](../design-rules/DR-008-earned-decoration.md) | Neither side uses excessive decoration, giant totals or missing controls to reveal the answer. |
| [DR-011 — Clear Action](../design-rules/DR-011-action-scope.md) | The action names inspection of three exceptions, not correction or dispatch. |
| [DR-013 — Priority](../design-rules/DR-013-task-emphasis.md) | Good leads with the response task. Bad leads with the daily total. That order alone is the intended failing decision. |
| [DR-015 — Resilience](../design-rules/DR-015-content-resilience.md) | Narrow layout, enlarged component text and longer guidance retain meaning, labels and actions. |

## Capture conditions

Desktop is 1200 × 1000 CSS pixels at 100% component text. Mobile is 390 × 844
at 125% component text, with a longer representative address explanation. Both variants
use identical conditions within each pair; the mobile case deliberately combines these
stresses and is not a test of every viewport or browser zoom level.

The checkpoint writes four cropped screenshots and `dr-013-evidence.json` to
`dist/behavior-evidence/`. The JSON records source hashes, measurements, browser version
and capture conditions. CI retains artifacts; **it must not commit generated evidence**.
Reviewed captures are published deliberately and linked to immutable revisions in the PR.

# Canonical example contract

These instructions apply to every example under `docs/examples/`.

## Isolate the rule under test

A canonical good/bad pair is a controlled comparison, not a good design beside a generally bad design.

- Start from one strong, production-plausible implementation of the stated task.
- Hold non-target semantics, content, information architecture, visual hierarchy, spacing, typography, controls, accessibility, and interaction behavior invariant.
- Change only what is necessary to make the bad variant violate the named design rule.
- Do not make the counterexample easier to recognize by adding unrelated defects, removing useful controls, degrading polish, or changing facts that are not part of the target violation.
- When the target rule necessarily changes more than one rendered fact, keep those changes within the same underlying rule violation and document that dependency.
- Machine-observable invariants between the pair should be asserted where practical. Human-review differences must remain explicit rather than being converted into arbitrary scores.
- A good example should be good enough to ship for the scoped task. A bad example should be plausible enough that a competent team could accidentally ship it.

When an existing corpus example violates this contract, fix it when that example is otherwise being materially changed. Do not broaden an unrelated PR solely to migrate the entire corpus.

# Canonical example contract

These instructions apply to every example under `docs/examples/`.

## Build the baseline before the counterexample

Do not begin with an existing bad example and repair it just enough to create a pair.

1. Design the strongest production-plausible implementation of the stated task.
2. Review that baseline against every applicable Viewrule, not only the rule being illustrated.
3. Resolve material non-target defects in the baseline.
4. Clone the approved baseline.
5. Introduce exactly the minimum change needed to violate the target rule.
6. Assert machine-observable invariants between the pair and document any necessary semantic dependency.

The good example is the source of truth; the bad example is a controlled mutation of it.

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

## Pull request evidence

When a pull request materially changes a canonical good/bad example, include separate rendered images of the good and bad variants in the PR description at the state that demonstrates the rule. A combined gallery screenshot may supplement these images but does not replace them. Reviewers must be able to compare the controlled difference without running the fixture.

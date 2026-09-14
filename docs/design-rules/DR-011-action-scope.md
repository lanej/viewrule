# DR-011 — Rule of Clear Action

**Principle:** Controls communicate their action and scope.

**Requirement:** Essential controls must have discoverable interaction cues and
names that communicate what they do. Consequential actions must make their scope
and relevant effect clear before commitment. Important unavailable actions should
have an accessible explanation of what prevents them.

**Why:** Users need perceptible cues to discover possible actions; see Norman's
[signifiers](https://jnd.org/signifiers-not-affordances/). Names must also be
programmatically available where required by [WCAG 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html).
Neither source makes a pointer cursor or a particular button style sufficient proof.

**Application:** Prefer “Publish rates for 12 selected lanes” over an unexplained
“Apply” when scope could be confused. Distinguish static status from actionable
controls. Keep an unavailable action's explanation accessible without depending on
hover over a disabled element.

**Exception:** Familiar compact controls can use icons with accessible names and
appropriate contextual help. Repeating an already unambiguous scope in every button
is not required. Do not replace standard semantics with decorative control imitation.

**Review:** Check accessible names and the observed outcome, then assess whether
the wording and visual cues communicate that outcome to the intended audience.
[Good/bad example](../examples/behavior.html?rule=DR-011).

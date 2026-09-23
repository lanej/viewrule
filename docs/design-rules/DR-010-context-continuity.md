# DR-010 — Rule of Continuity

**Principle:** Interactions preserve the working context.

**Requirement:** Opening detail, returning, refreshing, and adapting the layout
must preserve task-relevant filters, selection identity, entered work, and position
unless the operation explicitly changes them. Selection follows a stable entity,
not its current row index. Returning focus must support the next step in the task.

**Why:** The user should not have to reconstruct a comparison after inspecting it.
This broader continuity requirement is a project interpretation, supported in part
by the [APG dialog focus guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
That pattern is not a universal mandate to return focus to the opener in every workflow.

**Application:** Restore queue filters and the selected shipment on return. Keep
selection attached to that shipment if rows reorder. Explain when the selected item
leaves the result set instead of silently substituting the item now at its old index.

**Executable continuity contracts:** Exercise the same read-only detail journey on
both variants. Capture the real query, selected stable identity, visible result set
and invoking focus before opening and after returning. Verify that the filter
actually changes the rendered results; retaining an inert input is not continuity.
Name preserved context in domain terms when possible: for example, `Destination scope` is more directly judgeable than a generic `Working set` label.
An intentional query reset may reveal additional matching rows, but it must not
also substitute a different selection or lose keyboard focus. Record those as
separate failures instead of treating every difference as the target defect.
See the [controlled queue example](../examples/continuity-design.md).

**Exception:** An explicit reset, completed deletion, or next-step workflow may
change context. Explain the transition and choose a useful surviving focus target.
Do not restore stale state that would misrepresent the current operation.

**Review:** Compare actual identities, input values, focus, and relevant scroll
position before and after a journey. A static selected-state attribute is not proof
of continuity. [Good/bad example](../examples/behavior.html?rule=DR-010).

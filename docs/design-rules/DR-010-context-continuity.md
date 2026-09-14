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

**Exception:** An explicit reset, completed deletion, or next-step workflow may
change context. Explain the transition and choose a useful surviving focus target.
Do not restore stale state that would misrepresent the current operation.

**Review:** Compare actual identities, input values, focus, and relevant scroll
position before and after a journey. A static selected-state attribute is not proof
of continuity. [Good/bad example](../examples/behavior.html?rule=DR-010).

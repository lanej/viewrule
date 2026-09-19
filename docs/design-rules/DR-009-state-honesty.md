# DR-009 — Rule of State Honesty

**Principle:** System status reflects the available evidence.

**Requirement:** Loading, empty, filtered-out, unavailable, stale, pending, and
completed states must remain distinguishable when they call for different user
actions. Do not turn a failed request into an observed zero or a queued operation
into a completed one. If retained data affects a decision, distinguish its as-of
time from the latest refresh attempt.

**Why:** A decision based on a false success or false absence can be wrong even
when the layout is clear. This extends DR-004 from data representation to the
interface's operational state. [Visibility of system status](https://www.nngroup.com/articles/visibility-system-status/)
is practitioner guidance; [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
addresses programmatic identification of qualifying status messages, not backend truth.

**Application:** Keep useful retained data explicitly labeled stale after a failed
refresh; offer retry. Show submitting, queued, and completed according to actual
operation evidence. Announce meaningful status changes without unnecessarily moving
focus or making every update an interrupting alert.

**Snapshot application:** Present the value, its stale qualifier, and its as-of
context as one reading unit. Keep the refresh attempt separate. A pending retry
or another failure must not replace a known snapshot with zero, advance its as-of
time, or imply recovery. Only the returned successful snapshot updates its value
and time. Initial loading has no retained snapshot to display. Keep recovery local
and preserve focus on the invoking control while the request resolves.

**Exception:** Omit distinctions that do not affect this task, but never claim a
stronger state than the available evidence supports. Optimistic UI must expose
pending status or support truthful reconciliation and failure recovery.

**Review:** Exercise delayed, empty, failed, and recovered responses with controlled
fixtures. Visible labels and ARIA metadata do not establish freshness or completion.
[Good/bad example](../examples/behavior.html?rule=DR-009).

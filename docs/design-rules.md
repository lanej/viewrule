# Design rules for evidence and interaction

Help the reader make accurate comparisons and understand the evidence behind a
decision. Use available space to reveal useful information while preserving
legibility and context.

DR-001–DR-008 apply ideas from Edward Tufte's *The Visual Display of Quantitative
Information* and later writing. DR-009–DR-016 add task-scoped interaction and
resilience requirements with their own cited sources. These are our interpretations,
not quotations, endorsements, or universal prescriptions for every interface.

This file defines the intended behavior. [Detection and enforcement](ui-review-enforcement.md)
describes the implemented checks and their limits; listing a rule here does not
mean the tool checks every part of it. See [UI review](ui-review.md) for setup.
The [default opinion](defaults.md) translates selected principles into editable
starter constraints with explicit numbers, scopes, and rejected/passing fixtures.

The [illustrated examples](design-examples.md) pair good and bad versions of common
components, link each difference to its rule, and identify the available detector
or project-specific constraint. An offline interactive gallery accompanies them.

## How to apply the rules

- **Must** defines a requirement when the stated condition applies.
- **Should** defines a default that calls for judgment in the particular screen.
- A **comparison group** is a set of values or charts the reader is expected to
  compare for one task. Its membership and intended comparison must be explicit.
- Scope requirements to the task, page state, comparison group, and viewport.
  There is no universal density percentage, row count, or font size.
- Document an exception with its rule ID, scope, reason, and how it preserves the
  intended comparison. A disclosure cannot make a misleading encoding accurate.

## DR-001 — Comparable charts use comparable scales

**Requirement:** Charts comparing absolute magnitudes of the same measure must
use the same units, axis domains, scale transformations, and plotting dimensions.
Time comparisons must use matching windows or explicitly labeled corresponding
periods. Changes in layout must preserve the interpretation of the scale.

**Why:** Visual differences should reflect differences in data. Independently
rescaling each panel can make very different magnitudes appear equivalent.

**Exception:** Separate scales may support comparison of patterns within each
series. Label those scales clearly and identify the comparison as one of shape
or relative change. Logarithmic and indexed views must identify their transform
and reference value.

## DR-002 — Visual magnitude reflects numerical magnitude

**Requirement:** Ordinary bars representing amounts must start at zero. Filled
area charts representing amounts must preserve a zero baseline. Bubble area
must be proportional to its encoded value. Decorative 3D projections must not
distort a two-dimensional quantitative comparison.

**Why:** The size of the visual mark must represent the quantity faithfully.

**Exception:** Range bars and timelines represent intervals; their endpoints must
represent those intervals accurately. Unfilled line and scatter plots may use
nonzero domains to reveal variation. Actual three-dimensional data may justify
a three-dimensional view. Axis labels must make the chosen mapping clear.

## DR-003 — Quantities carry the context needed to interpret them

**Requirement:** A quantitative claim must identify its measure, units, applicable
period, and population or scope. Rates must identify their denominator;
performance comparisons must identify their baseline. Currency must be
unambiguous. Source information must be accessible, with freshness stated when
it affects the decision.

**Why:** A precise-looking number can still be uninterpretable or incomparable.

**Application:** Put essential context beside the value or in a clearly shared
heading. Do not hide essential units or periods exclusively in hover content.
Shared context can cover a whole table or chart group; repeating it in every
cell adds noise. Detailed source documentation may be expandable.

## DR-004 — Missing and estimated values remain distinguishable

**Requirement:** Missing, unavailable, and suppressed values must remain distinct
from observed zero. Forecasts, estimates, and measured values must be visibly
distinguishable. Disclose interpolation across missing observations and material
omissions or truncation. Show supplied uncertainty when it affects interpretation.

**Why:** A continuous line or an apparently complete table must not imply evidence
that does not exist.

**Application:** A gap or labeled missing value is valid. Connecting observations
across a gap requires an explicit indication that intervening values are missing.
Do not invent an uncertainty interval when the underlying data provides none.

## DR-005 — Visual meanings stay consistent

**Requirement:** Within a comparison workspace, the same entity or status must
retain its color, symbol, and line-style meaning across charts, filters, sorting,
and viewport changes. Different meanings must not silently reuse an established
encoding. Essential distinctions must remain understandable without color alone.

**Why:** Relearning a visual vocabulary consumes attention and invites incorrect
comparisons.

**Exception:** Theme or accessibility changes may alter the palette while
preserving the mapping and an identifiable label or other distinguishing mark.
An explicitly different encoding, such as coloring carriers by risk instead of
identity, must be explained where that encoding is used.

## DR-006 — Related evidence stays visible together

**Requirement:** For each task, identify the critical comparison set. At its
supported analytical desktop sizes, the screen must show that set together in
the declared comparison view. Align related values and use consistent numeric
formatting so the reader can scan them. Keep labels close to their evidence.

**Why:** Comparing alternatives should not depend on remembering a value from
another tab or a previous scroll position.

**Application:** A carrier-selection view might require cost, delivery window,
and reliability for the selected alternatives together. Secondary detail may be
expandable. Align numeric amounts and their headers consistently, with suitable
precision and tabular digits where supported; identifiers need not follow numeric
amount formatting. Small screens may use an explicit selection or comparison mode;
the reduced view must keep the identity and context of each alternative clear.

## DR-007 — Larger screens expose useful detail and preserve legibility

**Requirement:** For the same task and data state, moving to a larger supported
viewport must preserve the critical comparison set. Where additional evidence
helps the task, define which extra rows, columns, time history, or comparison
panels become visible at larger sizes. Preserve readable type and interaction
targets as density changes.

**Why:** Additional screen area is an opportunity to improve comparison and
inspection. Stretching containers alone does not demonstrate that improvement.

**Application:** Judge density by useful, distinct observations and relationships.
Repeated values, larger cards, and decorative marks do not count as additional
evidence. A larger carrier table might expose volume and service breakdowns while
keeping cost and reliability visible. Do not increase density by shrinking text
below the project's readable type scale. Preserve usable controls as density changes.
For prose, use bounded reading widths and natural word spacing; avoid fully justified
paragraphs. The default control-size and prose checks are scoped review warnings.

**Exception:** A finite comparison or focused task may already show all useful
evidence. Retain useful whitespace and bounded reading widths in that case;
do not manufacture content to meet an occupancy target.

**Review:** Assess both the whole layout and detail at its intended reading size
for every target viewport. A reduced overview alone cannot establish legibility
on a large screen. Viewport dimensions refer to CSS pixels; account for browser
zoom and display scaling when choosing representative screen sizes.

## DR-008 — Decoration earns its space and visual weight

**Default:** Remove redundant frames, nested cards, repeated labels, ornamental
icons, and effects that compete with the evidence. Gridlines and separators
should support reading without dominating the data. Headers and controls should
leave room for the task's primary comparisons.

**Why:** Prominent visual elements should communicate relevant information.

**Exception:** Grouping, selection, warnings, and interaction affordances may
need visible boundaries or emphasis. Preserve these functions. Minimal decoration
is not a reason to erase useful labels, context, or controls.

**Review:** Treat excessive decoration as a design concern requiring judgment.
An empty screen is not automatically a successful reduction of non-data ink.

## DR-009 — System status reflects the available evidence

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

**Exception:** Omit distinctions that do not affect this task, but never claim a
stronger state than the available evidence supports. Optimistic UI must expose
pending status or support truthful reconciliation and failure recovery.

**Review:** Exercise delayed, empty, failed, and recovered responses with controlled
fixtures. Visible labels and ARIA metadata do not establish freshness or completion.
[Good/bad example](examples/behavior.html?rule=DR-009).

## DR-010 — Interactions preserve the working context

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
of continuity. [Good/bad example](examples/behavior.html?rule=DR-010).

## DR-011 — Controls communicate their action and scope

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
[Good/bad example](examples/behavior.html?rule=DR-011).

## DR-012 — Safeguards match consequences and preserve work

**Requirement:** Match prevention and recovery to the action's consequences.
Reversible low-risk operations should be easy to undo; consequential submissions
need an appropriate reversal, checking, or review mechanism. On failure, preserve
recoverable input and identify the problem and corrective action.

**Why:** Re-entering valid work does not correct the original error. The applicable
scope and alternatives of [WCAG 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html)
are specific; it does not require confirmation dialogs for every save.
[WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
requires textual identification of automatically detected input errors.

**Application:** Preserve the entered proposal after server rejection, associate
persistent correction guidance with the field, and show affected records before a
bulk publication. Undo must reverse the actual operation, not merely dismiss a toast.

**Exception:** Security-sensitive values or expired authorization may require
re-entry. Explain the reason and retain other safe work. An irreversible action
cannot truthfully offer Undo; show its consequences before commitment instead.

**Review:** Exercise rejection, correction, retry, cancellation, and actual reversal
where supported. A review dialog or Undo label alone does not establish protection.
[Good/bad example](examples/behavior.html?rule=DR-012).

## DR-013 — Visual emphasis follows the task's priority

**Default:** State the intended attention order for the current task, then use
contrast, size, grouping, position, and restraint to support it. The most visually
prominent content should not routinely distract from the decision or action that
matters most in that state.

**Why:** [Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
is practitioner guidance on directing attention. This positive hierarchy rule
complements DR-008; removing decoration does not by itself establish useful emphasis.

**Application:** An exception-review screen can lead with affected shipments and
their required response while keeping summary totals available but subordinate.
The same dataset may need a different hierarchy in a planning or reporting task.

**Exception:** Navigation, orientation, or a safety-critical alert may appropriately
outrank the page's ordinary primary task. There is no universal KPI count, occupancy
score, or rule requiring exactly one primary button on every page.

**Review:** Compare an explicit task and attention order with the rendered result.
Project-specific token checks may detect known deviations; no generic hierarchy
score establishes that the emphasis is appropriate.
[Good/bad example](examples/behavior.html?rule=DR-013).

## DR-014 — Essential interactions do not require a pointer

**Requirement:** Essential information and actions must be available through the
supported input methods, including keyboard operation where applicable. Preserve
predictable focus, a visible focus indication, and a usable route into and out of
interactive disclosures. Do not make essential information hover-only.

**Why:** [WCAG 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
addresses keyboard operation, including its path-dependent-input exception.
[WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
sets applicable dismissibility, hoverability, and persistence requirements;
[WCAG 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
addresses focused controls being entirely obscured by authored content.

**Application:** Provide deliberate keyboard chart inspection or an equivalent
accessible data view. Use native buttons for disclosures. Make opening, activation,
dismissal, and the next focus destination work without a mouse.

**Exception:** A genuinely path-dependent interaction may fall within the standard's
exception; do not use that to exclude unrelated controls or essential data. A touch
interface may expose information differently while preserving access to the task.

**Review:** Perform a real keyboard sequence; programmatically focusing a control
does not demonstrate that Tab can reach it. Static axe results do not establish
complete keyboard, touch, screen-reader, or focus-visibility behavior.
[Good/bad example](examples/behavior.html?rule=DR-014).

## DR-015 — Layout survives content variation and text adaptation

**Requirement:** Validate task-critical content with representative long labels,
distinguishing suffixes, numeric extremes, and relevant empty or populated states.
Supported text enlargement and spacing changes must not remove essential content
or make controls unusable. Preserve meaning rather than merely fitting boxes.

**Why:** [WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
and [WCAG 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
address text adaptation. Our content-variation fixtures extend that reasoning to
application-specific data; they are not additional universal WCAG thresholds.

**Application:** Keep the distinguishing end of a service name available through
wrapping, sizing, or an explicit accessible inspection mechanism. Allow longer error
messages without displacing Save outside an unscrollable fixed-height panel.

**Exception:** Truncation can be appropriate when it does not remove the information
needed for the current task and full text is deliberately accessible. Large tables
may use clearly scoped scrolling. Not every cell must expand indefinitely.

**Review:** Reuse existing clipping, overlap, and legibility checks with difficult
fixture content, then inspect the meaning retained. Root-font scaling is not browser
zoom, and one passing fixture does not certify every locale or text preference.
[Good/bad example](examples/behavior.html?rule=DR-015).

## DR-016 — Color scales match the structure of the data

**Requirement:** Choose color encodings according to what they represent:
unordered categories, ordered magnitude, or deviation around a meaningful reference.
Identify the mapping and preserve essential distinctions without color alone.

**Why:** [ColorBrewer's scheme guidance](https://colorbrewer2.org/learnmore/schemes_full.html)
distinguishes qualitative, sequential, and diverging encodings. This rule asks
whether the mapping is appropriate; DR-005 asks whether an established meaning
remains consistent. Those are separate questions.

**Application:** Use qualitative colors for carrier identity, a sequential treatment
for increasing dwell, and a diverging treatment for deviations around an actual
service target. Provide readable labels and a legend or equivalent explanation.

**Exception:** An explicitly ordered category set or a meaningful threshold may
justify a different treatment. Explain it. A diverging midpoint must not imply an
analytical reference merely because it is the mathematical midpoint of a palette.

**Review:** Inspect the variable's semantics and the actual renderer mapping.
Matching color attributes cannot establish either. A grayscale or accessible data
view can be a valid alternative when color adds no necessary distinction.
[Good/bad example](examples/behavior.html?rule=DR-016).

## Refining the rules

Use feedback on concrete screens to refine a rule or add a scoped example.
Record what decision became easier or harder and at which viewport. Preserve the
rule IDs so future detection and enforcement can refer to the same requirements.
Appearance approval alone does not establish numerical or graphical accuracy.

## Sources

The [research notes](design-principles.md) explain the scope and limits of additional
W3C and U.S. Web Design System guidance; these additions are not attributed to Tufte.


- Edward Tufte, [The Visual Display of Quantitative Information](https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/): graphical integrity, data-ink, high-resolution displays, and small multiples.
- Edward Tufte, [Baseline for amount scale](https://www.edwardtufte.com/notebook/baseline-for-amount-scale/): why time-series axes need not always include zero.
- Edward Tufte, [Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/): later discussion of context, simultaneous comparison, resolution, and unnecessary frames.
- Edward Tufte, [Making better inferences from statistical graphics](https://www.edwardtufte.com/notebook/making-better-inferences-from-statistical-graphics-edward-tufte/): later guidance on documenting sources and analytical choices.
- Carl Bergstrom and Jevin West, [The principle of proportional ink](https://www.callingbull.org/tools/tools_proportional_ink.html): an operational interpretation of proportional graphical representation.

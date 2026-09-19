# Failed refresh: design contract and regression evidence

## Decision before implementation

The reader must distinguish **a failed observation from an observed zero**, then
identify the truthful recovery action. At 09:00 both views received 12 shipments;
the 09:05 refresh failed. The known value, its stale status, its as-of time, the
failed attempt, and Retry are the critical reading set. Both alternatives use the
same type scale and surface treatment. Only the interpretation of the fixture
should distinguish them.

Apply these existing rules before choosing the layout:

| Guidance | Design consequence | Evidence and limit |
| --- | --- | --- |
| [DR-013 Priority](../design-rules/DR-013-task-emphasis.md) | Lead with the specific distinction and shared facts, not gallery framing. | Heading and framing checks support, but do not prove, the intended attention order. |
| [DR-006 Proximity](../design-rules/DR-006-related-evidence.md) and [DR-009 State Honesty](../design-rules/DR-009-state-honesty.md) | Keep value, qualifier, and data age together; keep the refresh attempt distinct. | Native geometry and context checks; controlled response assertions establish fixture behavior. |
| [P-002 Progressive disclosure](../../plugins/claude-code/guide/v1/progressive-disclosure.md) | Defer methodology and sources, not the facts needed to interpret the number. | Closed notes are checked only in the initial state; expansion must remain available by keyboard. |
| [DR-007 Useful Space](../design-rules/DR-007-responsive-detail.md) and [DR-008 Decoration](../design-rules/DR-008-earned-decoration.md) | Remove blank explanation slots and panel allowances; align peers through shared rows. | Height, alignment, type, and target checks must pass together. |

The canonical policy now makes these applications explicit. No new universal
"compactness" rule or default preset has been introduced. These requirements do
not prescribe this headline, badge style, grid implementation, or color.

## Executable boundaries

[behavior-rules.json](behavior-rules.json) extends the existing installed-package
regression. Its added rules apply only to the `failed-refresh` page at the declared
`desktop` viewport: **1200 × 1000 CSS pixels, initial failed state, normal text**.
They do not apply to enlarged text, the other seven examples, or the whole
canonical policy page. They use existing detectors; no engine capability is claimed.

The chosen desktop contract is a 28px-or-larger lesson, gallery framing at most
64px high, a state qualifier beside the count within 16px, and snapshot age within
12px below the qualified value. A sample may use up to 256px of height; its peer
starts on the same row within 1px. Evidence text remains at least 14px and Retry
retains a 44 × 44px target. The initial notes disclosure occupies at most 56px.
These are authored fixture boundaries, not research-derived universal constants.
The CSS does not fix the sample height to the ceiling or fill the remaining viewport.

Required context is still checked in both cards. The intentionally misleading
card must continue to fail for its missing `.as-of` and `.refresh-at` context.
The existing installed-package regression expects precisely those two findings;
a new violation in the truthful card or page composition fails that regression.

Applying the same new boundaries to the original and revised source produced:

| Measurement | Original | Revised requirement |
| --- | --- | --- |
| Lesson type | 18px | At least 28px |
| Gallery framing | 153px | At most 64px |
| State relationship | Below the value | Beside the value, within 16px |
| Snapshot-age gap | 48px | At most 12px |
| Each sample height | 320px | At most 256px |
| Retry target height | 42px | At least 44px |
| Initially expanded notes | About 450px | At most 56px when closed |

The original produced **eight additional findings from seven rules**. The revised
initial state produced none from the nine added rules; the two intentional bad-card
context findings remained. Alignment and readable type already passed in the old
layout and remain guards against regressions. This is a comparison against known
counterexamples, not proof that an unconstrained agent would independently design
the same interface.

## Controlled recovery

Snapshot and request state are separate. Retry normally returns the synthetic
response immediately, preserving the existing interaction regression. Select
**Pause retry response** to hold it pending, then choose **Return failure** or
**Return 18 shipments**. This is fixture instrumentation, not a real service.

Use [behavior-checkpoint.mjs](behavior-checkpoint.mjs) as an application-owned
Playwright checkpoint to exercise retained data during pending and repeated
failure, returned-value recovery, reset invalidation, initial loading, local focus,
and keyboard disclosure. It restores the initial failed state for capture. It can
be added as a `checkpoints` entry with `setup` set to
`docs/examples/behavior-checkpoint.mjs` in a project whose root contains these files.
The shipped baseline config remains unchanged so its installed-package test does
not rely on a source-checkout-only setup path.

## Human review and provenance

Hide the explanatory paragraphs and confirm that the truthful component itself
communicates "12, but stale," its age, and recovery. Inspect the reading order,
readability, and equally polished alternatives. Native geometry does not establish
comprehension, truthful backend data, correct wording, or approval of the page.

The local before/after and interaction review used Chromium 144.0.7559.96 through
Python Playwright, 1200 × 1000 CSS pixels, device scale 1, light mode. Browser
navigation was unavailable in that environment, so the exact local HTML/CSS/JS and
bundled catalog were injected offline. Only the module URL base, catalog transport,
and history navigation were substituted; fixture behavior was not changed. The
native `inspectPage` implementation came from the tested package at commit
`711a454ed36f452731631da5e79bb62a336f4cad`. This is not a claim that the pinned CLI,
site build, or full repository suite ran locally. CI is the authoritative check
for the complete installed-package workflow.

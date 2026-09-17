# Facility comparison workspace

Illustrative DESIGN.md for a fictional application. The requirements below are
assumed inputs to the example, not user approvals or universal dashboard rules.
Paths name that application's canonical sources and are illustrative.

## Purpose and task

Operations analysts compare candidate facilities and investigate geographic clusters
before deciding which facility needs attention. They must see location, operating
state, reporting period, and the evidence behind a recommendation together.
Product scope is maintained in `PRODUCT.md`; incident handling is outside this view.

## Principles and tradeoffs

Decision evidence takes priority over decorative summary cards. Preserve comparison
identities when the viewport grows; do not stretch a finite table merely to fill it.
A larger map is intentional when it is needed to distinguish facilities. Readable
labels take priority over achieving a target occupancy ratio. Mobile may sequence
content, but may not silently omit a required comparison or its reporting period.

## Visual system and ownership

`src/ui/tokens.css` owns spacing, color, and type values. `src/ui/components/` owns
the shared table, selection, and status components. `STYLE.md` explains visual
conventions. This document references those sources instead of copying their values.
Observed: two existing screens use incompatible status labels. That inconsistency
is a finding to resolve, not an established design convention.

## Behavior and resilience

Keep filters and the last usable result visible during refresh; mark it as stale.
An empty filtered result explains the active constraints and offers a clear reset.
A failed refresh shows the failure and retry without pretending stale data is current.
Selection is visible in both map and table. Keyboard navigation and focus follow
shared component behavior; errors must not discard the analyst's current selection.
Test long facility names, missing metrics, and partial data separately from the
nominal screenshot. Loading must not reorder rows without explaining the new order.

## Requirements and verification

### COMPARISON-001

Basis: [DR-006 — Rule of Proximity](https://lanej.io/viewrule/rules/dr-006/)
([Markdown](https://lanej.io/viewrule/rules/dr-006/index.md)). This application adopts
the simultaneous-comparison principle, not a universal minimum number of rows.
An implementing rule cites `designRules: ["DR-006"]` and
`sources: ["DESIGN.md#comparison-001"]` together.

Mandatory for the desktop comparison view: show the six candidate facilities from
the selected comparison set with identity, state, and reporting period available.
Rationale: excluding a candidate can change the analyst's decision.
Viewrule checks the declared comparison identities and readable labels with the
representative fixture; application tests verify filter and data-binding behavior.
Six is the example task's set size, not a reusable minimum-density recommendation.

### MAP-001

Mandatory where the map is shown: preserve enough space and marker distinction to
inspect individual facilities and geographic clusters. The map is analytical, not
decorative. Do not shrink it just to raise a surrounding viewport-occupancy score.
Viewrule checks declared marker styling and clipping. Human review assesses
geographic distinguishability with representative data; map area alone is not proof.

### RECOVERY-001

Proposed mandatory requirement, not yet accepted: during refresh failure, retain
the selected facility and last result, mark that result as stale, and expose retry
without moving focus unexpectedly.
Application tests verify state preservation and keyboard recovery. A static rendered
check cannot certify this sequence. Until those tests run, this remains unassessed.

## Evidence and unresolved decisions

Established for this example: the brief requires comparing six candidates and
investigating spatial clusters. Proposed: retain stale results instead of clearing
the workspace during refresh. Acceptance of that proposal is still needed.

Open question: how should overlapping facilities be separated at city resolution?
Human review must resolve this with representative examples before the map's
geographic-distinguishability requirement can be called verified.

No screenshot approval or exception has been recorded. A passing configured check
would not resolve the proposal, open question, or unassessed behavioral requirements.

# Falsifiable composition contracts

DR-017–DR-020 add alignment, rhythm, spatial economy, and balance to the design
policy. They are task-scoped conventions, not universal laws of visual quality.
An executable contract states its members, scope, units, expected relationship,
rejected example, accepted example, and limits before the interface is repaired.

| Policy | Executable evidence | Remains judgment |
| --- | --- | --- |
| DR-017 Alignment | `align` edge spread; `required-elements` membership | Intentional anchor and optical/baseline alignment |
| DR-018 Rhythm | Repeated `relative-position` gap intervals and shared bands | Semantic grouping; no inferred rhythm score |
| DR-019 Spatial Economy | Optional `comparison-set.growthYield` below | Task relevance, finite inventory, non-countable task benefits |
| DR-020 Balance | Scoped `style`, alignment, and size contracts | Priority and overall visual weight; symmetry is not required |

## Viewport-growth yield

Opt in on an existing `comparison-set` rule. Existing rules and presets are
unchanged; installing this policy does not impose a new global failure threshold.

```json
{
  "id": "offer-growth",
  "type": "comparison-set",
  "selector": "#offers [data-offer]",
  "keyAttribute": "data-offer",
  "requiredKeys": ["a", "b", "c", "d"],
  "minVisibleByViewport": { "desktop": 4, "wide": 4 },
  "preserveFrom": "desktop",
  "minFontSize": 16,
  "growthYield": {
    "min": 1,
    "availableKeys": ["a", "b", "c", "d", "e", "f", "g", "h"]
  },
  "viewports": ["desktop", "wide"],
  "severity": "error",
  "reason": "Use doubled viewport area for additional distinct offers until the finite comparison set is visible."
}
```

`min` is a nonnegative dimensionless lower-bound contract. `availableKeys` is the
nonempty unique, trimmed, finite identity inventory, fixed before the comparison.
Required identities and all viewport minimum counts must fit that inventory.
Choose identity granularity deliberately: a carrier row and a carrier × service
cell are different units. Metadata does not establish semantic relevance.

Given E0 > 0, A0 > 0 and A1 > A0:

```text
areaGrowth = A1 / A0 - 1
evidenceGrowth = E1 / E0 - 1
yield = evidenceGrowth / areaGrowth
requiredCount = min(availableKeys.length, ceil(E0 * (1 + min * areaGrowth)))
```

A uses the measured full CSS viewport width × height, not device pixels or the
area of a stretchable container. E counts distinct complete identities in the
initial viewport. Duplication cannot earn additional evidence. The comparison
collector excludes off-viewport and ancestor-clipped boxes and reports small
text. Growth-enabled comparisons additionally require visible nonempty text.
Pair the rule with context, clipping, and control-size contracts: the collector
does not certify arbitrary painted occlusion, text truncation, chart truth, or
interaction quality. Never reduce type to earn yield.

Only same-page, same-checkpoint captures are compared, against `preserveFrom`.
Both target dimensions must be at least the reference dimensions and measured
area must grow. Use deterministic fixture data, the same text scale and initial
scroll state, and explicitly scoped viewports. Configuration requires a captured
reference and at least one larger target per applicable page. Narrow/mobile
layouts and comparisons where one dimension shrinks need separate contracts,
not extrapolation. An aspect-ratio change is allowed when neither dimension shrinks.

A reference with no comparisons, missing capture/metrics, undeclared visible
identities, or any failed comparison prerequisite produces an unassessed yield
finding at the configured severity. Such evidence cannot satisfy DR-019 coverage.

### Finite evidence is not an occupancy target

For 1000×800 → 2000×800, A grows 100%. With E0 = 4 and minimum yield = 1:

| Outcome | Measured yield | Required count | Result |
| --- | --- | --- | --- |
| Four of twelve become eight | 1 | 8 | Pass |
| Four merely stretch | 0 | 8 | Fail |
| Eight boxes repeat the original four identities | 0 | 8 | Fail |
| All four of a finite four remain visible | 0 | 4 | Saturated; pass |

Saturation reports the actual yield; it caps the required count rather than
inventing information or demanding filler. The finite inventory is a versioned
application contract, not a number inferred from the current DOM.

### Reports and verification

JSON reports expose `pages[].viewportGrowth`: reference/target counts, measured
areas, available count, relative growth, measured yield, required count, minimum,
and status (`reference`, `measured`, `saturated`, or `unassessed`). Findings include
observed and expected values and cite DR-019. These partial measurements do not
certify the whole design rule or a human approval.

The [fixture](examples/composition.html), [rules](examples/composition-rules.json),
and [checkpoint](examples/composition-checkpoint.mjs) hold task/data constant and
exercise accepted and rejected rendered layouts through the native detector.
`npm test` executes this checkpoint before the installed-CLI regression. Run it
alone with `node docs/examples/composition-checkpoint.mjs`.

The checkpoint rejects a displaced heading, an excessive relationship gap, an
oversized peer heading, stretched comparisons, and duplicate-key inflation. It
also checks finite saturation, missing reference evidence, and type-size failure.
No fixture is a human-approved visual reference. Browser geometry does not replace
native-scale visual review or establish that the declared task is valuable.

Existing canonical examples retain their recorded DR-001–DR-016 assessments.
Their conformance matrix explicitly marks DR-017–DR-020 as `unassessed`, with a
rationale for each. This is neither a pass nor a claim that the new rules are
inapplicable. The regression still requires an entry for every registered rule,
and the composition checkpoint supplies separate evidence for the new contracts.

# Component relationships and visual continuity

A correct parent grid declaration does not establish that its children occupy
the intended positions. One visible icon somewhere in a list does not establish
that every item has its icon. Matching entity labels on two pages do not establish
that they draw the same symbol. These rules measure those specific gaps.

Use project selectors and thresholds. An icon above a title, a portrait on the
right, or spacious editorial treatment can be appropriate. No icon size, portrait
position, spacing value, column count, or first-viewport quota becomes a default.

## Require visuals in each component

```json
{
  "id": "item-parts",
  "type": "required-elements",
  "selector": ".entry",
  "required": [".heading > svg", ".heading > h2", ".description"],
  "severity": "error",
  "designRules": ["DR-006", "DR-008"],
  "reason": "Every discovery item retains its subject mark, title, and description."
}
```

Within **each visible component**, every required descendant selector must match
at least one element, and every match must have nonzero bounds and pass the
browser's visibility/opacity checks. One visible match cannot conceal another
hidden match. Scope selectors to required elements; responsive alternatives
should use separate page/viewport rules. A missing required outer scope fails;
as with other rules, hidden outer components are excluded when others remain.

SVGs and images do not need text content. This differs from `context`, whose
existing requirement for visible, nonempty text remains unchanged. Use `context`
as well when an empty label would be a failure. The measurement does not prove
successful image decoding, painted SVG content, recognizable subject matter,
unobstructed visibility, or freedom from ancestor clipping.

## Measure positions and gaps within each component

```json
{
  "id": "subject-beside-title",
  "type": "relative-position",
  "selector": ".heading",
  "from": "svg",
  "to": "h2",
  "relation": "left-of",
  "minGap": 8,
  "maxGap": 16,
  "tolerance": 1,
  "severity": "error",
  "reason": "Keep the subject mark beside its title without a separate icon row."
}
```

`from` and `to` each select **exactly one visible descendant per component**.
Missing, hidden, ambiguous, identical, and ancestor/descendant pairs fail.
The rule measures axis-aligned border boxes in CSS pixels:

- `left-of`: `to.left - from.right`, with strictly overlapping vertical bands.
- `above`: `to.top - from.bottom`, with strictly overlapping horizontal bands.

The gap must lie between the nonnegative `minGap` and `maxGap`, allowing
`tolerance` (0–4 CSS px) at either boundary. Reversed pairs and diagonal placement
cannot pass as proximity. Tolerance can admit a small rounding overlap; use
`no-overlap` where even that overlap matters. These are physical directions;
choose the pair order appropriate to the writing direction.

This allows grid and flex implementations and naturally wrapping titles. It does
not inspect DOM reading order, inline text-flow continuity, ink-to-ink distance,
transforms beyond their bounding boxes, or semantic relevance. Use `vertical-order`
for DOM order and `max-text-gap` for horizontal text bounds. An `above` rule from
`.heading` to `.description`, scoped to `.entry`, can bound excess vertical
separation without fixing item height or inspecting CSS margins.

Pair compact spacing with `min-font-size` for readable descriptions and
`reading-column` for full-width copy inside its item. Enlarged-text states need
their own readable text threshold; do not preserve a count by shrinking text.
Meaningful whitespace around long-form reading still has no occupancy target.

## Carry a subject mark from a list into its detail page

```json
{
  "id": "subject-continuity",
  "type": "consistent",
  "selector": "svg[data-entity]",
  "keyAttribute": "data-entity",
  "properties": ["stroke", "color"],
  "attributes": ["viewBox"],
  "compareSVG": true,
  "acrossPages": true,
  "pages": ["catalog", "detail"],
  "viewports": ["desktop"],
  "severity": "error",
  "designRules": ["DR-005"],
  "reason": "The same entity retains its subject symbol from discovery to reading."
}
```

Both new options are opt-in. Without `acrossPages`, existing `consistent` rules
continue comparing within each page and across its viewports. With it, shared
identities are compared across all active pages and viewports. Scope themes,
data states, and intentionally different encodings separately. Findings identify
the reference page and viewport. Only observed matching identities are compared;
the rule does not require every list entity to appear on every detail page.
Use readiness and per-component presence rules to require expected content.

`compareSVG` requires a visible inline `svg` with content. It compares actual
child element structure, attribute values, and nonblank text, ignoring comments,
formatting-only whitespace, attribute order, and `title`/`desc`/`metadata` content.
This can be the sole comparison when `properties` and `attributes` are empty.
Select root SVG attributes such as `viewBox` and relevant computed styles explicitly.

SVG comparison is structural, not pixel or semantic equivalence. Different path
spellings, IDs, or equivalent implementations may differ. Identical markup can
paint differently because of inherited/descendant CSS, external `use` references,
images, fonts, filters, or occlusion. It does not resolve those resources or inspect
canvas or external-image contents. Stable entity keys must come from the actual
entity; a self-reported symbol name alone is not evidence of matching artwork.

## Rejected and passing examples

The repository's `test/templates/components.html` fixture participates in the
existing packed/installed CLI workflow. Grid and flex versions satisfy one
contract, including natural wrapping at 200% root text. The rejected version
stacks one icon while leaving its parent's grid-area declaration intact, hides
another item's icon, adds a large description gap, indents the description, and
shrinks its type. Assertions require the specific failed rules and measurements.

A detail page keeps its entity key and `viewBox` but changes its path. The
cross-page SVG rule rejects it, while an otherwise identical page-local rule
retains its previous behavior. Accepted list/detail pages share the same mark.
Passing this fixture establishes configured outcomes, not design approval.

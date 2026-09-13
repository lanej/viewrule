# Reading layouts

Reading pages need useful whitespace around a bounded column. A dashboard's row
count or viewport occupancy target is not a reading requirement. These rules
migrate the geometry contract from lanej.io into the shared engine; the website
retains its selectors and thresholds. They cite DR-006 (relationships) and DR-007
(density with readable detail), without making 640px a universal default.

## Centered measure

```json
{
  "id": "essay-measure",
  "type": "reading-column",
  "selector": ".chapter, .chapter-heading, .prose, .prose > p, .visuals, .notes",
  "container": "article",
  "maxWidth": 640,
  "tolerance": 2,
  "severity": "error",
  "reason": "Fill the centered reading column, with whitespace outside it."
}
```

Each selected visible element needs a visible matching **ancestor**, excluding
itself. Its border-box width must equal the smaller of that ancestor's border-box
width and `maxWidth`; its horizontal center must match the ancestor's center.
Both comparisons use `tolerance` CSS pixels, from 0 through 4. The check rejects
overwide, unnecessarily narrow, and displaced columns, including at large viewports.
Put responsive gutters outside the measured container. It does not infer padding
intent, character count, readable fonts, clipping by ancestors, or semantic order.

The combined selector checks elements that exist, rather than requiring every
selector alternative. Use `context` or required order groups to require structure.
Missing the entire required selector or a containing ancestor fails explicitly.

## Reading order

```json
{
  "id": "chapter-order",
  "type": "vertical-order",
  "selector": ".chapter",
  "groups": [
    {"selector": ".chapter-heading", "optional": false},
    {"selector": ".prose", "optional": false},
    {"selector": ".visuals", "optional": true}
  ],
  "tolerance": 2,
  "severity": "error",
  "reason": "Headings precede prose; supporting visuals follow it."
}
```

For each visible scope, groups are evaluated in the declared order. Within each
group, all visible matches retain DOM order. Each preceding box must end at or
above the next box's top, allowing the configured rounding tolerance. DOM order
must also agree: visually rearranging an incorrect document does not pass.
Repeated elements, ancestor/descendant pairs, and overlapping selector groups fail.
Choose peer groups, not wrappers mixed with their children.

A missing required group or any hidden match within a required group fails. This
prevents one visible paragraph from concealing the loss of another. Scope required
selectors to content that must remain visible; put responsive alternatives in an
optional group. Optional groups may be absent or hidden, but a
scope with no visible order evidence fails. A single group such as `:scope > p`
checks sequential paragraphs. Required text alignment and a single prose column
use existing `style` rules (`text-align`, `column-count`); they are separate from
the geometry. No rule evaluates the quality of an argument or whether a figure
actually supports it.

## Print and enlarged text

Page configuration may declare `media` (`screen` or `print`), `textScale` (1 through
4), and `viewports` (nonempty names from the project's viewport list):

```json
{
  "name": "essay-enlarged",
  "path": "/writing/example/",
  "ready": "article",
  "textScale": 2,
  "viewports": ["desktop"]
}
```

Use a separate page entry with `media: "print"` for print styles. Omitted viewport
scope uses every configured viewport. These settings are captured in the report's
contract and affect all checks for that page. `textScale` sets the root font size
to the requested percentage of the browser default; it tests rem-based text reflow,
not browser zoom or operating-system scaling. Print emulation checks continuous
browser layout, not paginated PDF output. Scope controls hidden in print to screen
page entries instead of making required controls optional everywhere.

## Migrated regression

The existing installed-CLI workflow exercises a readable template at phone,
desktop, and 4K widths, plus print and 200% root text. Deliberate alternatives
expose stretched/narrow/offset columns, reversed visual or DOM order, missing prose,
reversed paragraphs, extra prose columns, right alignment, and print-only drift.
It also distinguishes a contract-only width change from a matching contract/CSS
change. Application projects run these shared measurements on their actual pages;
they do not copy the detector implementation or maintain an additional layout suite.

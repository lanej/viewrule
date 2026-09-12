# Default design opinion

Viewrule starts with the seven preferences originally used in `lanej/dotfiles`:
lead with the decision, preserve comparisons, supply quantitative context, align
related evidence, keep decoration subordinate, preserve readable density, and
review graphical integrity. The shipped text lives in `presets/preferences.json`.
`viewrule guidance` always includes it under `defaults`; personal `preferences`
and recorded feedback remain separate. Reports display both. Explicit user intent
and project design systems take precedence over this starting guidance.

## Executable presets

```sh
viewrule init --url http://localhost:3000
# Or, for a comparison table / analytical workspace:
viewrule init --url http://localhost:3000 --preset analytical
```

New projects receive editable rules, not an empty array. `baseline` is the default;
`analytical` includes baseline plus a declared comparison contract. Initialization
preserves existing configuration and rule files. Upgrades do not replace project rules.
For an existing application, `viewrule preset --name analytical` prints the rules
for selective adoption; it does not write them. Merge intended rules by ID and adapt
their selectors, pages, viewport names, and thresholds before relying on them.

| Preset | Starting constraint | Severity / rule |
| --- | --- | --- |
| Baseline | Visible text beneath `main` is at least 14 CSS px | Error; `baseline-readable-text` / DR-007 |
| Baseline | Review own-element clipping of semantic text and declared labels | Warning; `baseline-content-clipping` / DR-006, DR-007 |
| Baseline | Review page headers over 160 CSS px tall | Warning; `baseline-header-height` / DR-008 |
| Analytical | Eight distinct alternatives at desktop/wide, twelve at large/4K; preserve desktop identities and 14px text | Error; `analytical-comparisons` / DR-006, DR-007 |
| Analytical | Visible nonempty shared comparison context | Error; `analytical-context` / DR-003 |
| Analytical | Essential comparison labels are not clipped by their own element | Error; `analytical-labels` / DR-006, DR-007 |
| Analytical | At most 160 CSS px between adjacent text bounds within declared comparison rows | Error; `analytical-value-distance` / DR-006, DR-007 |
| Analytical | Declared metric peers align within 2 CSS px and do not overlap | Error; `analytical-metric-alignment`, `analytical-metric-overlap` / DR-006 |

These numbers are Viewrule's starting opinion, not Tufte quotations or universal
accessibility thresholds. A four-alternative task should explicitly require four,
not invent eight more. A focused screen can retain ample whitespace. The presets
deliberately impose no viewport occupancy minimum or universal density score.
Page overflow, enabled axe checks, and capture-integrity checks still run as before.

## Declare the comparison

The analytical preset uses explicit annotations so it does not guess which tables
or cards belong together. One comparison group and one metric peer group per scoped
rule is the starting contract. For multiple independent groups, duplicate the rules
with distinct IDs and selectors. The essential annotations are:

```html
<table data-viewrule="comparison">
  <caption data-viewrule="context">
    Ground services · USD per parcel · On-time share of delivered parcels · Last 30 days
  </caption>
  <tbody>
    <tr data-viewrule-key="carrier-a-ground">
      <td data-viewrule="cell"><span data-viewrule="label">Carrier A ground</span></td>
      <td data-viewrule="cell">5.42</td>
      <td data-viewrule="cell">98.2%</td>
    </tr>
  </tbody>
</table>
```

This excerpt illustrates markup; a single row does not satisfy the starter counts.
Map annotations to the application's real identities and data. Put optional
`data-viewrule="metric"` on peers that should align. Alternatively, replace the
selectors with stable application selectors; the attributes are a convention,
not required framework integration. Missing required comparison, row, label, or
context selectors fail. Optional metric groups may be absent without establishing
coverage of their checks.

`requiredKeys: []` means the starter has not designated particular critical identities.
It still requires the configured counts and preserves the desktop set. Populate it
when specific alternatives must always appear. The count, alignment, and text-gap
checks target desktop/wide/large/4K by default. Mobile retains baseline, label, context,
and overlap checks; define its comparison mode explicitly when needed. Renaming or
removing a configured viewport requires adapting the copied rules too.

## Measurement limits and evidence

`min-font-size` measures computed CSS size on visible DOM text parents beneath its
selector. It does not establish apparent size after transforms, readability at a
particular viewing distance, canvas text, form-control values, or all occlusion.
An empty text scope fails rather than claiming a legibility check ran.

`max-text-gap` measures whitespace-trimmed DOM text-range bounds within each row's
declared `items`, orders them horizontally, and checks each adjacent edge-to-edge gap.
Every selected row needs at least two text items sharing a horizontal reading band.
Use it for row comparisons; stacked or unrelated content needs a different scope.
It measures geometry, not semantic relatedness. Wrapping, transforms, ancestor
clipping, occlusion, canvas, and image-only marks still need visual inspection.
Context presence cannot verify the accuracy of units, periods, or underlying data.

The [fixture corpus](https://github.com/lanej/viewrule/blob/main/test/README.md)
specifies rejected and accepted layouts. The single installed workflow asserts
specific findings and DR citations, a clean compact layout, failure from empty
stretching alone, and a clean finite comparison with surrounding whitespace.
It also checks missing annotations, actual feedback provenance, and freshness.
This is evidence for those contracts; it is not a claim that the full Tufte policy
or an agent's design judgment has been automated.

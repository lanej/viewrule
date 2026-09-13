# Good and bad examples

Each pair keeps the content and task constant and changes one design property.
“Good” means that property satisfies the stated expectation; it does not approve
the entire interface or establish that every Viewrule check passes.

Open [the interactive gallery](examples/index.html) from a local checkout in your
browser. It needs no server, build, installation, or network connection. GitHub's
file browser shows the HTML source; the screenshots below are viewable on GitHub.
The gallery follows your operating system's light/dark preference. Resize the browser
to inspect the actual layout. Drawers, tabs, and navigation stay synchronized across
both sides. The example selector and URL fragment link to individual pairs.

The labels report local geometry and simple solid-color contrast calculations.
They are teaching aids, not Viewrule findings: the gallery does not run the engine
or axe. Use [the detection manual](ui-review.md) for real application assessment.

| Example | Design rule | Detection available in Viewrule |
| --- | --- | --- |
| [Expandable list](#expandable-list) | DR-008: framing earns its space | `max-height`, with a project-specific selector and limit |
| [Text with a diagram](#text-with-a-diagram) | DR-007: preserve legibility | Built-in `axe:color-contrast` when accessibility is enabled |
| [Tab bar](#tab-bar) | DR-006: keep identifying labels readable | `no-clip` scoped to the tab buttons |
| [Hamburger menu](#hamburger-menu) | DR-007: preserve usable controls | Baseline `min-size` warning below 24×24 CSS px |
| [Numeric alignment](#numeric-alignment) | DR-006: align related values | Analytical `style` rule for declared numeric amounts |
| [Comparison spacing](#comparison-spacing) | DR-007: extra width preserves useful detail | Analytical `max-text-gap` rule for declared comparison rows |

## Expandable list

[Interactive example](examples/index.html#drawers) ·
[DR-008](design-rules.md#dr-008--decoration-earns-its-space-and-visual-weight)

![Three shipment drawers with 56px headers beside the same drawers with 100px headers.](examples/images/drawers.png)

The 100px headers spend substantially more vertical space showing the same parcel,
route, and status. The 56px headers preserve those labels and the expansion affordance.
Open a drawer on either side to reveal the same secondary shipment details.

The **56px limit is an example project constraint**, not a shipped default or a
universal Tufte rule. `max-height` can enforce it on a declared group of headers.
Calibrate the limit to required content, readable type, and the interaction target.

## Text with a diagram

[Interactive example](examples/index.html#diagram) ·
[DR-007](design-rules.md#dr-007--larger-screens-expose-useful-detail-and-preserve-legibility)

![The same parcel journey diagram and explanation, with dark readable prose on the left and low-contrast gray prose on the right.](examples/images/diagram.png)

Only the prose color changes. In the light theme, `#aaa` on white produces about
2.32:1 contrast, below the 4.5:1 WCAG AA minimum for normal text. The diagram and
content remain the same. Dark mode uses its own colors and recalculates the labels.

Viewrule already delegates detection to axe. Confirmed violations become blocking
`axe:color-contrast` findings when `accessibility` is enabled. The gallery's simple
calculation does not cover image backgrounds, compositing, or all exceptions;
inconclusive axe results require review. See [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Tab bar

[Interactive example](examples/index.html#tabs) ·
[DR-006](design-rules.md#dr-006--related-evidence-stays-visible-together)

![Overview, Delivery events, and Charges tabs with complete labels, beside fixed-width tabs that truncate two labels.](examples/images/tabs.png)

Fixed 74px buttons truncate labels even though the component has room to display
them. The accepted buttons use content-based widths and wrap when necessary.
Click either set or use the arrow keys to compare the same selected panel.

Scope `no-clip` to the tab buttons; Viewrule can detect their clipped contents.
Choosing whether information belongs behind a tab still requires task judgment.
Essential simultaneous comparisons should remain visible together.

## Hamburger menu

[Interactive example](examples/index.html#menu) ·
[DR-007](design-rules.md#dr-007--larger-screens-expose-useful-detail-and-preserve-legibility)

![The same navigation with a 44 by 44 pixel menu button and an 18 by 18 pixel menu button.](examples/images/menu.png)

The icon, accessible name, destinations, and behavior are identical. Only the
button bounds change: 44×44px provides a larger target; 18×18px requires greater
precision. Open either menu and choose a destination to change both sides.

The baseline warns on declared ordinary controls below **24×24 CSS px**; 44px is
a deliberate choice in this example, not the engine's minimum. Bounding boxes
do not prove hit geometry or implement every WCAG target-size exception. The
decision to use a hamburger menu also depends on navigation frequency and context.

## Numeric alignment

[Interactive example](examples/index.html#numbers) ·
[DR-006](design-rules.md#dr-006--related-evidence-stays-visible-together)

![The same four carrier quotes with right-aligned amounts and a matching header, beside left-aligned amounts.](examples/images/numbers.png)

Amounts and their column heading share a right edge in the accepted version.
Both sides retain the same values, currency context, precision, and tabular digits,
so the difference isolates alignment.

The analytical preset applies `text-align: right` or `end` expectations to amounts
explicitly marked with `data-viewrule-number` inside a comparison group. Identifiers
and dates need different treatment; specialized decimal layouts need their own scope.

## Comparison spacing

[Interactive example](examples/index.html#spacing) ·
[DR-007](design-rules.md#dr-007--larger-screens-expose-useful-detail-and-preserve-legibility)

![The same four carrier quotes in a bounded table and a stretched table whose labels sit much farther from their values.](examples/images/spacing.png)

The bounded table keeps each amount near its carrier. Expanding the other table
adds empty distance while preserving exactly the same evidence. Both sides retain
readable text, aligned amounts, and the full set of four quotes.

The analytical preset starts with a maximum **160 CSS px** gap between adjacent
text values in declared comparison cells. The gallery label measures the first row
for illustration; the engine evaluates applicable rows and cells. A bounded table
can leave useful surrounding whitespace. Resize the gallery to observe the gap;
this is not a substitute for measuring your application's supported desktop and 4K states.

## Use and maintain the examples

Read `viewrule contract`, select the relevant expectation, and adapt its selectors
and scope to the actual application. The gallery's illustrative selectors and finite
data sets are not a complete analytical preset configuration. See
[rule authoring](rule-authoring.md) and [the preset defaults](defaults.md).

The gallery lives in `examples/index.html`, `examples/gallery.css`, and
`examples/gallery.js`. Markup uses HTML templates; the script synchronizes state and
updates measurement labels. All dependencies are local. Format, lint, and static
analysis cover these files through `npm run check`.

When changing an example, preserve identical data and state on both sides, state
the constraint and its scope, inspect the interaction, and refresh its screenshot
at the intended reading size. Click a screenshot to view its original file when
GitHub scales it down. These documentation examples complement the existing
[installed regression workflow](../test/README.md); they do not add a second test suite.

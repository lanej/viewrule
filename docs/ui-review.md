# Viewrule manual

For file/name glob selection and read-only workload inspection, see [scopes and `viewrule plan`](scopes.md).

A small local UI quality tool: Playwright captures, deterministic layout rules,
axe accessibility checks, HTML/JSON reports, and a versioned feedback loop.
Tufte-inspired policy lives in `docs/design-rules.md`. Personal preferences and
reusable rules live in the user-config directory; see [integrations](integrations.md).
Neither a passing run nor an approved screenshot proves a design is effective.

[Design rules](design-rules.md) defines the intended requirements for analytical
screens. [Detection and enforcement](ui-review-enforcement.md) maps those IDs to
implemented checks, configuration examples, and the limits of their evidence.

## Setup and first review

Requires Node 22.18+ and npm. Install the standalone package as described in [README](../README.md).
The following commands require `Runtime URL:` in the installed `viewrule --help`;
for older engine 0.7.1, use the [compatibility workflow](#runtime-url-compatibility).
Set `APP_URL` to the actual URL printed by your running application.

```sh
viewrule install-browser
cd ~/src/my-app
viewrule init
# Edit .ui-review/config.json and .ui-review/rules.json; start your app normally.
viewrule contract
viewrule check --url "$APP_URL"
```

`init` never replaces an existing configuration. The checker does not execute
application startup commands. It uses a fresh Chromium context for each capture.
For linked checkouts, see [Git worktrees](worktrees.md): version the setup files,
keep evidence local, and use `--project` to choose an exact application root.
For an authenticated local app, set `storageState` to a local Playwright state
file; `.ui-review/auth*.json` is ignored by the generated ignore file. Do not
commit authentication state. `VIEWRULE_BROWSER_PATH` (legacy `UI_REVIEW_BROWSER_PATH`) can select an already
installed Chromium executable. Screenshots remain local unless you commit/share
them deliberately.

To try the tool without an application, run `npm run demo` from a source checkout. It creates a temporary before/after comparison with
deliberately broken and corrected carrier tables and prints the HTML report path.
The example contains illustrative data and does not record user approval.

The check prints paths to `report.json` and `index.html`. Open the HTML report to
compare current captures with the last approved reference. Each finding includes
its rule, selector, observed value, expected value, and rationale. JSON also records
the evaluated rule IDs and axe checks requiring manual review. Exit codes:
`0` = no errors (warnings allowed), `1` = failed checks/capture, `2` = bad setup or
configuration. Missing/hidden required selectors and invalid rules fail explicitly.

### Source-check output

Enabled source-check providers must emit a JSON array or `{ "findings": [] }`
to stdout. Exit codes 0 and 1 are accepted with valid JSON so linters can signal
findings with exit 1. A clean scan must explicitly emit an empty array. Empty,
whitespace-only, or malformed output fails review with setup exit code 2 and keeps
evidence verification failing; it cannot resolve previously reported findings.

Use `viewrule lint --target src` for a source-only scan without Chromium. New
projects include bundled Impeccable diagnostics as advisory; source-only results
never replace a rendered review or satisfy rendered-evidence verification.

Use `format: "impeccable"` for the pinned Impeccable source detector. Its exit
codes are different: 0 means no primary findings, 2 means primary findings, and
1 means an incomplete or failed scan. See [the working integration](impeccable.md).
Provider results preserve exact stdout, stderr, exit code, configured version,
command, format, and working directory alongside normalized findings. Version is
configuration provenance; Viewrule does not install or update the provider.

### Changes since approval

HTML and JSON lead with new, persistent, and resolved findings relative to the
last project-approved review, including source-check findings with their provider
authority. A first run has no regression baseline; its findings are current findings.
Newly unassessed design rules retain their page, checkpoint, and viewport context.

Finding identities use the review state, rule, selector, element description, and
sorted design-rule citations. Wording, severity, and measured-value changes do not
create new identities. Indistinguishable repeated elements retain occurrence counts;
these identify a group of observations, not individual records across reordering.
Source identities use the provider and reported file/line; moving a diagnostic can
appear as a new finding.

Absent findings count as resolved only when the state was inspected under unchanged
configuration, policy, and governing rules. Removed states, skipped evidence, failed
captures, and changed boundaries are listed as **not compared**, with a reason.
New/persistent findings alone do not identify whether application or contract changes
caused them. Approval never waives automated failures.

`changes.contract` compares requirements and project documents with the approved
snapshot. HTML uses that same baseline; the existing top-level `contract` comparison
still refers to the previous completed run. Before/after screenshots remain available
as evidence. `changes.evidence` classifies compatible captures as `changed` or
`unchanged` and other states as `not-compared`, with reasons. HTML provides matching
before/after crops at their original resolution. Changed pixels never alter findings,
review status, or approval.

Comparison requires matching page/checkpoint/viewport, URL, readiness, media,
text scale, checkpoint setup path, recorded browser version, complete scale-1 captures,
and equal PNG dimensions. Missing files, older reports without browser provenance,
failed captures, and oversized images remain explicitly unassessed. Images are never
rescaled or aligned. Layout shifts may affect many regions; timestamps and animations
that remain visible can still produce differences.

The versioned method records a 24-level RGB threshold after alpha compositing over
white, 32-pixel cells containing at least four changed pixels, and connected regions
containing at least 64 changed pixels. Eight pixels of context surround each crop.
At most 32 regions are exported, largest first; omitted counts remain explicit.
Captures above 24 million pixels or 32 MiB encoded size are not compared. `unchanged`
means no region exceeded these noise thresholds, not byte identity or design approval.

## Author rules and inspect the contract

`viewrule contract` prints effective merged boundaries before implementation without
opening a browser. `viewrule schema --type <type>` prints the installed type schema.
`viewrule add-rule --rule <file> --dry-run` previews a new project rule; omit
`--dry-run` to add it without replacing an existing local or global ID. Use actual
report feedback with `learn` for revisions. See [rule authoring](rule-authoring.md).

Reports include `contract.hash`, the full config/rule snapshot, and differences
from the previous completed report: added/removed/modified rules, configuration,
and policy changes. These differences describe changes; they do not approve them.

## Project configuration

### Runtime URL compatibility

Runtime URL overrides are available in engine 0.8.0, whose `--help` contains
`Runtime URL:`. Older engine 0.7.1 ignores `check --url` and `VIEWRULE_BASE_URL`; it always
reviews configured `baseURL`. For that engine, set `APP_URL` to the running app's
actual URL, initialize with `viewrule init --url "$APP_URL"`, author the contract,
and run `viewrule check`. For an existing configuration, update `baseURL` explicitly
to match the current checkout's server; `init` preserves existing configuration.
Use the runtime workflow after upgrading to an engine that advertises support.

### Runtime configuration

`baseURL` is optional. New configurations omit it so a development port is not
committed as part of the design contract. For `check` and `plan`, resolve the
running application at execution time with `--url <actual-url>` or
`VIEWRULE_BASE_URL`; an existing configured `baseURL` remains the fallback.
Viewrule does not start the application or scan localhost ports; use the URL
reported by the current checkout's server. URLs must use HTTP(S) without embedded
credentials. An invalid override fails rather than selecting a fallback server.
Use relative page paths so every route stays on the selected endpoint when its
port changes; absolute routes on a different origin are rejected.

The plan's `target` and report's `targetBaseURL` record the resolved URL without
changing the committed config or contract hash. Contract, guidance, source-only
lint, and evidence verification do not need a runtime URL.

```json
{
  "version": 1,
  "enforceOnStop": false,
  "sourcePaths": ["src", "public", "package.json"],
  "accessibility": true,
  "pages": [{"name": "carriers", "path": "/carriers", "ready": "[data-testid=carrier-table]"}],
  "viewports": [
    {"name": "desktop", "width": 1440, "height": 900},
    {"name": "mobile", "width": 390, "height": 844}
  ]
}
```

Optional `timeoutMs` controls browser action/navigation timeouts (default 15000).
Use a ready selector that proves the intended data/state has loaded, not a generic
page shell or login page. Routes must stay on the configured origin. Animation is
disabled for captures; fonts are awaited. Supply deterministic fixture data when
comparing runs. Initial captures use light color scheme and reduced motion; this
first version does not model interaction sequences, themes, or other browsers.

`sourcePaths` supports project-relative file/directory prefixes and include/exclude globs. They define freshness
coverage: include all files that can affect your UI and fixture data. Default `.`
covers Git-visible files; generated review output, dependencies, and build/cache
directories are excluded. Without Git, the checker walks the project with those
same exclusions. An external server's changing data cannot be detected by a source
hash: rerun captures when data or application state changes.

## Rules

Put an array in `.ui-review/rules.json`. Project rules override global rules by
exact `id`. All rules need `id`, `type`, `selector`, `severity` (`error` or
`warning`), and `reason`. Optional `pages`/`viewports` restrict applicability;
`optional: true` allows a selector to be absent. Keep optional rules for genuinely
optional components, not required evidence.

| Type | Extra fields | Meaning |
| --- | --- | --- |
| `within-bounds` | `container`, `tolerance` | Selected HTML/SVG element boxes must fit their nearest matching ancestor's border box; CSS px. Detects labels outside an SVG viewport even when the page itself does not overflow. |
| `min-size` | `minWidth`, `minHeight` | Minimum visible element bounds in CSS px; not a complete hit-target/accessibility test |
| `align` | `edge`, `tolerance` | Maximum spread of left/right/top/bottom edges, in CSS pixels; select one peer group |
| `reading-column` | `container`, `maxWidth`, `tolerance` | Each selected box fills `min(ancestor width, maxWidth)` and is horizontally centered within its nearest matching ancestor; CSS px |
| `vertical-order` | `groups`, `tolerance` | Ordered descendant selector groups must follow both DOM order and non-overlapping top-to-bottom box order; CSS px |
| `required-elements` | `required` | Each visible component contains all declared descendants, including text-free graphics; missing or partially hidden matches fail |
| `relative-position` | `from`, `to`, `relation`, `minGap`, `maxGap`, `tolerance` | Exactly one visible peer at each end, per component; `left-of` or `above` with a shared band and bounded border-box gap in CSS px |
| `no-overlap` | — | Declared peers must not overlap; ancestor/descendant pairs are excluded. Findings include bounded text excerpts to distinguish anonymous SVG peers |
| `no-clip` | — | Element's own hidden/clip overflow must not truncate content; does not inspect ancestor clipping |
| `visible-count` | `min` | At least this many complete element boxes fit in the initial viewport; does not detect occlusion |
| `max-height` | `max` | Maximum element height in CSS pixels, useful for task-specific density warnings |
| `min-font-size` | `min` | Minimum computed CSS font size of visible descendant DOM text; empty text scope fails |
| `max-text-gap` | `items`, `max` | Maximum horizontal edge-to-edge distance between adjacent text bounds in each declared row, in CSS pixels; requires two text items sharing a reading band |
| `style` | `property`, `allowed` | Approved computed CSS values (e.g., `font-size`, `["14px", "16px"]`) |
| `attribute` | `attribute`, `allowed`, `designRules` | Allowed rendered DOM attribute values; declared metadata requires a renderer integration |
| `consistent` | `keyAttribute`, `properties`, `attributes`; optional `acrossPages`, `compareSVG` | Same identity retains selected CSS/attribute values; opt in to inline SVG structure and cross-page comparisons. At least one property, attribute, or SVG comparison is required |
| `comparison-set` | `keyAttribute`, `requiredKeys`, `minVisibleByViewport`, `preserveFrom`, `minFontSize` | Distinct visible identities, readable text, and preservation of comparisons on larger viewports |
| `context` | `required` | Each matching component contains visible nonempty descendants for these selectors |
| `repeated-metric` | `items`, `keyAttribute`, `requiredKeys`, `maxOccurrences` | Count visible text-bearing declared metric identities separately inside each selected decision surface |
| `evidence-proximity` | `evidence`, `decision`, `maxDistance` | Shortest Euclidean gap between two declared text bounds, in CSS px, per selected decision surface |
| `mark-contrast` | `substrate`, `minRatio` | Computed opaque CSS background-color contrast between an HTML mark and its containing solid HTML substrate |
| `region-density` | `region`, `measure`, `minCoverage`, `maxVerticalGap` | Union coverage of selected content within the visible part of one region, plus its largest empty vertical band |

Page-level horizontal overflow and axe WCAG A/AA checks run independently of
selector rules. Intentional horizontal scrolling belongs inside a local container.
See [reading layouts](reading-layout.md) for complete rules, optional group semantics,
print/enlarged-text capture, and the migration from a site-owned essay detector.
See [component relationships](component-relationships.md) for per-item presence,
positions and spacing, and list-to-detail SVG continuity with explicit limits.
The checker cannot infer which elements should align, certify the meaning of metric
context, or inspect canvas chart scales. Those need explicit configuration and
visual/domain review. Attribute checks can inspect metadata generated by the
renderer, but cannot prove it matches the image. Zero custom rules means only
overflow, accessibility, and capture integrity are covered. Per-design-rule
coverage is recorded in HTML and JSON; unassessed requirements are not passes.

New `init` projects receive the [baseline preset](defaults.md); use `--preset analytical`
for declared comparisons. Existing projects retain their rules. `viewrule preset
--name analytical` prints editable starter rules for selective adoption. The
`comparison-set.requiredKeys` array may be empty when only counts and preservation
are specified; populate it for a named critical set. All active count targets still
need configuration. Neither text size nor text distance proves visual readability
or semantic relevance; see [measurement limits](defaults.md#measurement-limits-and-evidence).

Checks cite `DR-001` through `DR-016` using their type's default mapping or an
explicit `designRules` array. `attribute` requires an explicit citation. Optional
`requiredDesignRules` in project config makes missing executed evidence for the
listed IDs an error in each configured page/viewport. This is a coverage
requirement for scoped checks, not certification of the whole design rule.

Example (provisional values for one carrier screen, not global defaults):

```json
[
  {
    "id": "carrier-comparison-rows",
    "type": "visible-count",
    "selector": "[data-testid=carrier-table] tbody tr",
    "min": 8,
    "pages": ["carriers"],
    "viewports": ["desktop"],
    "severity": "error",
    "reason": "Compare eight carriers together without scrolling."
  }
]
```

## Feedback loop

Tell Claude or Codex: "This looks good; keep this as the reference", or "The
summary pushes the table down; I need eight complete rows on desktop."

```sh
viewrule feedback --report .ui-review/runs/RUN/report.json \
  --decision adjust --note 'Show eight complete carrier rows on desktop.'
# Returns a feedback ID. Put the concrete rule above (one object) into /tmp/row-rule.json.
viewrule learn --feedback FEEDBACK_ID --rule /tmp/row-rule.json
viewrule check
viewrule feedback --report .ui-review/runs/NEW_RUN/report.json \
  --decision approve --note 'This comparison layout works.'
```

`learn` validates the rule, requires recorded feedback, and preserves its
`feedbackId`. It never turns prose into thresholds automatically. The coding agent
does the translation, tests it, and explains the scope. Subjective notes remain
guidance via `viewrule guidance` and the report. Approval preserves that exact
run's images under `.ui-review/approved/`; it never clears failing checks. The
next report shows the most recent approved run's matching page/viewport images.
There is no pixel-difference gate in this version.

## Large screens and assessment fidelity

New configs include 1440×900, 1920×1080, 2560×1440, 3840×2160, and 390×844.
These are **CSS viewport dimensions**, not monitor hardware resolutions. Replace
them with your actual browser sizes as needed. Existing configs are preserved.

Every page also produces overlapping detail PNGs at one image pixel per CSS pixel,
defaulting to 1024×800 with at least 64px overlap. Use the overview for composition and
open individual tiles at original size for labels, type, and alignment. The HTML
report preserves each tile's width in a scrollable container instead of shrinking
it. The JSON manifest records coordinates, dimensions, expected/captured counts,
and coverage. The program verifies capture coverage; an agent or person still
has to inspect the images. A passing geometry check does not certify that review.

Optional capture limits:

```json
"detailCapture": {"width": 1000, "height": 800, "overlap": 64, "maxTiles": 64}
```

Exceeding `maxTiles` produces an error with the missing capture count; it never
silently declares the page fully captured. Narrow a very long page's fixture state
or deliberately raise the limit. This captures the document surface, not hidden
scroll-container content or interaction states. Keep those in separate app tests.

For density, `region-density` clips to the intersection of the region and the
initial viewport, and unions rectangles so nested/overlapping elements don't
inflate coverage. `measure: "text"` uses rendered text line rectangles;
`measure: "boxes"` uses selected element bounding boxes (useful for plot areas).
Neither measures semantic relevance or actual data ink. Select content, not whole
dashboard containers. Ancestor clipping and occlusion still require visual review.
Reports include coverage, selected element count per 100,000 CSS px², and largest
vertical gap. Element counts depend on selector granularity; compare the same
selectors across runs. Do not trade away legibility to improve a density metric.
Use the reserved region `"viewport"` to measure the whole visible screen, including
space outside a fixed-width content wrapper. Use a CSS selector for one workspace
region. A tightly fitted wrapper cannot reveal unused space outside itself.

Example only—calibrate these thresholds against an accepted large-screen layout:

```json
{
  "id": "comparison-workspace-use",
  "type": "region-density",
  "region": "viewport",
  "selector": "[data-testid=metric-value], [data-testid=carrier-table] td",
  "measure": "text",
  "minCoverage": 0.04,
  "maxVerticalGap": 200,
  "viewports": ["large", "4k"],
  "severity": "error",
  "reason": "Keep comparison evidence visible and avoid large unused bands."
}
```

These are proposed geometric constraints, not universal Tufte rules. Add the
visible-row and type-scale checks appropriate to the task; a screen can satisfy
coverage while communicating poorly.

**Known weakness:** increasing a table’s width can raise box coverage without
adding useful information. Text coverage is also only a proxy. See [roadmap](../ROADMAP.md);
the current passing regression fixture does not establish good semantic density.

Use `--scope global` on both feedback and learn only for deliberately reusable
preferences. Global notes/rules live in `$XDG_CONFIG_HOME/viewrule` (default `~/.config/viewrule`),
or `VIEWRULE_CONFIG_DIR` when set; project notes, configuration,
rules, and approved references stay with the project. Review before committing
screenshots, particularly in public repos. Commit rules and notes you want to
reuse; `.ui-review/runs/` and `latest.json` are disposable and ignored.

## Claude and CI enforcement

`viewrule verify` requires a passing report with a matching fingerprint of configured
source, runtime setup, local/global rules, and the checker implementation. It checks
existing evidence without a browser. Optional `pre-commit` and `pre-push` commands
first select affected UI inputs and match the reviewed files to the staged/pushed
contents. The obsolete `enforceOnStop` field is accepted but ignored; conversational
stops are never blocked. See [Git gates and engine availability](git-gates.md).

For a required merge gate, install the pinned dependencies, install Chromium,
start the app with fixtures, and run `viewrule check` in CI. Preserve the run
directory as an artifact on failure. This repository's `ci.yml` exercises
one representative CLI regression workflow on Linux.

## Development

```sh
npm ci
npm run format
npm run check
npm run browser:install
npm test
```

Keep one regression test for the UI review workflow: a responsive comparison
loses evidence and changes period at 4K, findings cite design rules, feedback
becomes a rule, and the repair passes with full-resolution details. A later source
change invalidates that pass. Improve this detector when a
regression occurs instead of adding a helper or edge-case test matrix.
`npm test` exercises the installed tarball, not just the source checkout.
Use concrete rejected/accepted examples to calibrate new rules. Do not promote a
rule because it passes only the example used to invent it.

References: [Tufte](https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/),
[Playwright accessibility](https://playwright.dev/docs/accessibility-testing),
[Git gates and Stop migration](git-gates.md).


## Analytical decision surfaces

See the [synthetic pair and executable rules](design-examples.md#expanded-analytical-decision-surface).
These are opt-in project rules; existing presets and application contracts remain unchanged.

`repeated-metric` uses `selector` for decision surfaces and `items` for their summary
metric descendants. `keyAttribute` identifies a **measure with its population, period,
and unit**, not its displayed number. Within each surface, visible text-bearing
instances of the same key must not exceed `maxOccurrences` (positive integer).
`requiredKeys` is a nonempty list that prevents deleting a required metric to pass.
Other selected keys are also counted. Blank keys/text fail. Hidden responsive variants
are ignored; nested selected surfaces own their own descendants, so unrelated decisions
are not deduplicated. Equal values with different identities are not repetitions.
This checks declared identities, not semantic equivalence or annotation completeness.
Use an `items` selector that still matches a metric if its key attribute is removed.

`evidence-proximity` uses `selector` for decision surfaces and requires exactly one
visible, nonempty descendant matching each of `evidence` and `decision` per surface.
Nested surfaces own their own anchors. It unions the text bounds in each anchor,
then computes horizontal and vertical edge gaps and their Euclidean distance against
`maxDistance` (nonnegative CSS px). Empty, missing, or ambiguous anchors fail and
are recorded as missing evidence. Padded container edges do not substitute for text.
The measurement works outside the initial viewport too; it does **not** require the
pair to be on screen simultaneously. Overlapping text bounds have zero distance:
combine with `no-overlap`, clipping, or visible-count constraints where applicable.
Semantic support, reading order, disconnected text ranges, and occlusion need review.

`mark-contrast` selects actual HTML marks and finds the nearest matching containing
ancestor using `substrate`. Both must have opaque, solid, computed sRGB
`background-color` values. It compares relative luminance without rounding the ratio
against `minRatio` (1–21). No declared contrast number or color metadata is trusted.
The model rejects transparent or unsupported color syntax, SVG marks/substrates,
missing substrates, marks outside their substrate, intervening painted backgrounds,
background images/gradients, generated pseudo-content, shadows, and ancestor opacity,
filters, masks, or blending. Unsupported paint emits an **unassessed** finding at the
configured severity and does not establish executed coverage. It does not fall back
to nominal colors or silently pass. On error rules, such evidence cannot satisfy a gate.

This deliberately limited model measures a declared solid-color relationship, not
raster pixels: sibling overlays, terrain drawn in another layer, borders/outlines,
anti-aliasing, clipping, and interactive/theme states require visual review. Choose
the true containing substrate and inspect the captures. A real map with imagery or
SVG/canvas marks needs a different measurement integration or human review. The
[W3C guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
explains adjacent colors and 3:1 for relevant graphics; semantic color selection
(DR-016) remains a review rule even when this partial check passes.

Reports expose `metrics.repeatedMetrics` (per-surface counts), `evidenceDistances`
(horizontal/vertical gaps and distance), and `markContrasts` (computed colors,
unrounded ratio or unassessed status). `region-density` retains its existing text/
box union coverage, element-count, and empty-band metrics. Keep its selectors on
supporting content instead of rewarding the large map's bounding box. Use existing
`max-height` for explicitly identified scalar displays; a new scalar-quality score
would overstate what geometry can establish. Readable-type and map-size rules prevent
compression from becoming smaller text or an unreadable geographic thumbnail.

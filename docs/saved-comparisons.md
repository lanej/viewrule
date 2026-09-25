# Compare two saved reviews

Available in the development checkout; not included in the published 0.9.0 engine.

`viewrule compare` produces a portable HTML comparison from two existing version 1
review reports and their adjacent PNG files. The command requires no running
application or configured project. It never records approval or modifies either
input run, rules, feedback, or `.ui-review/latest.json`.

```sh
viewrule compare \
  --before .ui-review/runs/BEFORE/report.json \
  --after .ui-review/runs/AFTER/report.json \
  --output ./comparison \
  --annotations ./comparison-notes.json \
  --image
```

Choose a new output directory in an existing parent. `--annotations` and `--image`
are optional. HTML generation needs no browser; `--image` uses the installed
Chromium (or `VIEWRULE_BROWSER_PATH`) to export each comparison section as
`comparison-1.png`, etc. It renders the saved report, not the application. No
image-generation service or model is involved. The command prints output paths
and the number of states that could not be compared. Exit 0 means the comparison
was written, including any explicit gaps; it does **not** mean either review passes.
Invalid inputs, existing destinations, or failed image export return exit 2.

## Record regions before capturing

Opt in on each configured page, before the first review:

```json
{
  "name": "operations",
  "path": "/operations",
  "ready": "main[data-ready]",
  "captureRegions": [
    { "id": "heading", "selector": ".workspace-heading" },
    { "id": "charts", "selector": "#carrier-charts" }
  ]
}
```

`captureRegions` allows up to 32 unique IDs per page. Each selector must resolve
to exactly one element with a visible positive bounding box. The report records
its document-relative CSS-pixel box immediately before the overview capture.
Invalid, hidden, missing, or ambiguous regions record a reason instead. These
optional annotation failures do not change rule outcomes or establish coverage.
Use a real layout/context rule when the element is required for acceptance.

The region ID connects before and after; its selector must remain unchanged for a
size delta. Regions are page-scoped and collected in each checkpoint/viewport.
Coordinates are axis-aligned DOM bounds, including transformed boxes; they do not
prove unobstructed visibility, contents, or task relevance. Dynamic content may
move between the adjacent measurement and screenshot operations. Freeze the
application's data/state before reviewing it. Old captures without regions remain
usable as originals; the command never invents locations from pixels.

## Author interpretation separately

```json
{
  "version": 1,
  "title": "Operations: give the working queue room",
  "summary": "Two saved revisions under the same task contract.",
  "callouts": [
    {
      "page": "operations",
      "region": "heading",
      "title": "Bound the framing",
      "interpretation": "The shorter heading returns space to the queue. Its appropriate emphasis still needs human review."
    }
  ]
}
```

Annotations are escaped plain text. They apply to that page/region across states;
unknown or duplicate page/region declarations are rejected. All recorded regions
receive numbered callouts; a region without commentary explicitly says none was
supplied. Captions are never presented as engine findings. The viewer's native
checkbox hides overlays without changing either image; originals and full reports
remain one click away.

## Measurements and comparability

States match by page name, checkpoint name, viewport name, and CSS dimensions.
Different document heights are allowed: both images share a display scale, with
clearly labeled padding below the shorter original. This is a side-by-side
comparison, not a pixel diff or an attempt to align changed layouts. Images never
upscale past their native width. Mobile viewing stacks the same-scale pair.

Deltas require unchanged config, rules, policy, and recorded design documents;
matching engine/browser versions and URL, readiness, media, text scale, and
checkpoint setup; complete scale-1 captures and inspection coverage; and no failed
or source-changing capture. Reused after evidence older than the before review is
not new evidence. Missing states/files and changed or unavailable conditions are
listed explicitly. A changed contract conservatively suppresses all deltas even
if a particular geometry appears unaffected. Choosing a new rule threshold cannot
be presented as a measured repair under the original contract.

The viewer shows region width/height in CSS px, plus supported single-container
composition observations: maximum anchor residual (CSS px), population gap or peer
footprint coefficient of variation (unitless), chrome allocation (area ratio),
and viewport-growth yield (fractional qualifying-evidence growth divided by
fractional usable-area growth). These are the saved engine measurements; compare
does not recalculate them from images. A yield delta also requires the corresponding
reference viewport in both runs to pass the same capture and compatibility checks;
a fresh larger capture cannot compensate for stale or missing reference evidence.
Missing/invalid or multi-container
observations have no numeric delta. Reference, saturated, and unassessed growth
states retain their names instead of becoming zero yield. Displayed numbers round
to three decimals; originals retain full precision. A negative delta is not a
generic improvement: interpret the governing rule, threshold, and task. Each
comparison measurement also retains unrounded numeric `values` in JSON (null
when unavailable or not comparable).

Saved browser findings are expandable alongside the comparison. Full reports
retain all other metrics, assessment coverage, source diagnostics, and original
rule outcomes. There is no new pass/fail score, inference of semantic preservation,
or finding-resolution algorithm. Existing approved-baseline reports and their
pixel-change navigation remain unchanged.

## Preserved evidence and limits

Output includes `before/` and `after/` with exact original report, overview, and
detail PNG bytes, `comparison.json` with input/artifact SHA-256 hashes and gap
reasons, `annotations.json`, `index.html`, and optional exported images. Missing,
invalid, or oversized PNGs are omitted explicitly. The entire directory is
portable. It contains whatever private information was already in the supplied
reports and screenshots; review it before sharing.

Only expected local capture filenames are accepted; symlinks outside each input
run are rejected. Limits are 32 MiB per report/PNG, 24 million pixels per PNG,
512 MiB of copied PNGs per run, and 256 page states per report. Hashes establish
copy fidelity, not trusted provenance or authenticity of the inputs. Identical
recorded conditions cannot establish identical remote data, fonts, browser binary,
or unrecorded environment. Review those independently. The command never supplies
human approval or proves overall design quality.

The [Parcel desk protocol](../benchmarks/workflow/saved-comparison-protocol.md)
fixes task-specific expectations before the repair. Its generated evidence is
retained by the installed regression in `dist/saved-comparison-evidence/`. This
checks a demanding synthetic application and comparison workflow, not whether a
coding agent independently prevents defects.

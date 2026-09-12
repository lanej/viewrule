# Architecture

Viewrule is a local Node CLI with a browser worker in the same process. The CLI is
the supported integration boundary; `src/` modules are internal. There is no daemon,
database service, model dependency, or general plugin framework in 0.1.

## Ownership

| Location | Owns | Does not own |
| --- | --- | --- |
| Viewrule repository | Engine, rule schema, design policy, reports, distribution, regression detector | Personal taste or application code |
| Dotfiles | Pinned installation, development-checkout override, personal preferences, Claude integration | A second copy of the engine |
| Application `.ui-review/` | Routes, selectors, viewports, thresholds, recorded feedback, approved references | Global defaults for unrelated applications |

Global configuration defaults to `$XDG_CONFIG_HOME/viewrule`, or `~/.config/viewrule`.
`VIEWRULE_CONFIG_DIR` overrides it; legacy `UI_REVIEW_GLOBAL_DIR` is also accepted.
Project rules override global rules by exact rule ID. No per-user data is written
inside the installed package.

## Runtime path

```mermaid
flowchart TD
  A["CLI: check"] --> B["Validate config and merge rules"]
  B --> C["Capture and inspect each page / viewport"]
  C --> D["Compare observations and cite design rules"]
  D --> E["Write HTML, JSON, and latest state"]
  E --> F["Human review and feedback"]
  F --> G["Validate and store a scoped rule"]
  G --> B
```

The source fingerprint is computed before and after capture. Changing scoped
source or rules during a run fails that run. Each page/viewport receives a fresh
Chromium context, deterministic capture settings, an overview, and overlapping
detail tiles. Measurements use browser CSS coordinates, not a resized screenshot.

DOM observations feed cross-viewport comparisons. Findings then receive policy
citations and remediation suggestions. The report embeds the design-policy text
and its hash so an old finding can be read against the policy it used.

## Modules

| Module | Responsibility |
| --- | --- |
| `bin/viewrule.mjs` | Executable, lightweight hook preflight, version, browser installation |
| `src/cli.mjs` | Command parsing and presentation |
| `src/paths.mjs` | User-config location and compatibility environment variables |
| `src/config.mjs` | Ajv validation, project loading, defaults, rule merging |
| `src/review.mjs` | Browser lifecycle and review orchestration |
| `src/capture.mjs` | Native-scale tile planning, capture, and coverage accounting |
| `src/checks.mjs` | Browser-side DOM geometry and style observations |
| `src/design.mjs` | Design policy loading, cross-viewport rules, citations, suggestions |
| `src/report.mjs` | Escaped local HTML reports and policy pages |
| `src/state.mjs` | Fingerprints, atomic state writes, feedback, learning, Stop decisions |

Rule definitions are data, not executable user JavaScript. Adding a measurement
means extending its schema, observation/evaluation, policy mapping, and docs in one
change. Do not add a generic extension API before a concrete integration needs one.

## Stored state

| File | Lifecycle |
| --- | --- |
| `.ui-review/config.json` | Versioned project settings; explicit Stop opt-in |
| `.ui-review/rules.json` | Scoped executable expectations |
| `.ui-review/feedback.jsonl` | Append-only human feedback and provenance |
| `.ui-review/approved/<id>/` | Exact report and screenshots approved by a human |
| `.ui-review/runs/<id>/` | Disposable run: JSON, HTML, policy snapshot, overview, tiles |
| `.ui-review/latest.json` | Running/pass/fail state and source fingerprint for the hook |
| Global `rules.json`, `preferences.json`, `feedback.jsonl` | Deliberately reusable rules and notes |

Global feedback does not copy project screenshots; prose can still contain private
information. Rules are updated using an exclusive lock and atomic rename. Runs
have unique directories; concurrent checks of one project are not a supported
workflow. A process interrupted after setting `running` leaves enforcement blocked
until a successful rerun.

## Confidence and enforcement boundaries

Geometry can establish an edge position or visible box count with high confidence
within the DOM model. It cannot establish task relevance, unobstructed visibility
in every case, chart truth, or visual quality. Canvas, ancestor clipping, occlusion,
and semantic metadata require additional review. Density remains a proxy.

The Stop hook reads state and compares fingerprints; it does not launch a browser.
Its continuation guard permits a subsequent stop to avoid loops. Use application
CI and repository branch protection when a passing check must gate a merge.
Viewrule supplies the exit code; repository owners configure required status checks.

Fingerprints cover configured source, local/global rules and preferences, engine
files, package manifest, shrinkwrap, and design policy. They do not cover changing
remote data, browser binaries, operating-system fonts, or a modified live server.
Recheck after those change. A fingerprint is a freshness aid, not an attestation.

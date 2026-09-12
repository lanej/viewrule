# Viewrule

**Executable design rules for rendered interfaces.**

Viewrule helps people and coding agents check whether a UI preserves the information
needed for a task. It measures a running page with Playwright, cites the relevant
design rule, captures full-resolution evidence, and remembers human feedback.

It began as a tool in [lanej/dotfiles](https://github.com/lanej/dotfiles/pull/29).
The engine now belongs here; personal preferences and agent hooks belong in dotfiles;
application-specific selectors and thresholds belong in each application.

**Status:** experimental 0.1.0. Source and versioned packages are available through
[GitHub Releases](https://github.com/lanej/viewrule/releases).
There is no npm registry release to install with `npx viewrule` yet.

## What it checks

- Alignment, overlap, clipping, required context, visible item counts, declared
  styles and metadata, and consistency across viewports.
- Whether a larger viewport loses previously visible comparisons or hides required
  identities; readable type and minimum item counts are configured per task.
- Text or element-box coverage within a chosen region, with explicit measurement limits.
- Horizontal page overflow, automated accessibility findings, and complete detail capture.

Each finding includes a selector, observation, expectation, rationale, suggested
remediation, and citations such as **DR-007: preserve useful detail on larger screens**.
Unassessed design rules remain unassessed. A pass means the configured checks passed.

The [eight design rules](docs/design-rules.md) are our interpretation inspired by
Edward Tufte's *The Visual Display of Quantitative Information*. They are not
quotations, universal density thresholds, or an endorsement by Tufte.

## Try the source

Requires Node.js 22+ and npm. Linux is exercised in CI; macOS is an intended target
but has not yet been validated. Windows support is not established.

From this checkout or an extracted source archive:

```sh
npm ci
npm run browser:install
npm run demo
```

The demo prints a local HTML report path for a broken and corrected comparison.
To install the standalone CLI from the checkout:

```sh
npm pack
npm install --global ./viewrule-0.1.0.tgz
viewrule --version
viewrule install-browser
cd /path/to/your/app
viewrule init --url http://localhost:3000
# Start your app; edit .ui-review/config.json and .ui-review/rules.json.
viewrule check
```

`init` creates a configuration without overwriting one. The `.ui-review` directory
and `ui-review` command alias remain compatible with the dotfiles prototype.
Browser installation is explicit; no install script downloads one automatically.
Use `viewrule install-browser --with-deps` for Linux CI system dependencies.

## Review and teach

1. Define the task, representative data, routes, readiness selectors, and viewports.
2. Add a few scoped rules from the [manual](docs/ui-review.md). Defaults do not
   invent a universal density target or infer which components should align.
3. Run `viewrule check`. Read the findings and inspect the affected detail tiles
   at original size. A scaled-down 4K overview cannot establish label legibility.
4. Record the user's feedback with `viewrule feedback`. Turn measurable feedback
   into a scoped JSON rule with `viewrule learn`; retain subjective feedback as prose.
5. Repair the app and rerun. Human approval preserves the exact reference images;
   it never clears automated failures.

The CLI suggests remediation but **does not edit application code**. Agents may
propose changes and verify them through the same loop. Automatic repair is deferred
until measurements are reliable enough to avoid optimizing the wrong thing.

## The density limit

The current box-coverage check can be satisfied by stretching a table while leaving
large gaps between related values. Text coverage avoids counting empty table boxes,
but still cannot establish useful information density. Pair coverage with visible
comparison identities, legibility, and visual review. Improving this is the first
[roadmap](ROADMAP.md) item; it is not a solved capability in this release.

## Documentation

| Document | Purpose |
| --- | --- |
| [Design rules](docs/design-rules.md) | Stable DR-001–DR-008 requirements |
| [Detection and enforcement](docs/ui-review-enforcement.md) | Rule mapping, measurements, confidence, and limits |
| [CLI and configuration](docs/ui-review.md) | Rule fields, feedback, capture, and exit codes |
| [Architecture](docs/architecture.md) | Boundaries, modules, data flow, and state |
| [Lifecycle](docs/lifecycle.md) | Review, learning, versioning, release, upgrade, and rollback |
| [Integrations](docs/integrations.md) | Dotfiles, Claude, other agents, and application CI |
| [Contributing](CONTRIBUTING.md) | Development and the single regression workflow |
| [Security](SECURITY.md) | Trust boundaries and reporting |

MIT licensed. No hosted service, account, model API key, or telemetry is required.
The browser loads your configured application, which can make its own network requests.

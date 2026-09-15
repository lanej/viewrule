# Impeccable diagnostics

Viewrule delegates general source diagnostics to **Impeccable CLI 4.1.0 / engine
0.1.5**, installed as a pinned runtime dependency. Viewrule retains application
requirements, rendered measurements, state/viewport comparisons, and evidence.
The detector runs without an agent, model API, or browser for local source targets.

This built-in integration and `lint` command are unreleased. From a source checkout,
run `npm ci`, then `node bin/viewrule.mjs lint --project /path/to/app --target src`.
The published 0.5.1 engine supports the manual command adapter described below.

## Quick checks

```sh
viewrule lint --target src
viewrule lint --target src/components/Card.tsx --target src/styles.css
```

No Viewrule initialization, running app, or Chromium installation is needed.
Targets are local files/directories inside the selected project. A supplied
`--target` runs bundled Impeccable on those paths. Without `--target`, `lint` uses
configured `sourceChecks`; if that setting is absent, it scans `.` with Impeccable.
An explicitly empty or fully disabled provider list produces a setup error rather
than a successful empty scan. Focus targets on UI source for routine work.

The JSON includes findings, raw diagnostics, elapsed time, the actual CLI/engine
versions, executable SHA-256, and `coverage: "source-only"`. Its status uses the
same advisory/blocking rules as `check`: exit 0 allows warnings, exit 1 means a
configured blocking error, and exit 2 means an incomplete scan or setup failure.
`renderedRequirements: "not-assessed"` stays explicit. `lint` writes no review state,
approval, or captures and cannot satisfy an opted-in Stop hook.

Use `lint` for source diagnostics; use `check` when rendered application requirements
need verification. Agents should repair actionable findings within the user's scope.
A full design critique is a separate task. Neither a clean source scan nor a browser
pass establishes overall design quality.

## Project configuration

New `init` configurations include this advisory provider. Existing configurations
are preserved; add it explicitly to include Impeccable in their rendered reviews:

```json
{
  "sourceChecks": [{
    "id": "impeccable",
    "format": "impeccable",
    "targets": ["src"],
    "authority": "advisory"
  }]
}
```

The executable comes from Viewrule's dependency installation, so applications need
no additional package or executable path. Missing/unsupported platform packages fail
explicitly; reinstall Viewrule with npm's `--include=optional` option. Checks never
install skills/hooks, download a binary, or select `IMPECCABLE_BIN`/user-cache overrides.
The built-in source scan has a 30-second limit; interruption is an operational failure.

Normal scans respect Impeccable's project configuration, inline ignores, and design
context. `noConfig: true` requests its raw baseline scan without those mechanisms.
Keep exceptions narrow and intentional. The built-in provider's targets and local
`DESIGN.md`, `.impeccable/config.json`, `.impeccable/config.local.json`, and
`.impeccable/design.json` participate in rendered-review freshness, including when
the settings are ignored by Git. Provider/rule changes remain visible in the contract.

Opinions default to warnings. `authority: "advisory"` never blocks, including with
an error severity mapping. Deliberate enforcement uses `authority: "blocking"` and
`severityMap: { "warning": "error" }`; this maps every warning from that provider,
so calibrate its scope first. Font popularity is an opinion, not a universal defect.

## Existing command adapters

Existing configurations with `command` remain supported. They resolve the executable
specified by the application and are not the bundled-provider path. For example,
an application that separately pins `impeccable@4.1.0` may retain:

```json
{
  "id": "impeccable",
  "format": "impeccable",
  "version": "4.1.0",
  "authority": "advisory",
  "command": ["node", "node_modules/impeccable/cli/bin/cli.js", "detect", "--json", "--no-config", "src/"]
}
```

Choose either `command` or built-in `targets`, never both. Explicit command
providers own their executable pin, limits, and configuration/source fingerprint
scope. No existing application is silently migrated.
The browser-free behavior applies to built-in local targets; an external provider
executes its configured command and may have additional runtime requirements.

## Findings and validation

Impeccable's `antipattern`, `name`, `description`, and `snippet` become Viewrule's
rule ID, message, rationale, and observed evidence. File/line/column and original
severity remain available. Raw JSON and stderr stay in `sourceChecks[].execution`.
`check` includes normalized source findings in its terminal JSON and saved reports.

Impeccable exit 2 means a completed scan with primary findings; exit 1 means an
operational failure even with partial JSON. Missing or malformed output fails
explicitly. The adapter translates these into Viewrule's documented exit codes.

The installed-CLI regression exercises the bundled detector without browser setup,
a rejected/passing CSS pair, advisory and blocking behavior, missing targets,
configuration freshness, and preservation of browser-review state. This verifies
integration, not comparative design quality.

Provider reference: [Impeccable detector documentation](https://impeccable.style/docs/detector/).

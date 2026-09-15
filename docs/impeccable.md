# Impeccable source checks

Install and lock the tested provider in the application repository:

```sh
npm install --save-dev --save-exact impeccable@4.1.0
npx --no-install impeccable --version
```

Add this entry to `.ui-review/config.json` alongside the existing rendered review:

```json
{
  "sourceChecks": [{
    "id": "impeccable",
    "format": "impeccable",
    "version": "4.1.0",
    "authority": "advisory",
    "command": ["node", "node_modules/impeccable/cli/bin/cli.js", "detect", "--json", "--no-config", "src/"]
  }]
}
```

This runs the actual source scanner, without a browser or URL scan. Impeccable
4.1.0 uses its pinned platform engine 0.1.5; retain the application's lockfile.
`--no-config` deliberately disables Impeccable's project configuration, inline
ignores, and DESIGN.md interpretation for a reproducible baseline. Remove that
flag deliberately if the project wants those mechanisms; the report records the
command, and the contract records changes. Include those configuration files in
Viewrule's `sourcePaths` so their edits invalidate an earlier pass.

The native format maps `antipattern` to the rule ID, `name` to the message,
`description` to the rationale, and `snippet` to observed evidence. File, line,
column, and original severity remain available. Exact raw JSON and stderr are
preserved under `sourceChecks[].execution` in the local report.

Impeccable exit **2** is a completed scan with primary findings. Exit **1** is an
operational failure, even when stdout contains `[]` or partial findings. Viewrule
turns that failure into setup exit 2 and leaves an opted-in hook blocked.
Malformed or missing JSON also fails explicitly. A clean scan emits `[]` and exit 0.
The generic Viewrule provider format keeps its existing 0/1 exit convention.

Opinions default to warnings. `authority: "advisory"` never blocks, including when
a severity mapping produces `error`. To deliberately enforce provider warnings,
use `authority: "blocking"` together with `severityMap: { "warning": "error" }`.
That mapping applies to every warning from this command: scope and calibrate the
scan before adopting it. Font popularity is an opinion, not a universal defect.

The installed-CLI regression scans a synthetic CSS file using the locked provider:
Inter produces `overused-font`; Georgia produces a clean scan; a deleted target
produces operational failure. It verifies provenance, raw diagnostics, advisory
and blocking behavior, and hook recovery. This demonstrates integration, not
comparative detector quality or semantic design correctness.

Provider reference: [Impeccable source and CLI documentation](https://github.com/pbakaus/impeccable).

# Authoring a design boundary

Start with the user's decision, the concrete rejected condition, and an acceptable
alternative. A rule should distinguish those outcomes while permitting other good
solutions. In Claude Code, use `/viewrule:add-rule`; it uses these installed commands.

## Read the contract before implementation

```sh
viewrule contract
viewrule guidance
viewrule schema --type min-size
```

`contract` validates and prints the effective merged rules, configuration, policy
hash, and differences from the previous completed report. It needs no running app
or browser. `guidance` supplies qualitative defaults, personal preferences, and feedback.
Identify the task, critical comparisons, blocking constraints, warnings, and choices
requiring judgment before selecting a layout. Configured selectors define the
meaningful groups; the engine does not infer them from React component names.

## Add a scoped rule

Save one JSON object, for example `export-control.json`:

```json
{
  "id": "export-control-size",
  "type": "min-size",
  "selector": "[data-action=export]",
  "pages": ["comparison"],
  "minWidth": 32,
  "minHeight": 32,
  "severity": "error",
  "reason": "This frequently used export control must retain a 32 CSS px footprint.",
  "designRules": ["DR-007"]
}
```

The 32px threshold is an application choice. The page name must exist in the
project config. Place the selector on the actual control, not its decorative icon.

```sh
viewrule add-rule --rule export-control.json --dry-run
viewrule add-rule --rule export-control.json
viewrule check
```

The preview validates the schema, page/viewport scope, and ID without writing.
Addition locks the local rule file, revalidates, and writes atomically. An ID already
present locally or globally is rejected; this command cannot silently replace an
inherited constraint. It writes project rules only. Selector validity and actual
visible evidence are checked in the browser. Missing required evidence fails.

Exercise the rejected and acceptable states in the application's representative
workflow. Assert the specific rule, actual/expected values, and DR citation. For a
responsive boundary, include the largest relevant viewport and inspect native-scale
details. A failing unrelated accessibility check does not prove the new rule works.
Keep thresholds calibrated to the task; never manufacture data to satisfy a count.

## Refine an existing rule

Use the person's actual feedback on a specific report with `feedback`, then `learn`
with its returned ID and the replacement JSON object. The feedback skill implements
this path. It records provenance; the program does not invent thresholds from prose.
Shared preferences require explicit global scope. Purely qualitative feedback can
remain guidance.

Every new report saves its full contract. JSON/HTML reports identify added, removed,
and modified rules with before/after values, configuration changes, and a changed
policy document. Application fixes and boundary changes are therefore distinguishable.
The next comparison uses the immediately previous completed report, including failed
runs. An interrupted run retains that pointer. Initial runs or missing/legacy
snapshots disclose that no comparison is available.

This is a review aid, not an immutable approval system: a later unchanged rerun has
no new delta, and local files remain editable. Inspect the rule diff in source control
when accepting a change. A passing check never constitutes human approval of a new
boundary. Existing source/rule freshness and opt-in Stop behavior still apply.

## Add a new measurement to Viewrule

Use `schema` to check whether an existing measurement already expresses the boundary.
For a new measurement, update the schema in `src/config.mjs`, the browser observation
in `src/checks.mjs`, DR mapping/remediation in `src/design.mjs`, internal types, and
the rule manual. Keep browser code independent of module closures and Node APIs.
Extend the existing installed regression with concrete rejected/accepted evidence.
The CLI does not load arbitrary detector code from application projects.

Read [research and defaults](design-principles.md) before promoting a scoped rule
into a default. Document its source, units, exceptions, severity, and measurement
limits; a general principle alone does not justify a universal numeric threshold.

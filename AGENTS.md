# Working on Viewrule

Viewrule turns scoped UI expectations into browser measurements, cited findings,
and a human feedback loop. Read [README.md](README.md) for purpose and commands,
[architecture](docs/architecture.md) for ownership, and the affected rule docs before
changing behavior. For code review, read [REVIEW.md](REVIEW.md).

## Working boundaries

- Keep the engine, schema, policy, and reports here. Personal defaults belong in
  dotfiles; application selectors, thresholds, and approvals belong in the app.
- The Claude plugin is a CLI client. Keep its skills concise, use installed engine
  docs, and bump its manifest version for updates; never install from a Stop hook.
- Node 22+ and npm are required. Use ES modules and existing dependencies; no
  compilation step or lint script is configured. Keep `src/` modules internal.
- Browser-side `inspectPage` runs through Playwright evaluation: keep it serializable
  and independent of Node APIs and module closures.
- Prefer small changes to the relevant layer. Do not add a hosted service, database,
  model dependency, plugin framework, or automatic source repair without a request.

## Measurement and evidence

- State a measurement's scope, units, expected outcome, and limits. Cite applicable
  DR IDs. Update the schema, evaluation, policy mapping, and manual together.
- Keep missing required evidence and unassessed requirements explicit. Optional
  selectors do not establish coverage; metadata alone cannot certify rendered chart truth.
- Use CSS viewport dimensions and native-scale capture details. Preserve comparison
  identities and readable type when adapting to larger viewports.
- Treat density as a proxy. Empty stretched space or smaller unreadable type must
  not be described as more useful information. Respect task-appropriate whitespace.
- Never weaken rules, modify evidence, or invent human approval to obtain a pass.
  Learning a rule records supplied JSON and provenance; it does not infer intent.

## Validation

```sh
npm ci
npm run browser:install
npm test
```

Run the affected detector once after behavioral changes; repeat only after a
failure or further implementation changes. `npm test` packs and installs the CLI
through an isolated plugin copy, then exercises one workflow. Extend that detector
for a demonstrated regression; do not add helper tests, snapshots, or viewport/edge-case matrices.

For documentation and instruction changes, check links, examples, frontmatter/imports,
and the diff. Do not add a test suite or run a local browser regression just for prose.
For JS syntax-only changes, use `node --check` on the affected files. Report commands
actually executed and any unavailable validation; never infer a test pass from code.
`VIEWRULE_BROWSER_PATH` can select an available Chromium when the pinned one cannot
run; disclose the substitution.

## Compatibility and delivery

Preserve the CLI, schema versions, `.ui-review` directory, legacy aliases, exit codes,
and opt-in hook behavior unless the task explicitly changes them. Keep user data out
of the installed package. Dependency changes must update `npm-shrinkwrap.json`.

Keep instructions concise and point to conditional detail instead of repeating it.
Do not invent approvals or exceptions to user instructions. Describe the problem,
resulting behavior, validation, and material limits in the PR. Do not add `[release]`
to a commit unless publishing a version is intended; see [lifecycle](docs/lifecycle.md).

# Contributing

Start with a concrete interface problem, its task, a rejected layout, and an accepted
layout. Explain the relevant DR ID and how the proposed measurement distinguishes
the two. A new arbitrary score is not enough.

## Guidance and evidence

For advice that cannot be enforced without task judgment, add to the existing
[guide](plugins/claude-code/guide/v1/index.md). Follow its
[contract and template](plugins/claude-code/guide/v1/authoring.md): cited evidence,
explicit applicability/limits, original good and bad examples, and measurable scope.
`npm run guide:check` validates structure and links; `npm run site:build` renders
human pages and publishes the same Markdown bytes. Neither verifies evidence quality.
Keep one corpus and use the existing gallery and installed regression.

## Development

Use Node 22.18 or newer for development tooling; CI uses the current Node 22 release.

```sh
npm ci
npm run format
npm run check
npm run browser:install
npm test
```

`npm run format` applies Prettier; `npm run format:check` reports formatting drift.
`npm run lint` runs ESLint with zero warnings, and `npm run analyze` runs TypeScript's
`checkJs`/`noEmit` analysis over the engine, launcher, plugin adapter, demo, and tests.
`npm run check` runs all three and gates CI before the browser workflow. Analysis
uses inference and internal JSDoc contracts; it is incremental (`strict: false`),
so untyped JSON and parameters still limit coverage. Ajv validates runtime inputs.
No compilation or generated JS is needed.

Keep substantial markup in the Mustache HTML templates: `src/templates/` for installed
reports, `test/templates/` for fixtures and the demo gallery. Mustache escapes values
by default; the policy's formatted body escapes text before adding fixed tags. Keep
fixture React logic in `test/react/Comparison.jsx`, so it receives code checks.

Use `VIEWRULE_BROWSER_PATH=/absolute/path/to/chromium` only when the pinned browser
cannot run in the environment; report that substitution. Supported CI uses the
browser associated with the pinned Playwright dependency.

`npm test` packs the CLI and installs it through an isolated copy of the Claude plugin.
The same representative workflow verifies checksum rejection and hook opt-in, then:
a comparison loses information and changes its period at 4K; findings cite policy;
human feedback becomes a rule; the fixture is repaired; detail capture is complete;
and a subsequent source change invalidates the passing review. The temporary app
and browser run in the same process environment. Test output is standard Node TAP.
The copied plugin uses the fixture's archive URL/checksum; production pins are unchanged.
Claude's skill selection and visual judgment require a real agent session to assess.

Keep one regression detector for this workflow. Extend it when a real regression
requires stronger evidence; do not add helper tests, pixel snapshots, viewport
matrices, or repeated assertions that mirror implementation. Documentation-only
changes need link/syntax/diff review, not another browser run. Stop verification
once the concrete risk is resolved.

The [fixture corpus](test/README.md) asserts specific violations in the shipped
presets, two clean React compositions under the same contract, rejection of empty stretching, and a clean finite
comparison with whitespace. Add cases for concrete missing claims; passing examples
must genuinely pass without weakening the rules merely to fit the fixture.
These checks establish scoped geometry and identity contracts, not a universal
information-density benchmark or automated graphical truth.

## Change checklist

Use [REVIEW.md](REVIEW.md) for the shared review rubric. [AGENTS.md](AGENTS.md)
defines coding-agent instructions, imported by `CLAUDE.md`. The project Claude
`code-reviewer` agent can inspect a supplied diff with file-reading tools; GitHub
Copilot receives the concise instructions in `.github/copilot-instructions.md`.
These files guide requested reviews; they do not configure automatic reviewers.

- Keep measurements scoped and report actual/expected values with actionable selectors.
- Update the schema, policy mapping, manual, and changelog together when behavior changes.
- Preserve explicit unassessed coverage; do not turn missing evidence into a pass.
- Keep personal data, captured production screens, and credentials out of fixtures.
- Use small pull requests with the user-visible problem, resulting behavior, and
  relevant validation. Do not bundle unrelated redesigns or dependency upgrades.

Dependencies are intentionally few and pinned. Refresh the shrinkwrap when they
change and test the packaged CLI. Internal modules are not a supported library API.

## Governance

The repository owner maintains releases and decides compatibility changes through
reviewed pull requests. Contributors retain copyright and license contributions
under MIT. No contributor license agreement is required. Discuss measurement
tradeoffs respectfully and use reproducible examples; disagreement about taste
should remain guidance unless it can be expressed as a useful scoped expectation.

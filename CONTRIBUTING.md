# Contributing

Start with a concrete interface problem, its task, a rejected layout, and an accepted
layout. Explain the relevant DR ID and how the proposed measurement distinguishes
the two. A new arbitrary score is not enough.

## Development

```sh
npm ci
npm run browser:install
npm test
```

Use `VIEWRULE_BROWSER_PATH=/absolute/path/to/chromium` only when the pinned browser
cannot run in the environment; report that substitution. Supported CI uses the
browser associated with the pinned Playwright dependency.

`npm test` packages and installs the CLI before running one representative workflow:
a comparison loses information and changes its period at 4K; findings cite policy;
human feedback becomes a rule; the fixture is repaired; detail capture is complete;
and a subsequent source change invalidates the passing review. The temporary app
and browser run in the same process environment. Test output is standard Node TAP.

Keep one regression detector for this workflow. Extend it when a real regression
requires stronger evidence; do not add helper tests, pixel snapshots, viewport
matrices, or repeated assertions that mirror implementation. Documentation-only
changes need link/syntax/diff review, not another browser run. Stop verification
once the concrete risk is resolved.

The current density assertion verifies its documented geometric proxy; it is not
an accepted design benchmark. The stretched-table counterexample in the roadmap
must guide the next substantive detector change.

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

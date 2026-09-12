# Lifecycle

## Application review

1. **Initialize:** `viewrule init --url ...` creates `.ui-review` schema version 1
   with Stop enforcement off. Pick representative state and calibrated rules.
2. **Measure:** start the app, run `viewrule check`, and inspect the HTML report.
   Exit `0` permits warnings, `1` reports failed checks/captures, and `2` reports
   usage or configuration errors. `latest.json` remains non-passing after interruption.
3. **Interpret:** inspect full-resolution details and evaluate task usefulness.
   Required design-rule coverage means an applicable check ran with visible
   evidence; it does not certify the entire design principle.
4. **Record:** `viewrule feedback --report ... --decision adjust|approve --note ...`.
   Use the person's actual feedback against the report they saw. Approval saves
   references but does not bypass a failing rule.
5. **Learn:** write a rule and run `viewrule learn --feedback ID --rule FILE`.
   This validates supplied JSON and links provenance. It does not infer thresholds.
   Rejected and accepted examples establish whether a proposed rule helps.
6. **Enforce:** opt into the Claude hook, or run the CLI in application CI.
   Recheck after source, configuration, tool, data, or environment changes.

Subjective feedback remains guidance. A false positive should prompt a scoped rule
correction with an explanation; never silently loosen a rule solely to obtain a pass.
Use warnings while calibrating uncertain measurements, then promote a rule to an
error when its expectation is justified for the task and viewport.

## Distribution and compatibility

The source repository and versioned GitHub Release tarballs are the initial
distribution channels. npm registry publication is a separate future decision.
The package includes its policy docs and `npm-shrinkwrap.json`, which pins the
installed dependency tree. It contains no personal settings or review screenshots.

`viewrule` is canonical. The `ui-review` command, `.ui-review` project directory,
`UI_REVIEW_GLOBAL_DIR`, and `UI_REVIEW_BROWSER_PATH` remain supported in 0.1.
New environment names are `VIEWRULE_CONFIG_DIR` and `VIEWRULE_BROWSER_PATH` and
take precedence. The directory retains its old name to avoid unnecessary migration.

Version `0.x` means experimental, not permission to change behavior silently:

| Change | Version policy |
| --- | --- |
| Fix an incorrect measurement without changing the documented contract | Patch, with release notes describing possible result changes |
| Add a compatible rule or command | Minor |
| Break CLI/config/report compatibility before 1.0 | Minor, with a migration guide |
| Break a stable contract after 1.0 | Major |

Config and report currently use `version: 1`. Unsupported config versions fail
validation. Changing rule meanings or thresholds is reviewable; no release rewrites
an application's rules or approvals automatically. DR IDs remain stable; changed
wording is included in the policy hash and old reports retain their policy text.

## Maintainer release

1. Update `package.json`, run `npm install --package-lock-only` to refresh the
   existing shrinkwrap, and write `CHANGELOG.md`. Include migration notes when needed.
2. Review the change through a pull request. `npm test` packs the distribution,
   installs it into an isolated prefix, and runs the one representative workflow
   through that installed executable. It leaves the tested tarball in `dist/`.
3. Publish the reviewed version change to `main` with `[release]` in the final
   commit message (for a squash merge, include it in the PR title). Initial source
   publication follows the same contract. Commits without that marker do not release.
4. The main-branch regression job installs the pinned browser, tests the package,
   and uploads **that tested tarball**. Only after success does it call `release.yml`,
   which downloads the same artifact, creates SHA-256 checksums, and publishes a
   GitHub prerelease with tag `v<package-version>` targeting the tested commit.
   The release job does not repack or rerun the regression workflow.
5. Update the dotfiles pin in a separate review: version, archive URL, and checksum.
   App projects can adopt on their own schedule. Do not use an unversioned latest URL.

Release automation needs Actions enabled and `contents: write` on the release job.
Do not move a published tag or replace its assets; issue a patch release. The
workflow refuses to overwrite an existing release. See the
[GitHub release command](https://cli.github.com/manual/gh_release_create) and
[npm shrinkwrap documentation](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/).

## Upgrade, rollback, and removal

For standalone installs, download a versioned release archive and its checksums,
verify the archive, then `npm install --global ./viewrule-<version>.tgz` and
`viewrule install-browser`. Reinstall an older archive to roll back and rerun the
review. Older reports do not automatically become current after a rollback.

Dotfiles installs use isolated version directories and switch the active symlink
only after installation succeeds. A local development checkout can be selected
with `VIEWRULE_DEV_DIR`; unset it to resume the installed version. See
[integrations](integrations.md) for the exact setup.

`npm uninstall --global viewrule` removes a standalone CLI. Removing the dotfiles
integration removes its wrappers and installation directory only. Project rules,
feedback, and approved references are retained unless the user deletes them.
Run folders are disposable; remove obsolete runs when space is needed. After
deleting a run referenced by `latest.json`, rerun before relying on its hook state.
Viewrule does not delete shared Playwright browser caches on uninstall.

## Failure handling

Invalid rules stop execution. Missing selectors fail unless explicitly optional.
Incomplete detail coverage and navigation/capture errors fail. Stale or missing
passing evidence blocks an opted-in hook. Install failures leave the prior version
active. Remediation advice never mutates source or evidence.

First diagnose the report's actual selector, viewport, observation, and expectation.
Do not infer that all of DR-001–DR-008 are satisfied from a green exit code. A
repair must improve the intended task, not merely a measured proxy.

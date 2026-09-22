# Optional Git review gates

Run `viewrule check` deliberately while developing a UI. Inspect its full-resolution
evidence and resolve findings before delivery. Viewrule no longer blocks Claude's
Stop event. A response can end while work is incomplete or needs human input.

`verify`, `pre-commit`, and `pre-push` are new engine commands in this source change.
The plugin's existing 0.7.1 engine pin does not contain them. Use a built/installed
engine containing these commands, or invoke this checkout's `bin/viewrule.mjs`
with Node after installing dependencies. Use that same engine for `check` and Git
verification. Plugin 0.7.4 removes Stop registration independently of the engine pin.

## Choose a delivery boundary

- **Explicit review:** `viewrule check --project apps/web` captures and measures the
  running application. `viewrule verify --project apps/web` checks existing evidence
  without a browser and fails if it is missing, failing, stale, or incompatible.
- **Pre-commit:** an optional local check of the staged UI inputs. It can interrupt
  checkpoint commits, so enable it only when that fits the project's workflow.
- **Pre-push:** an optional local check of the commits actually being pushed. It
  allows incomplete local commits while providing feedback before sharing work.
- **Application CI:** run a full browser review for the affected frontend at the
  proposed commit and require its status before merging. Local hooks are a convenience;
  they are not installed automatically or an alternative to the required CI check.

The Git commands inspect existing evidence. They never install an engine, start a
server/browser, create a report, stage files, stash changes, or modify the index.
They return JSON and exit `0` for a passing review or unrelated changes, `1` for
failed verification, and `2` for usage or Git/configuration errors. JSON `status`
distinguishes `pass`, `skip`, and `fail` and identifies each application/ref checked.

## Frontend paths and shared inputs

Each `--project` names a configured application, wherever it lives in the checkout.
Without it, the nearest configured ancestor of the current directory is selected.
From the repository root, explicitly select nested applications:

```sh
viewrule pre-commit --project apps/web --project apps/admin
```

The gate examines changed paths against the selected application's `sourcePaths`,
`reviewScopes`, source-provider targets and context files, project documents, configuration, rules,
and checkpoint/authentication setup. Renames include both the old and new paths.
Unrelated changes skip verification even when there is no UI report. Both the old
and target configuration participate in path selection, so narrowing a scope cannot
hide its staged changes. Git verification requires the configuration in the target
tree; commit the nonsecret setup described in [worktrees](worktrees.md).

For a frontend that imports shared code outside its directory, place the review
configuration at their common ancestor and include every UI dependency. For example,
a repository-root configuration can use:

```json
{
  "sourcePaths": ["apps/web/src", "apps/web/public", "packages/ui", "package.json", "package-lock.json"]
}
```

This is a configuration excerpt; keep the rest of the application's contract.
Narrow source-provider targets as well: a provider targeting `.` deliberately
includes the whole application directory even when `sourcePaths` is narrower.
Use existing [review scopes and dependencies](incremental-review.md) for multiple
frontend states sharing one contract. A path outside the application boundary is
not implicitly included by a nested configuration.

## Opt into an existing hook

Preserve the repository's hook manager and other checks. Add the command to its
existing pre-commit or pre-push entrypoint. Check `git config --get core.hooksPath`
before choosing a hook location. For a plain Git pre-commit hook:

```sh
#!/bin/sh
set -eu
viewrule pre-commit --project apps/web
```

For a plain Git pre-push hook:

```sh
#!/bin/sh
set -eu
viewrule pre-push --project apps/web "$@"
```

Use an installed executable that is available in the Git client's environment, or
an absolute Node/engine path. Git invokes these hooks from the checkout root, so
the application paths above are repository-relative. Pre-push must receive Git's
remote arguments and ref updates on stdin unchanged. If another hook consumes
stdin, use the hook manager's fan-out support; do not pipe already-consumed input
to this command. Repeat `--project` in the single invocation for multiple apps.
See [Git's hook contract](https://git-scm.com/docs/githooks).

## Staged and pushed contents

The existing report proves the reviewed working files. Before accepting it, the
gate requires the relevant Git-visible working files to match the **index** for a
commit, or each **outgoing commit tree** for a push. It compares file content and
mode, including symlink targets. It honors Git's alternative index for partial
commits. An unstaged frontend fix therefore cannot certify a broken staged file.

When they differ, finish choosing the staged contents, make the reviewed UI inputs
match them, then run `viewrule check --project ...`. The gate prints the first
differing path and leaves all files untouched. Unrelated unstaged backend changes
do not require cleanup. Relevant untracked, nonignored source files must also be
accounted for. Git filters or line-ending conversion that make working bytes differ
from stored blobs require a checkout/build with matching inputs or verification in
CI; the local gate does not infer their effect on rendered behavior. Scoped Git
submodule inputs require application CI rather than a local gate verdict.

For existing remote branches, pre-push compares the advertised remote commit to
the outgoing commit. For a new branch it compares against locally known history
of that destination remote. Fetch before pushing if that history is absent or stale;
without a known baseline it conservatively treats the outgoing tree as new.
Deleting a remote ref introduces no UI and is skipped. Pushing a different branch
still verifies that branch's tree, rather than assuming the current `HEAD` is the
one being delivered.

Local verification retains Viewrule's measurement limits. Keep the application
server, environment identity, authentication, and fixture data aligned with the
reviewed checkout. A source match is not an attestation of a remote server, visual
quality, or human approval. CI should build and review the actual proposed commit.

## Migrate from Stop enforcement

The plugin no longer registers a Stop hook. Run `/viewrule:setup` after updating,
even if its engine pin has not changed. The launcher's
`setup --project <application-root>` removes recognized Viewrule Stop handlers from
user settings (`CLAUDE_CONFIG_DIR`, default `~/.claude`) and project/shared-local
settings in the application and its ancestors through the Git checkout root.
It preserves unrelated handlers in mixed groups, other events, permission settings,
file modes, and symlinks to dotfiles. Already-migrated files are not rewritten.
Cleanup precedes downloads and works with the existing released engine pin.

Setup recognizes direct `viewrule hook` / `ui-review hook`, Node invocations of their
`bin` or plugin `scripts` launchers, and simple `npx viewrule hook` invocations.
It reports combined commands and custom Viewrule wrappers for manual editing rather
than dropping checks bundled into the same handler. Invalid or unwritable settings
are left unchanged and reported. Inspect `stopHookMigration.removed` and `.manual`
in setup output. Managed policy, custom Claude `--settings` files, other checkouts,
and cached older plugin versions are outside this automatic migration; remove only
confirmed Viewrule invocations there through the owning configuration.
See Claude's [settings locations](https://code.claude.com/docs/en/settings) and
[hook configuration](https://code.claude.com/docs/en/hooks#hook-locations).

Updated standalone and plugin `hook`
entrypoints return `{}` for old manual registrations without reading state or
requiring an installed engine. `enforceOnStop` remains accepted for old configuration
files, but has no effect. Git gates require deliberate hook setup, independent of
that obsolete setting.

Reload/update the plugin and restart existing Claude sessions to discard their
cached hook registration. Remove only the old Viewrule Stop entries from manual or
dotfiles settings; preserve unrelated hooks. An older installed engine or already
running plugin copy retains its original behavior until updated or removed.

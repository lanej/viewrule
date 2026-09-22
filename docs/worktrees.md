# Git worktrees

Engine/browser installation is shared by the user. Application setup belongs to
each checkout: `.ui-review/config.json`, `rules.json`, project documents, and any
checkpoint scripts. `viewrule init` creates ordinary files in the chosen application;
it does not stage, commit, copy, or symlink them into other worktrees.

## Carry setup into a new worktree

After calibrating and reviewing the setup, commit its nonsecret files:

```sh
git add .ui-review/config.json .ui-review/rules.json .ui-review/.gitignore DESIGN.md
# Also add STYLE.md and application checkpoint/support files when used.
git commit -m "Configure application UI review"
git worktree add ../my-app-feature -b my-app-feature
```

The new branch must contain that commit. A worktree on an older branch does not
inherit later configuration changes. Untracked or ignored files are not copied by
`git worktree add`; merge or cherry-pick the setup commit into an existing branch
when appropriate. If setup must stay untracked, explicitly copy the required
configuration, rules, documents, and supporting scripts to the matching application
directory. Preserve any existing worktree-specific configuration. Do not rerun
`init` with a fresh preset to replace an already calibrated contract.

Keep `.ui-review/.gitignore` with the setup. Its generated patterns exclude
`runs/`, `latest.json`, locks, temporary files, and `auth*.json`; they do **not**
ignore configuration or rules. An outer `.gitignore`, `.git/info/exclude`, or global
ignore file can still exclude the whole directory. Diagnose that with
`git check-ignore -v .ui-review/config.json` and inspect tracked files with
`git ls-files .ui-review`. Do not force-add authentication state or bulk-add runs.
Feedback and approved references may contain private screenshots or prose; decide
deliberately whether to version them.

Run the application server for the current worktree and use the URL that server
actually reports for `viewrule check --url <actual-url>` (or set
`VIEWRULE_BASE_URL`). Do not commit a worktree-specific development port just to
make review work. Existing configured `baseURL` values remain supported, but a URL
pointing at another checkout's server can measure that checkout even when local
paths are correct. Viewrule does not probe localhost ports for this reason.
These overrides require `Runtime URL:` in the installed `viewrule --help`.
Published engine 0.7.1 uses configured `baseURL`; follow the
[compatibility workflow](ui-review.md#runtime-url-compatibility) for that engine.

## Project paths and evidence

Without `--project`, review and verification commands find the nearest ancestor
containing `.ui-review/config.json`. Discovery stops at a `.git` **file or directory**,
so it stays inside a linked worktree, submodule, or normal checkout. It never follows
the Git common directory back to the main checkout. A nearer configured application
in a monorepo takes precedence. With no configuration, the original working directory
remains the target. Git hooks should explicitly name nested applications with
`--project apps/web`; see [optional Git gates](git-gates.md).

`--project DIR` selects exactly that application root. `init` and source-only `lint`
also retain the current directory by default, so creating a nested application or
scanning relative targets does not unexpectedly affect its parent. With runtime URL
support and `APP_URL` set to the URL printed by this worktree's server:

```sh
viewrule init --project ../my-app-feature/apps/web
viewrule check --project ../my-app-feature/apps/web --url "$APP_URL"
```

Configuration paths, source scopes, documents, checkpoint scripts, and run output
are resolved against the selected application. Each worktree needs its own review;
`latest.json` and disposable `runs/` must stay local. Moving a worktree changes its
paths and can make saved evidence stale; rerun the review after the move.

Do not symlink the entire `.ui-review` directory to another checkout. That aliases
the mutable state as well as the configuration, allowing one run to overwrite the
other checkout's latest status. Viewrule rejects a review directory resolving
outside the selected application. Individually linked configuration files are
still possible, but edits would be shared and links can break on move/removal;
committed files or explicit copies preserve branch ownership.

## Optional creation hook

Git has no built-in list of files to copy or link on worktree creation. A custom
[`post-checkout` hook](https://git-scm.com/docs/githooks#_post_checkout) runs after
`git worktree add` unless `--no-checkout` is used. It also runs for ordinary checkouts
and clones, so any local bootstrap must be idempotent, preserve existing files,
and explicitly select its source and destination. Use `git rev-parse --show-toplevel`
for the current worktree; do not treat `.git` as a directory or derive the application
root from `--git-common-dir`. Preserve any existing hook or `core.hooksPath` setup.

Viewrule does not install this hook. For private local setup, a user-managed hook
may copy selected setup files while leaving run state and authentication separate.
Versioning the nonsecret application contract makes the behavior work without a hook.

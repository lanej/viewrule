# Integrations

## Dotfiles

The companion integration in `lanej/dotfiles` installs a pinned Viewrule release.
It supplies `VIEWRULE_CONFIG_DIR=~/.files/claude/ui-review` when launching the tool,
so existing personal preferences, feedback, and rules keep their location. It does
not ship another copy of the engine. The installer uses the exact release URL and
checksum committed in dotfiles; development-checkout mode selects a local source tree.

```sh
cd ~/.files
make ui-review
ui-review --version
```

To work on both repositories locally:

```sh
cd ~/src/viewrule
npm ci
npm run browser:install
export VIEWRULE_DEV_DIR="$PWD"
cd /path/to/app
~/.files/bin/ui-review check
```

`VIEWRULE_DEV_DIR` must be exported in the environment launching Claude to affect
its hook. Unset it to resume the pinned install. Use `viewrule guidance` to inspect
the effective preferences when invoking a standalone install separately from dotfiles.

## Claude Code

Configure a Stop hook to execute an absolute path to `viewrule hook`, or keep the
existing dotfiles command `"$HOME/.files/bin/ui-review" hook`. The command reads the
Claude JSON payload on stdin and writes `{}` or a JSON block decision on stdout.
It does no browser work. Projects opt in with `enforceOnStop: true`; `init` defaults
to false. Hook continuation is allowed through to prevent infinite loops.

The standalone launcher handles opted-in verification errors as block decisions.
The dotfiles wrapper also handles a missing installation. Keep enforcement in app
CI when it must be mandatory; a coding-agent Stop hook is an iteration aid.
Claude's hook configuration belongs in the agent's settings, outside the tool.

## Any coding agent

Use the same CLI from Claude, Codex, an editor, or a shell. Guidance for a project
instruction file can be ordinary prose:

> Before UI changes, read Viewrule guidance and the project's approved references.
> After changes, run Viewrule, inspect affected tiles at original size, and explain
> remaining findings. Preserve the user's feedback against the exact report they
> reviewed. Do not weaken expectations or record model self-approval to obtain a pass.

No MCP server is necessary for the initial integration. The CLI's JSON and exit
codes provide the machine interface; HTML provides the human review surface.

## Application CI

Install a checked, versioned tarball as a development dependency and commit the
application lockfile. Then CI can run:

```sh
npm ci
npx --no-install viewrule install-browser --with-deps
# Start your app with deterministic fixture data and wait for readiness.
npx --no-install viewrule check
```

Configure startup for the actual application; Viewrule does not execute arbitrary
startup commands from its JSON config. Upload `.ui-review/runs/` on failure, taking
care with private application data. A required status check is configured in the
application repository, not by this CLI.

Use the same Node, pinned Playwright browser, fonts, routes, and fixture state when
comparing results. Choose CSS viewport dimensions that represent the intended
browser windows; a monitor's hardware resolution can differ substantially.

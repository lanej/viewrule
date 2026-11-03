# Coding-agent integration

Viewrule's supported execution boundary is its local CLI. Coding agents share the
same `.ui-review` contract, guide, measurements, reports, exit codes, and human
feedback rules. No agent-specific model, service, or credentials are required.

## Codex

The self-contained [Viewrule Agent Skill](../skills/viewrule/SKILL.md) includes a
small entrypoint, on-demand workflows, offline guidance, and a checksummed engine
launcher. Install the **whole** `skills/viewrule` directory, not only SKILL.md.

For a user-local installation from a checkout:

```sh
git clone https://github.com/lanej/viewrule.git "$HOME/.local/share/viewrule-source"
mkdir -p "$HOME/.agents/skills"
ln -s "$HOME/.local/share/viewrule-source/skills/viewrule" "$HOME/.agents/skills/viewrule"
```

Choose another checkout location if it already exists; do not overwrite an existing
skill. Alternatively, copy the complete directory into the application's
`.agents/skills/viewrule` and commit it for repository-scoped discovery. Copying the
bundle is sufficient; it has no symlinks or imports into a parent repository.

Codex CLI and the IDE extension can select `$viewrule` explicitly, for example:

```text
$viewrule set up this application for UI review
$viewrule review the shipment comparison at the running app's URL
```

Codex can also select the skill from its description. Selection is not enforcement.
Codex discovers `.agents/skills` in the current repository and `~/.agents/skills`
for user-local skills, including symlinked directories. If an installed skill does
not appear, restart Codex. See the official
[Codex skill format, discovery, and invocation documentation](https://learn.chatgpt.com/docs/build-skills).

Installation only makes instructions available. On an authorized setup request,
the skill runs its bundled launcher, using the application's actual root:

```sh
node "$HOME/.agents/skills/viewrule/scripts/viewrule.mjs" setup --project /path/to/app
```

Setup requires Node.js 22.18+, npm, download access, and a supported Chromium
installation. `--skip-browser` uses an already provisioned browser; `--with-deps`
installs Linux browser dependencies and may require elevation. No runtime install
happens during guide access, review, verification, or Git gates. The skill never
changes Codex permissions, installs hooks, edits Claude settings, or records agent
self-approval. A host's sandbox and tool availability still govern execution.

Run review from the application checkout, or pass `--project` explicitly. Do not
change into the skill folder to run application commands. The launcher resolves
its own resources independently of the current working directory and paths may
contain spaces. If the host cannot inspect saved images at native scale, report
that limitation rather than claiming a complete visual review.

## Other agents and CI

Any Agent Skills host can load the same `skills/viewrule/SKILL.md` and its relative
resources. Agents without skill discovery can read that file directly and follow
only the relevant workflow. Other hosts' automatic discovery has not been tested.
The [standalone CLI installation](../README.md#cli-other-agents-or-the-demo) remains
available for agents and CI that need commands rather than conversational guidance.
Use the same installed engine for checks and evidence verification.

The [Claude Code plugin](../plugins/claude-code/README.md) retains all five existing
`/viewrule:*` commands and its marketplace installation. Its generated workflows,
guide, engine pin, and runtime come from the portable skill; only its adapter owns
legacy Claude Stop-hook migration and its existing cache location.

## State, updates, and removal

Portable setup stores engines by version and SHA-256 under
`$XDG_DATA_HOME/viewrule/engines`, or `~/.local/share/viewrule/engines`.
`VIEWRULE_DATA_DIR` overrides this location. Claude keeps its existing
`viewrule/claude-code` location and `VIEWRULE_PLUGIN_DATA_DIR` override. Both use
`VIEWRULE_CONFIG_DIR` for personal configuration and the application's own
`.ui-review` directory for rules, feedback, and evidence. No user state is written
inside either skill bundle.

To update, review and update the source checkout or replace the copied skill as a
whole, then explicitly rerun setup if its engine pin changed. Setup does not choose
an unpinned latest version or upgrade on a failed check. Existing engine directories
remain available for rollback; an earlier skill checkout selects its recorded pin.
Remove the symlink or copied skill directory to uninstall discovery. Engine caches,
browser caches, application rules, and human feedback remain untouched.

## Maintenance and verification

`skills/viewrule/` is the authored source. Run `npm run agents:build` after changing
its workflows, shared runtime, guide, or pin. This refreshes the physical copies
required by Claude's isolated plugin cache. `npm run agents:check` fails on drift,
including stale generated files, and runs in static checks and package CI. Bump the
Claude plugin manifest whenever generated plugin content changes. Do not edit its
generated skills, guide, pin, or shared scripts independently.

The npm engine archive includes only shared guide/discovery files needed by the
CLI, not the engine-install pin. This avoids making the release checksum depend
on itself. The installable skill is distributed from the repository, and the engine
remains distributed as its checksummed release archive.

The existing installed-package workflow copies the portable skill and Claude plugin
into isolated paths with spaces. It tests offline guide access, explicit setup,
checksum rejection, preserved Claude settings under portable setup, Claude migration,
and review/feedback/freshness behavior without Claude environment variables. Codex CLI 0.166.0-alpha.1 also recognized the repo-scoped skill through its
`skills/list` protocol with no discovery errors in an isolated checkout. These
checks do not establish autonomous Codex skill selection or the quality of visual judgment.
Linux is exercised in CI; macOS and Windows remain unvalidated.

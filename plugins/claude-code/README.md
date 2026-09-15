# Viewrule for Claude Code

Design guidance and executable UI constraints for coding agents. This plugin teaches
Claude to apply design rules before UI changes, measure the rendered result, inspect
full-resolution detail, and retain your feedback. The Viewrule CLI supplies the
measurements; Claude interprets findings and makes application changes within your task.

## Install and use

Requires Node.js 22.18+, npm, and a current Claude Code with plugin support. Linux is
covered by the regression workflow; macOS and Windows have not been validated.
In Claude Code:

```text
/plugin marketplace add lanej/viewrule
/plugin install viewrule@viewrule
/reload-plugins
/viewrule:setup
```

Setup installs the checksummed engine release in `engine.json` and its Playwright
Chromium browser. It then helps configure your running application. Installing the
plugin alone makes no engine or browser download, and does not enable enforcement.
Version 0.5.1 pins the 0.5.1 engine, including decision-surface checks, project
design/style contracts, interaction checkpoints, and source-check adapters.
The default baseline checks readable text and flags clipping/oversized headers;
the analytical preset adds comparison counts, labels, context, proximity, and alignment.
The expanded defaults add control-size and prose warnings plus declared numeric alignment.
The `contract` command exposes the actual boundaries before design; reports retain
snapshots and show rule/configuration changes. `docs` also returns the authoring guide.
Setup chooses the relevant starting point and calibrates it to the task. Existing
project rules remain unchanged. The launcher's `docs` output includes the defaults guide.

| Skill | Use |
| --- | --- |
| `/viewrule:setup` | Install the engine/browser and configure the application's routes, viewports, and expectations |
| `/viewrule:review` | Apply design rules before UI work; measure and inspect the result; repair within the requested scope |
| `/viewrule:add-rule` | Read the active contract, author a scoped rule, preview/add it, and establish accepted/rejected evidence |
| `/viewrule:feedback` | Record your feedback against a specific report and translate measurable expectations into scoped rules |

Skills are available for Claude to select when relevant; explicit invocation is also
available. Selection is not guaranteed enforcement. The skills do not preauthorize
shell commands, change Claude's permissions, or record model self-approval.

## Selective guide access

The review skill consults the bundled [guide](guide/v1/index.md) before relevant
UI implementation. `node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" guide` returns
an index; `guide P-003` returns one Markdown page, and `guide E-CARBON` one evidence
record. These commands work before engine setup and without network access.
The package also includes this canonical corpus; the new engine source exposes
`viewrule guide [ID]`. The existing engine release pin is unchanged.

Guide/evidence Markdown is local to the plugin. Gallery examples and measurement
manuals live in the source/package `docs/` (find an installed package through `docs`)
or the published site. The current 0.3.1 engine pin predates the new gallery assets;
use this checkout or Pages for those runnable examples until a later engine release.
The new guide's written examples and evidence summaries are bundled offline. Public routes are `https://lanej.io/viewrule/guide/v1/index.json` and the linked
`.md` pages, produced by the existing Pages build. A PR/local build does not mean those
new routes are deployed. The human pages and raw Markdown come from the same source.

Claude cites guidance ID + corpus version, identifies source type and limits, and
states missing task assumptions. The guide does not supply automatic approval or
pretend that essential decision fields can be inferred by geometry. No new agent,
MCP service, startup corpus injection, or hook installation is introduced.

Integration verified against official [skills](https://code.claude.com/docs/en/skills#add-supporting-files)
and [plugin reference](https://code.claude.com/docs/en/plugins-reference) documentation
on 2026-09-13: plugin skills support on-demand resources and `${CLAUDE_PLUGIN_ROOT}`.
Deterministic tests verify retrieval/packaging; autonomous skill selection and useful
recommendations still require a real Claude session.

## Enforcement and existing installs

The bundled Stop hook uses the same pinned engine as the skills. Projects opt in with
`enforceOnStop: true` in `.ui-review/config.json`. Missing, failing, or stale evidence
blocks the first Stop; hook continuation is allowed to avoid loops. An unconfigured
project needs no installed engine. The hook never installs software or launches a
browser. Use a required application CI check when a pass must gate merging.

Keep only one Viewrule Stop hook active. If using the older dotfiles hook, remove
that specific entry from Claude settings when enabling this plugin. Preserve other
hooks. The dotfiles `ui-review` CLI can remain installed for shell use.

The plugin inherits `VIEWRULE_CONFIG_DIR` (and its legacy alias), so personal defaults
can remain in dotfiles. To keep the existing dotfiles preference location, set
`VIEWRULE_CONFIG_DIR` to the absolute path of `~/.files/claude/ui-review` in the
environment launching Claude or Claude's `env` settings. Without that setting the
engine uses its standard `~/.config/viewrule` location (or `$XDG_CONFIG_HOME/viewrule`).
The plugin deliberately uses its release pin; the dotfiles `VIEWRULE_DEV_DIR`
override does not change the plugin engine.

## Storage, updates, and removal

Runtime installs live under `$XDG_DATA_HOME/viewrule/claude-code`, falling back to
`~/.local/share/viewrule/claude-code`. `VIEWRULE_PLUGIN_DATA_DIR` overrides that root;
use the same environment for skills and hooks. Each engine version/checksum has its
own directory. Downloads are verified before npm runs, install scripts are disabled,
and a completed installation is moved into place atomically. Setup failure preserves
older versions. Repeating setup reuses the engine and can retry browser installation.

Update the marketplace and plugin through Claude's plugin manager, then reload and
run setup if the engine pin changed. Maintainers bump the plugin manifest version for
plugin changes; changing `engine.json` also requires that bump. The engine is released
separately. Roll back using an earlier plugin checkout with `--plugin-dir`; its pin
selects the corresponding retained engine. Rerun review after changing versions.

Uninstall with `/plugin uninstall viewrule@viewrule`. The runtime root, shared browser
cache, and application `.ui-review` feedback/references remain. Remove runtime folders
manually if no longer needed; uninstall does not delete application state. An
interrupted setup can leave `install.lock` and `.install-*` in the runtime root;
remove those only after confirming no setup is running.

## Local development

From a Viewrule checkout, run `claude --plugin-dir ./plugins/claude-code`, then use the
same skills. This still uses the release pin. The launcher also accepts `docs` to
print documentation paths from that installed engine, and forwards other commands
and exit codes to the CLI. `setup --skip-browser` supports an already provisioned
browser; `setup --with-deps` includes Linux system dependencies and may need elevation.

`npm test` in the repository packs the current engine, copies the plugin in isolation,
and substitutes that test archive's URL/checksum in the copied pin. The one workflow
exercises installation, shipped presets, rejected and passing layouts, feedback,
repair, and stale-result enforcement.
This verifies executable behavior, not Claude's skill selection or visual judgment.
Use `claude plugin validate ./plugins/claude-code` and
`claude plugin validate .` to check plugin and marketplace manifests.

Format references: [plugins](https://code.claude.com/docs/en/plugins-reference),
[skills](https://code.claude.com/docs/en/skills),
[hooks](https://code.claude.com/docs/en/hooks), and
[marketplaces](https://code.claude.com/docs/en/plugin-marketplaces). MIT licensed.

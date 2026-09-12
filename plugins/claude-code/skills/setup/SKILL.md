---
name: setup
description: Set up Viewrule's pinned UI measurement engine and configure an application for design review.
---

Use this when the user wants Viewrule installed or configured. Run commands in the
application repository; plugin installation does not itself install Node or Chromium.

1. Check Node.js 22+ and npm. Run:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" setup`
   This verifies and installs the pinned engine and its Chromium browser. Use
   `--with-deps` only when Linux system dependencies need installation; it can require
   elevated privileges. `--skip-browser` is for an already provisioned browser.
2. Obtain the application's actual development URL and startup command from its
   instructions or current task. Start the app within the task's authorization.
   If `.ui-review/config.json` is absent, run the same launcher with
   `init --url <actual-url>` for the baseline, or add `--preset analytical` for a
   table/comparison workspace. Preserve existing configuration and rules.
3. Run the launcher with `docs` and read the returned policy and rule-reference paths.
   Configure routes, readiness selectors, source paths, representative CSS viewports,
   and task-specific expectations. Read the returned defaults documentation path.
   Adapt the preset's annotations, counts, and thresholds to the task;
   use `preset --name analytical` to inspect it for selective adoption in existing
   projects. Use stable data and comparison identities. A finite comparison can
   keep useful whitespace; do not manufacture content or maximize an occupancy score.
4. Leave `enforceOnStop` false unless the user has requested completion enforcement.
   When adopting the plugin, remove only a confirmed duplicate Viewrule Stop entry
   from the user's existing hook configuration; preserve unrelated hooks. See the
   `${CLAUDE_PLUGIN_ROOT}/README.md` for dotfiles preference configuration and migration.
5. Continue with `/viewrule:review` for the requested application. Report installation
   or readiness blockers plainly; do not substitute a passing empty configuration.

Setup leaves personal preferences and application state outside the plugin cache.
Do not modify permission settings or silently install a different engine version.

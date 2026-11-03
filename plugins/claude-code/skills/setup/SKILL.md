---
name: setup
description: Set up Viewrule's pinned UI measurement engine and configure an application for design review.
---

Use this when the user wants Viewrule installed or configured. Run commands in the
application repository; plugin installation does not itself install Node or Chromium.

1. Identify the application root in the current checkout and check Node.js 22.18+
   and npm. Run:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" setup --project <application-root>`
   Setup removes recognized legacy Viewrule Stop handlers from user settings and
   project settings up to the checkout root, preserving other hooks and permissions.
   Report `stopHookMigration.manual` entries; inspect custom wrappers and remove
   only their confirmed Viewrule Stop invocation. Do not delete combined checks,
   edit managed policy, or claim migration finished while a reported entry remains.
   Restart sessions holding an old registration. See the plugin README for scope.
   Setup then verifies and installs the pinned engine and its Chromium browser. Use
   `--with-deps` only when Linux system dependencies need installation; it can require
   elevated privileges. `--skip-browser` is for an already provisioned browser.
2. Obtain the application's actual development URL and startup command from its
   instructions or current task. Start the app within the task's authorization.
   Pass `--project <application-root>` for project commands. In a Git worktree, missing
   `.ui-review/config.json` can mean the setup was never committed or is absent on
   this branch; restore or explicitly copy the intended contract before generating
   a new one. For a genuinely new application, run the same launcher with
   `init --project <application-root>` for the baseline, or add
   `--preset analytical` for a table/comparison workspace. Do not commit the
   development server's port as setup state; retain the actual URL for rendered
   commands. Check the installed engine's `--help` first: engines whose help lacks
   `Runtime URL:` still require `init --url <actual-url>` and a configured `baseURL`.
   Explain that limitation and follow their installed docs until an explicit engine
   upgrade supports runtime URLs. Preserve existing configuration and rules.
   See `${CLAUDE_PLUGIN_ROOT}/README.md` for worktree setup.
3. Run the launcher with `docs` and read the returned policy and rule-reference paths.
   Configure routes, readiness selectors, source paths, representative CSS viewports,
   and task-specific expectations. Read the returned defaults documentation path.
   Adapt the preset's annotations, counts, and thresholds to the task;
   use `preset --name analytical` to inspect it for selective adoption in existing
   projects. Use stable data and comparison identities. A finite comparison can
   keep useful whitespace; do not manufacture content or maximize an occupancy score.
   Cover affected functional units and their assembled task view using existing
   stories or in-page regions, plus consequential disclosure/filter states. Do not
   substitute isolated-component coverage for composition evidence or create another
   rendering harness. Full review remains the default; reuse is a separate opt-in.
4. Invoke `/viewrule:design` to author or complete DESIGN.md before UI implementation.
   A generated scaffold is not an accepted contract. Preserve existing design/style
   sources; explicitly migrate existing configurations without dropping references.
   Read-only audits report missing intent rather than creating it to clear a finding.
   Run `contract` and summarize the effective boundaries. Use `/viewrule:add-rule`
   for requested new constraints. Do not register a Stop hook or enable the obsolete
   `enforceOnStop` setting. Review remains explicit; application CI is the required
   delivery gate. Configure optional Git hooks only when requested, preserving the
   existing hook manager and other checks. Consult `${CLAUDE_PLUGIN_ROOT}/README.md`
   for command availability with the pinned engine and migration from old Stop hooks.
5. Continue with `/viewrule:review` for the requested application. Report installation
   or readiness blockers plainly; do not substitute a passing empty configuration.

Setup leaves personal preferences and application state outside the plugin cache.
Version nonsecret setup, its generated ignore file, documents, and checkpoint scripts
so new worktrees receive them. Keep runs, latest state, and authentication local;
do not symlink the entire `.ui-review` directory between checkouts.
Do not modify permission settings or silently install a different engine version.

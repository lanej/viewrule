# Changelog

## Unreleased

- Retire Claude Stop enforcement. Legacy `hook` commands return an empty decision;
  `enforceOnStop` is accepted but ignored. Add explicit `verify` and optional
  pre-commit/pre-push gates for affected UI inputs, including nested applications
  and staged/outgoing content checks without running a browser or changing Git state.
- Update Claude plugin to 0.7.5. Setup migrates recognized Viewrule Stop handlers
  from user/project settings while preserving other hooks, permissions, and dotfile
  symlinks; custom handlers and unreadable settings are reported for manual attention.
  The published engine pin stays unchanged; new engine commands need a later release.
- Treat the application server URL as runtime state instead of requiring a committed
  development port. New `init` configurations omit `baseURL`; `check` and `plan`
  resolve `--url`, then `VIEWRULE_BASE_URL`, then an existing configured `baseURL`.
  Record the resolved target in review output and include it in incremental reuse
  identity so evidence is not reused across different endpoints. Existing configs
  remain compatible.
- Let the local site preview bind an operating-system-assigned port and print its
  actual URL, allowing concurrent previews without a fixed-port conflict.
- Preserve URL credential and page-origin validation for runtime overrides, and
  reject invalid explicit targets instead of falling back to another server.
- Update Claude plugin 0.7.4 guidance with installed-engine capability checks; the
  published engine pin stays unchanged until a separate engine release.

## 0.7.1 — 2026-09-22

- Discover the nearest configured application for review commands and Stop hooks
  without crossing a `.git` file or directory. Explicit `--project`, new-project
  `init`, and source-only `lint` retain their exact-directory behavior.
- Reject an entire `.ui-review` directory linked outside the application so
  worktrees cannot overwrite each other's mutable evidence through that setup.
  Include the shared project resolver in engine freshness checks.
- Explain committed setup versus local evidence, improve missing-configuration
  diagnostics, and cover real Git worktrees in the installed-package workflow.
- Update Claude plugin 0.7.3 to the checksummed 0.7.1 engine archive so both CLI
  commands and Stop hooks use worktree-aware project discovery.
- Include the previously merged component/composition review guidance and pattern
  fixture, plus corrected DR-012 recovery and DR-013 emphasis examples with native
  regression evidence.

Upgrade: rerun review after installation because engine changes invalidate previous
freshness. Replace any entire `.ui-review` directory linked outside the application
with local state and committed or explicitly copied setup files. Uncommitted setup
is not automatically inherited by a new worktree. Configuration/report schema v1,
legacy aliases, and opt-in enforcement remain unchanged; no application rules or
human approvals are rewritten. See [worktree setup](docs/worktrees.md).

## 0.7.0 — 2026-09-17

- Add native include/exclude globs for source files, project documents, and
  logical page/viewport selection, with deterministic resolution and a read-only
  `plan` command. Preserve legacy recursive directory prefixes and exact citations.
- Add explicit review scopes and dependency fan-out, plus opt-in
  `plan --incremental` and `check --incremental`. Full review remains the default;
  `check --full` always executes all configured obligations.
- Reuse only verified complete evidence with original provenance, an explicit
  environment identity, and bounded age. Recompute cross-state constraints over
  fresh and reused observations; missing, corrupt, expired, and unknown evidence
  conservatively triggers new work or blocks a pass.
- Fix source identity for symlink retargeting, global authentication invalidation,
  checkpoint ownership, damaged-report recovery, and canonical plan/check rule
  ordering. Preserve byte-only checksums for copied evidence artifacts.
- Require authored `DESIGN.md` content for newly initialized projects and explicit
  document adoption. Add safe scaffolding and the `/viewrule:design` authoring
  workflow without rewriting existing design prose, rules, or approvals.
- Publish per-rule Markdown and a machine-readable public rule catalog; add
  offline `guide rules` and `guide DR-006` lookup from the installed engine.
- Publish the related-tools comparison and refresh the repository branding.
- Update Claude plugin 0.7.0 to the checksummed 0.7.0 engine archive.

Compatibility and upgrade: Node.js 22.18+ remains required; configuration/report
schema v1, legacy aliases, and opt-in enforcement are preserved. Rerun a full
review after upgrading because engine/input identity changes invalidate prior
freshness. Existing projects without explicit document adoption retain optional
discovery; explicitly configured design documents must be authored, not unfinished
scaffolds. No application rules or human approvals are rewritten.

Incremental reuse requires explicit dependency ownership and `evidenceReuse`
settings (`environmentKey` and `maxAgeMs`). Keep the nonsecret environment key
aligned with the running build, remote data, flags, fonts, and authentication.
Unknown dependencies broaden execution. The recorded synthetic workload demonstrates
avoided checks, not generalized production latency, token, or dollar-cost savings.
See [incremental review](docs/incremental-review.md) and
[design-document adoption](docs/project-documents.md).

## 0.6.0 — 2026-09-15

- Bundle Impeccable CLI 4.1.0 / engine 0.1.5 and add browser-free `lint` with
  explicit source-only coverage, a 30-second limit, and no review-state writes.
- Invalidate passing reviews when Impeccable design context changes, including
  ignored fallback/nested documents, sidecars, and workspace boundaries. Track
  the native scanner's local source scope instead of crawling unrelated ignored files.
- Refresh the Claude plugin to the checksummed 0.6.0 engine archive.
- Preserve the nine-trial repair pilot and defer the remaining study: no incremental
  seeded-repair benefit was observed; full agent latency remains unproven.
- Integrate pinned Impeccable source scans with their native findings and exit
  codes, preserving raw diagnostics and advisory/blocking authority.
- Compare compatible approved/current captures with bounded, original-resolution
  region crops. Missing or incompatible evidence remains explicitly not compared;
  pixel changes never create violations or approve a design.

- Add a versioned, cited design guide shared by Claude Code, the npm archive, and
  Pages, with selective offline retrieval and a lightweight authoring contract.
- Extend the existing gallery with synthetic pricing/action-list and encoding
  examples; distinguish advisory counterexamples from scoped automated findings.
- Plugin 0.5.2 bundles guide access independently of the existing engine pin.
  Existing checks and defaults are unchanged.
- Add opt-in `required-elements` and `relative-position` rules for per-component
  graphics, peer placement, and bounded spacing independent of grid/flex CSS.
- Extend `consistent` with opt-in cross-page identity and inline SVG structure
  comparison; preserve existing page-local and text-context behavior.
- Generalize discovery feedback into guidance, documented examples, and the
  installed-CLI regression. Sizes, spacing, selectors, and layout choices stay
  application-owned; no global density or icon-size requirement is added.

Compatibility: existing project configurations and approvals are preserved. New
projects enable advisory Impeccable diagnostics. The engine now requires Node
22.18+ and its pinned optional platform package. Source-only results cannot satisfy
the Stop hook. Rerun browser review after upgrading; design-context tracking is
conservative and may invalidate a pass when an unused candidate changes.

## 0.5.1 — 2026-09-15

- Reject empty or whitespace-only source-check output instead of treating missing
  provider evidence as a clean scan. Exit 0/1 still accepts valid JSON findings;
  clean providers must explicitly emit `[]` or `{ "findings": [] }`.
- Verify through the installed CLI that a failed provider invalidates an earlier
  passing review, blocks the opted-in hook, and recovers after explicit clean JSON.
- Refresh the Claude plugin to the checksummed 0.5.1 engine archive.

Compatibility: silent source-check providers now fail with setup exit code 2.
Update such providers to emit JSON; no project rules or approvals are rewritten.

## 0.5.0 — 2026-09-15

- Load and snapshot project design/style documents with scoped source citations
  and contract-change reporting.
- Add reusable page interaction checkpoints and advisory/blocking source-check
  adapters; keep missing evidence and failed setup explicit.
- Compare reports against approved reviews with change-oriented findings and
  explicit unassessed or incomparable evidence.
- Add the synthetic analytical detector benchmark, pinned development-only
  Impeccable comparison, and reproducible per-viewport diagnostic evidence.
  Detector outcomes do not establish general superiority or agent repair ability.
- Add entirely synthetic good/bad operations decision surfaces with a large
  schematic map, cited rationale, machine-readable rules/catalog, and native-scale
  captures. The installed regression rejects the bad layout and accepts the good
  layout under the same constraints.
- Add opt-in `repeated-metric`, `evidence-proximity`, and solid CSS `mark-contrast`
  checks with explicit missing/unassessed evidence. Reuse `region-density` and
  `max-height` for summary utilization and declared scalar context. Semantic density,
  redundancy judgments, complex map paint, and recommendation quality remain review.

- Record a single-agent operations repair trial: all eight frozen checks pass
  while independent verification preserves data, type sizes, map detail, and actions.
  This is separate from the unrun controlled three-arm benchmark.
- Clarify browser setup failures: install Chromium for a missing executable;
  diagnose launch permissions when the browser is already installed.
- Refresh the Claude plugin to the checksummed 0.5.0 engine archive.

Compatibility: existing schema versions, presets, and enforcement modes remain
unchanged. The updated DR-006/007/008/016 guidance changes the policy hash; rerun
review to refresh evidence. Existing reports retain their original policy snapshot.

## 0.4.0 — 2026-09-14

- Add stable DR-009–DR-016 for state honesty, continuity, action clarity,
  proportional recovery, task emphasis, input access, content resilience, and
  semantic color scales. Preserve existing IDs and default citations.
- Share the registered ID set between schema validation and policy loading; expose
  all sixteen requirements in contracts, reports, and required-design coverage.
- Add paired interactive examples with one machine-readable catalog, primary
  sources, alternatives, exceptions, and explicit automation limits.
- Give all sixteen rules memorable “Rule of …” names, preserving their IDs,
  full requirements, source paths, and existing policy-index anchors.
- Embed interactive good/bad examples on every canonical rule page; remove broken
  relative gallery links and retain the optional cross-rule galleries.
- Explain the guidance and review model with an annotated landing-page comparison.
- Refresh the Claude plugin to the verified 0.4.0 engine archive.

Migration: existing configuration and rule IDs remain valid. Updated policy text
changes the policy hash; rerun review to refresh evidence. Existing reports retain
their original policy snapshot. New behavioral and review requirements do not
become automated guarantees.

## 0.3.1 — 2026-09-13

- Fix required `vertical-order` groups accepting partially hidden content. Every
  selected element in a required group must now be visible; optional groups retain
  their documented absence/visibility behavior. This may reject previously passing
  rules whose required groups included hidden responsive variants; scope those
  selectors deliberately instead of hiding required reading content.
- Extend the installed regression with a hidden paragraph and a hidden optional
  visual. Refresh the Claude plugin's verified engine pin.

## 0.3.0 — 2026-09-13

- Add `reading-column` and `vertical-order` rules to replace application-owned
  essay geometry detectors, preserving centered measure and DOM/visual reading order.
- Add per-page viewport scopes, print media, and enlarged root text captures.
  Existing configuration remains valid; new rules are opt-in.
- Migrate readable and deliberately broken essay fixtures into the existing
  installed-CLI regression, with measured findings at phone, desktop, and 4K sizes.
- Publish the interactive mock application and expanded design examples on Pages.
- Update the Claude plugin's engine pin to this tested release.

## 0.2.0 — 2026-09-12

- Expose the active design contract before implementation; snapshot it in reports and
  show changed rules/configuration separately from application repairs.
- Add the Claude rule-authoring skill plus `schema` and `add-rule --dry-run`/`add-rule`;
  validate project scopes and prevent additions from overwriting existing boundaries.
- Add sourced control-size/prose warnings and scoped numeric-alignment defaults.
- Use a React fixture with two distinct accepted compositions under the same contract;
  verify rule authoring, measurements, and visible contract changes in one workflow.

- Move report, policy, fixture, and demo markup into readable Mustache HTML templates;
  preserve escaping, approved references, and template-aware freshness checks.
- Add Prettier formatting, ESLint, and incremental TypeScript JavaScript analysis as
  local commands and CI gates, with internal schema/report/capture contracts.

- Ship the original seven dotfiles design preferences as built-in guidance, separate
  from personal preferences and recorded feedback.
- Initialize new projects with editable baseline rules; add an analytical preset
  and `preset --name ...` for selective adoption. Existing project rules are preserved.
- Add `min-font-size` and `max-text-gap` measurements with DR citations and remediation.
  Comparison sets may leave `requiredKeys` empty while retaining counts and preservation.
- Exercise shipped presets with broken, compact, stretched, finite, and missing-evidence
  fixtures through the single installed workflow. Default density uses text proximity
  and visible identities, without a viewport occupancy minimum.
- Update the Claude plugin to use this engine and teach preset calibration. The
  release uses the exact tested archive and the plugin pins its verified checksum.

- Make coding agents the primary audience in the README and architecture docs.
- Add the Claude Code plugin 0.1.0 and repository marketplace: setup, design/review,
  human-feedback skills, and an opt-in Stop adapter around the pinned 0.1.0 engine.
- Verify engine downloads before isolated installation; keep runtime and application
  state outside the plugin cache. Document hook migration, upgrades, and removal.
- Extend the existing installed regression workflow through the plugin launcher,
  including checksum rejection and human-approved reference preservation.

## 0.1.0 — 2026-09-12

- Extract the UI-review engine from lanej/dotfiles into the standalone Viewrule CLI.
- Preserve `.ui-review` projects, the `ui-review` command alias, and legacy environment variables.
- Add normal user-config paths, explicit browser installation, packaged dependency locking,
  architecture/lifecycle/integration docs, MIT licensing, and release automation.
- Retain scoped DR-001–DR-008 citations, geometric checks, cross-viewport comparison
  preservation, accessibility, full-resolution captures, human feedback, and freshness enforcement.
- Validate the installed distribution through one representative regression workflow.

Known limit: box coverage can reward empty stretched layouts; no semantic density
guarantee or automatic application repair is provided. Linux browser validation
does not establish macOS or Windows support.

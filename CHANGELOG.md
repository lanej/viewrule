# Changelog

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

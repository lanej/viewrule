# Changelog

## 0.2.0 — 2026-09-12

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

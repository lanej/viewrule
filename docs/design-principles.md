# Research behind the expanded defaults

For task-centered patterns and the expanding evidence corpus, start with the
[versioned guide](../plugins/claude-code/guide/v1/index.md). This page retains the
research rationale for existing preset defaults; the guide does not silently change them.

Reviewed 2026-09-12. Viewrule applies these principles as boundaries on an agent's
solution before implementation, then measures the resulting interface. Existing
DR-001–DR-008 remain stable; the additional sources clarify selected applications.

| Principle and primary source | What the source establishes | Viewrule decision |
| --- | --- | --- |
| [W3C: Target Size (Minimum), WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Targets generally need 24×24 CSS px or an applicable spacing, equivalent-control, inline, user-agent, or essential exception. The guidance recommends meeting the size minimum where possible even when spacing permits smaller targets. | Add a warning when declared ordinary controls have bounds below 24×24 CSS px. A rectangle measurement cannot certify target geometry or decide all exceptions. |
| [W3C: Visual Presentation, WCAG 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) | Full justification can create irregular word spacing. The AAA criterion concerns a mechanism for users to obtain presentation settings, including bounded lines and non-justified text; it does not require all content to use those settings by default. | Warn on justified paragraphs inside explicitly annotated prose. Add bounded-reading-width guidance. Do not claim AAA conformance or impose an 80-character limit on tables. |
| [U.S. Web Design System: Tables](https://designsystem.digital.gov/components/table/) | Right-align numerical amounts, use consistent units, and consider tabular/monospaced numerals. Dense numeric tables and text-heavy tables have different layout needs. | Require right/end alignment on explicitly annotated numeric cells and headers in the analytical preset. Consistent precision and tabular digits remain guidance; identifiers and decimal-aligned structures need their own scope. |
| [W3C: Reflow, WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Reflow generally preserves information/function at an equivalent 320 CSS px width. Intrinsically two-dimensional content, including data tables, has exceptions; content within it still matters. | Retain scoped overflow checks and guidance for intentional local scrolling. Desktop/4K comparison preservation is a separate contract, not a complete reflow/zoom conformance test. |
| [Carbon: Data table usage](https://carbondesignsystem.com/components/data-table/usage/) | Table composition includes titles, toolbars, actions, selection, sorting, and task-dependent layout choices. | Use a React fixture containing controls, metrics, a table, a trend, and prose. Allow a compact composition and a sidebar composition under the same constraints. No universal row-height or density target is added. |

These additions extend the original [Tufte-inspired policy](design-rules.md).
The [presets](defaults.md) state their exact selectors and severities. Ten built-in
guidance statements now retain the original seven preferences and add controls,
prose, and numeric scanning. Existing projects opt into new rules deliberately;
upgrades do not rewrite application rule files.

## What the evidence establishes

The installed regression runs an actual client-rendered React fixture. It checks
the specific new control-size, prose-alignment, and numeric-alignment findings in
the rejected state. Compact and sidebar compositions pass without changing the
contract or comparison data. Stretching preserves identities but fails text proximity
at 4K. A finite task remains valid with an explicitly changed count requirement.

This tests executable boundaries and their flexibility. It does not establish that
Claude autonomously selects the skill, reads the contract, or makes good visual
decisions. Those behaviors require a real agent session and human inspection.

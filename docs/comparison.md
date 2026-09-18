# Viewrule and related tools

**Viewrule combines design guidance with executable, project-specific UI requirements for coding agents.** It helps an agent decide what a UI must preserve before building, then checks the rendered result and records what remains unverified.

Use it when “looks better” is not a sufficient acceptance criterion: alternatives must remain comparable, labels must remain readable, reporting context must stay visible, or a larger viewport must preserve the information needed for a decision. Different layouts can satisfy the same contract. [Viewrule overview][vr-overview]

> Reviewed September 17, 2026. Viewrule descriptions refer to source commit `d636d41eeda17968fd4f7f95997361a7ea98efb8`; the README identifies the published engine as experimental 0.6.0. Source-branch features are not necessarily in that release. Other tools are described from their official documentation, not fresh execution tests. The recorded experiments below are historical and narrowly scoped.

## Which problem are you solving?

These tools overlap, but they are not interchangeable. The relationship column describes how to choose or combine them—not a claim that another tool cannot implement a similar check.

| Tool | Primary use | Relationship to Viewrule |
| --- | --- | --- |
| **[Impeccable][impeccable]** | Agent design guidance, critique, refinement, deterministic source and browser checks, and design-system context. | Direct overlap and an integrated provider. Viewrule bundles its source detector, then adds scoped application requirements, cross-viewport comparisons, and contract-linked review evidence. |
| **[AgentVision][agentvision]** (`amitpatole/agent-vision`) | Visual feedback and intent conformance across web pages, images, and documents; DOM/CV/OCR evidence with optional model critique. | Direct overlap with broader artifact coverage. Viewrule concentrates on authored web-UI constraints and their connection to project documents, policy, measurements, and human feedback. |
| **[Vercel Web Interface Guidelines][vercel-guidelines] / [web-design-guidelines skill][vercel-skills]** | General interface principles and agent-assisted UI code review across accessibility, interaction, typography, and related concerns. | Useful guidance alongside Viewrule. Add Viewrule when a recommendation needs a project-specific rendered acceptance check and retained evidence. |
| **[Google DESIGN.md][google-design]** | A visual-identity format combining tokens and rationale, with document linting, diffing, and token export. | A compatible source of design-system context, not a competing runtime. Viewrule preserves existing document conventions and adds links from task requirements to verification; it does not replace the token format. |
| **[Playwright][playwright-assertions]** | Browser automation, application assertions, and [screenshot comparisons][playwright-snapshots]. | Underlying infrastructure and a valid alternative for custom checks. Viewrule packages a design-rule schema, measurements, policy citations, reports, and feedback handling that otherwise require application code. |
| **[Galen Framework][galen]** | Declarative rendered-layout specifications: proximity, alignment, containment, sizes, and relationships between elements. | Important prior art. Viewrule does not invent executable layout constraints; its emphasis is the agent-facing design-contract and evidence workflow around them. |
| **[Chromatic][chromatic]** | Team UI testing and review, including visual change detection, interaction testing, and accessibility checks. | A complementary review platform. Viewrule adds explicit task-specific requirements; it is not a substitute for Chromatic's collaborative review workflow. |
| **[axe-core][axe]** | Automated detection of accessibility issues, with uncertain results left for manual review. | A dependency and specialist capability. Viewrule uses axe checks; it does not replace an accessibility audit or establish full accessibility conformance. |

The Viewrule side of these comparisons is documented in the [overview][vr-overview], [design-contract guide][vr-documents], and [Impeccable integration][vr-impeccable].

## How Viewrule differs

### Design intent becomes a reviewable contract

A general principle such as keeping related evidence together is not itself an executable requirement. A project must decide which information belongs together, where it must be visible, and what tradeoffs are acceptable.

Viewrule connects three things: a cited design principle, a project requirement in `DESIGN.md`, and an explicitly authored rule with selectors, scope, thresholds, and severity. Reports retain the contract and show observed versus expected values. The reason for a requirement remains available alongside its implementation. [Design contracts][vr-documents]

In the inspected source, new projects require an authored `DESIGN.md` before substantive rendered review. Existing configurations require explicit adoption. The preflight rejects missing or unfinished required documents, but does not certify the quality or completeness of their reasoning. Prose is not automatically compiled into executable thresholds. [Authoring and migration][vr-documents]

### Requirements can survive a redesign

A screenshot reference records an appearance. An authored requirement can instead state that eight complete alternatives must be visible, particular identities must survive a viewport change, or necessary context must remain present.

Those requirements can hold across a table, sidebar, or another composition. Conversely, a visually unchanged interface can still violate a requirement that was never satisfied. This is why requirement checks and visual review answer different questions—not why one should replace the other. Viewrule also supports approved/current image comparisons as review evidence; pixel changes do not themselves create violations or approval. [Overview][vr-overview] · [Changelog][vr-changelog]

Galen already demonstrates declarative layout relationships, and custom Playwright code can express application-specific assertions. Viewrule's contribution is packaging these concerns into a reusable design workflow, not exclusive access to browser measurements. [Galen specifications][galen] · [Playwright assertions][playwright-assertions]

### The report distinguishes measurement from judgment

Viewrule's CLI performs configured checks without a model API. It records measurements, findings, policy/document snapshots, and native-scale captures. The coding agent interprets guidance and repairs the application; the human supplies intent and actual approval. Using the Claude plugin still involves Claude's normal model service. [Architecture overview][vr-overview]

A passing run means its configured error checks passed. It does not establish that every design concern was assessed. Subjective feedback remains guidance unless someone supplies an explicit rule. Approved references retain the reviewed evidence; approval does not erase automated failures. Changed tracked inputs invalidate freshness. [Overview][vr-overview] · [Contract changes and approval][vr-documents]

This separation matters when an agent is both implementing and reviewing: changing the acceptance rule must remain distinguishable from repairing the implementation. It is a traceability mechanism, not proof against every possible misuse.

### Information-rich interfaces are a deliberate focus

Viewrule's analytical preset and examples emphasize visible comparisons, stable identities, readable density, nearby evidence, and retained context across viewport sizes. That makes operational dashboards and comparison-heavy applications a natural fit for evaluation. The presets are starting points, not universal design laws. [Overview and presets][vr-overview]

More occupied space is not necessarily more useful information. Neither a stretched table nor smaller type demonstrates better density. Choosing the right information, chart, and task structure still requires judgment. [Measurement limits][vr-overview]

## The closest overlaps deserve an honest comparison

**Impeccable is not merely a prompt collection.** Its current documentation includes deterministic source and URL/browser scans, `DESIGN.md`-aware design-system checks, machine-readable findings, and agent hooks. It also offers design and critique workflows. “We execute checks; they only give advice” would be inaccurate. [Detector][impeccable-detector] · [Project documentation][impeccable]

Viewrule 0.6.0 bundles Impeccable CLI 4.1.0 / engine 0.1.5 for general source diagnostics. Those checks are advisory by default; a project can deliberately configure blocking authority. A source-only pass does not establish that rendered requirements passed. Use the Impeccable workflow directly when its design/refinement capabilities solve the problem; add Viewrule where authored application constraints justify the extra setup. [Integration][vr-impeccable]

**AgentVision is not merely screenshot critique.** Its documentation includes explicit intent checks, deterministic evidence, optional vision-model critique, full-resolution tiles, and structured handoffs with unresolved questions. Neither “intent-aware” nor “native-scale evidence” is unique to Viewrule. Its document/image coverage and multiple integration surfaces may be the better fit for a cross-artifact workflow. Viewrule's comparative emphasis is the project-owned UI contract and its traceable enforcement, not a monopoly on visual feedback. [AgentVision documentation][agentvision]

## A concrete example

Suppose an operations screen must let a dispatcher compare eight carriers without scrolling at the configured desktop viewport. Eight is an illustrative project requirement—not a claim about the correct number for every interface.

The project's `DESIGN.md` records the requirement under `### COMPARISON-001`, explains the task, and cites the applicable public design rule. An executable rule can then link back to it:

```json
{
  "id": "carrier-rows-visible",
  "type": "visible-count",
  "selector": "[data-testid=carrier-table] tbody tr",
  "min": 8,
  "pages": ["main"],
  "viewports": ["desktop"],
  "severity": "error",
  "reason": "Compare eight carriers together without scrolling.",
  "designRules": ["DR-006"],
  "sources": ["DESIGN.md#comparison-001"]
}
```

This is one entry in `.ui-review/rules.json`, not a complete configuration. The application must load the cited document and configure the named page and viewport. [Rule example][vr-overview] · [Source references][vr-documents]

If only four complete rows fit, the rule fails even when colors, spacing tokens, and screenshot appearance are otherwise acceptable. The report can identify the declared expectation, the observed count, the affected scope, and the evidence for review.

This rule does **not** verify prices, carrier eligibility, service quality, other viewports, or overall usability. Preserving particular carriers across viewports requires a separate comparison-set contract. A custom Playwright or Galen-based test can cover similar facts; Viewrule supplies the surrounding contract and reporting conventions.

## What the existing evidence supports

The repository contains two different experiments. They should be reported together, not collapsed into a single “better design” claim. Neither was rerun for this comparison.

| Recorded experiment | Result | What it establishes—and does not |
| --- | --- | --- |
| September 15 synthetic detector comparison | Viewrule detected 11/11 seeded viewport/state defects; the tested Impeccable detector detected 2/11. Both were clean on seven unseeded states. | Authored checks detected the selected task requirements. Viewrule received an explicit contract; Impeccable used its default detector. The corpus was selected around Viewrule use cases, not representative product-wide quality. |
| September 15 nine-session repair pilot | Unaided, Impeccable-assisted, and Viewrule-assisted agents each repaired both seeded defects, without new frozen-evaluator failures. | No incremental Viewrule repair benefit was observed on these cases. One run per case and arm does not establish equivalence, general superiority, or a speed advantage. |

Sources: [reviewed detector results][vr-detector-results] and [repair pilot][vr-pilot]. The detector review was by the coding assistant rather than independent human adjudication. The pilot used project-authored synthetic tasks; contract-authoring effort was not measured, and the remaining 72 prepared trials were not run.

The supported claim is that **explicit requirements make those requirements repeatedly checkable**. Better end-to-end repair, lower total cost, and better user outcomes remain unproven by these experiments. Historical detector results should not be presented as a fresh comparison of current integrated product releases.

## Tradeoffs and reasons not to add Viewrule

**Configuration has a cost.** Selectors, representative data, readiness conditions, viewport/state coverage, and defensible thresholds belong to the application. A requirement that was never encoded may remain unassessed. Contract maintenance needs to earn its place in the development workflow. [Configuration and limits][vr-overview]

**The engine is experimental.** The inspected README documents release 0.6.0, GitHub-release distribution rather than npm publication, Linux CI coverage, and unvalidated macOS/Windows support. Do not treat it as an established cross-platform testing service. [Distribution and status][vr-overview]

**A browser check is not a free source lint.** Viewrule has a separate browser-free `lint` path. The repair pilot found substantial overhead in complete agent tasks; its check timings are not measurements of a production application's review cost. The source changelog lists globs and `plan` as unreleased and explicitly says they do not enable incremental runs. Do not claim incremental execution or demonstrated cost savings. [Integration][vr-impeccable] · [Pilot][vr-pilot] · [Changelog][vr-changelog]

**It does not replace the rest of verification.** Keep application tests for behavior, accessibility testing and human review for access needs, and design review for judgment. A document prerequisite, an automated pass, and human acceptance establish different things. [Verification boundaries][vr-documents]

## Using the tools together

Keep the tools that already solve a problem. A team may use Impeccable or Vercel guidance before implementation, Google-format design documentation for its visual system, Playwright for application behavior, axe for automated accessibility checks, and Chromatic for collaborative visual review.

Add Viewrule where recurring design expectations deserve explicit acceptance checks with retained rationale and evidence. Its strongest positioning is not **“replace your design and testing tools.”** It is **“make the design requirements your project cannot afford to lose explicit, executable, and reviewable.”**

## Keeping this comparison accurate

Recheck upstream documentation when revising claims. Identify the inspected Viewrule commit and distinguish released, source-only, and planned behavior. Link measured claims to versioned protocols and results. Compare documented native workflows; call out when an alternative requires custom code. Include negative results and setup costs. Do not turn a missing feature in a documentation review into a claim that another tool cannot support it.

[vr-overview]: https://github.com/lanej/viewrule/blob/d636d41eeda17968fd4f7f95997361a7ea98efb8/README.md
[vr-documents]: https://github.com/lanej/viewrule/blob/d636d41eeda17968fd4f7f95997361a7ea98efb8/docs/project-documents.md
[vr-impeccable]: https://github.com/lanej/viewrule/blob/d636d41eeda17968fd4f7f95997361a7ea98efb8/docs/impeccable.md
[vr-changelog]: https://github.com/lanej/viewrule/blob/d636d41eeda17968fd4f7f95997361a7ea98efb8/CHANGELOG.md
[vr-detector-results]: https://github.com/lanej/viewrule/blob/d636d41eeda17968fd4f7f95997361a7ea98efb8/benchmarks/analytical/results.md
[vr-pilot]: https://github.com/lanej/viewrule/blob/d636d41eeda17968fd4f7f95997361a7ea98efb8/benchmarks/analytical/pilot-2026-09-15.md
[impeccable]: https://github.com/pbakaus/impeccable
[impeccable-detector]: https://impeccable.style/docs/detector/
[agentvision]: https://github.com/amitpatole/agent-vision
[vercel-guidelines]: https://vercel.com/design/guidelines
[vercel-skills]: https://github.com/vercel-labs/agent-skills
[google-design]: https://github.com/google-labs-code/design.md
[playwright-assertions]: https://playwright.dev/docs/test-assertions
[playwright-snapshots]: https://playwright.dev/docs/test-snapshots
[galen]: https://galenframework.com/docs/reference-galen-spec-language-guide/
[chromatic]: https://www.chromatic.com/docs/
[axe]: https://github.com/dequelabs/axe-core

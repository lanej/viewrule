---
{
  "schemaVersion": 1,
  "version": "1.2.0",
  "id": "guide-index",
  "kind": "index",
  "title": "Design for the decision",
  "summary": "Choose conditional guidance, inspect its evidence and examples, then measure the implementation."
}
---

# Design for the decision

A passing layout check cannot tell you whether the user can make the right decision.
Start by naming the action, the alternatives, and the evidence needed together.

## Choose relevant guidance

| When designing… | Read |
| --- | --- |
| Dashboards, queues, or decision views | [Decision-centered information](decision-context.md) |
| Tabs, disclosures, or drilldowns | [Progressive disclosure and memory](progressive-disclosure.md) |
| Repeated actions across comparable items | [Dense action lists](action-lists.md) |
| Quantitative screens and repeated charts | [Tufte in practice](tufte.md) |
| Encodings for magnitude comparison | [Graphical perception](graphical-perception.md) |

## Three different kinds of authority

- **Enforceable rules:** configured, observable conditions. The [measurement manual](../../../../docs/ui-review.md) describes what runs; the [DR policy](../../../../docs/design-rules.md) supplies rationale. A DR statement is not itself proof of an implemented detector.
- **Recommended patterns:** the pages above. Suitability depends on the stated task. They do not create failures or modify presets.
- **Supporting evidence:** linked records distinguish experiments, practitioner principles, standards, and Viewrule conventions. A paper about a perceptual task did not test our pricing interface.

## Use the guide

Consult the relevant pages before implementation. Follow their example links and evidence records, record assumptions, implement, and then run the applicable checks. If decision context is missing, ask one targeted question or explicitly state a provisional assumption. Do not claim to have verified decision sufficiency.

This is corpus **1.2.0**, schema **1**. `v1/` is the compatible publication channel, not an immutable URL. Cite a guidance ID and corpus version; pin a Git commit when exact historical bytes matter. Updates remain in Git history. A breaking schema or identifier migration gets a new major directory; preserve existing IDs and publish redirects or migration notes.

The Markdown here is canonical: the plugin reads it offline, the npm archive includes it, and Pages generates HTML and public Markdown from this source. `viewrule guide` returns a compact index; `viewrule guide P-003` returns just one Markdown page. The plugin launcher offers the same `guide [ID]` command without engine setup. Direct file reads also work. Published `index.json` contains relative Markdown paths, summaries, applicability, sources, examples, and related IDs.

Published Markdown links work directly from the page URL, including examples, screenshots, and rule contracts. Public `index.json` uses the same rewritten example paths and retains `examples[].publicUrl` for clients that need absolute URLs. Local/plugin Markdown keeps repository-relative paths. These are generated representations of one maintained source; link rewriting does not change the advice.

The runnable pricing and encoding examples use the Easy UI PR stack’s real components. Their [source manifest](examples.json) identifies the immutable source revision and bundled file checksums. The CLI/public index points to it as `exampleSource`; retrieve it only when following examples. Guide advice remains framework-independent. The npm archive and built Pages site include static examples and local fonts; the isolated plugin includes their provenance and Markdown guidance.

See [contributing](authoring.md), [the contract](schema.json), and [the authoring template](template.md). The [existing gallery](../../../../docs/examples/index.html) and [Design lab](../../../../docs/app/index.html) remain reusable references.

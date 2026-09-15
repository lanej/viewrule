---
{
  "schemaVersion": 1,
  "version": "1.2.0",
  "id": "P-001",
  "kind": "pattern",
  "title": "Decision-centered information organization",
  "summary": "Keep routine decision factors visible and comparable; disclose supporting work according to the task.",
  "applicability": [
    "dashboards",
    "decision support",
    "triage",
    "pricing"
  ],
  "related": [
    "P-002",
    "P-003"
  ],
  "rules": [
    "DR-003",
    "DR-006"
  ],
  "sources": [
    "E-DISCLOSURE",
    "E-RECALL"
  ],
  "examples": [
    {
      "id": "decision-visible",
      "quality": "good",
      "href": "../../../../docs/examples/pricing.html?mode=compact",
      "task": "Compare three proposals before choosing review or hold.",
      "consequence": "Current/proposed price, forecast range, and constraint state stay with each identity."
    },
    {
      "id": "decision-hidden",
      "quality": "bad",
      "href": "../../../../docs/examples/pricing.html?mode=sparse",
      "task": "Compare the same three proposals.",
      "consequence": "Opening each proposal replaces the list; users must remember the previous alternative."
    },
    {
      "id": "decision-table",
      "quality": "good",
      "href": "../../../../docs/examples/pricing.html?mode=table&task=routine&open=A",
      "task": "Compare three proposals before choosing review or hold.",
      "consequence": "The comparison table preserves the same factors alongside a selected-item panel."
    }
  ]
}
---

# Decision-centered information organization

## What to do and why

Write a decision sentence: “For these alternatives, choose this action using these factors.” Use it to choose the initial fields, comparison grouping, and action placement. This is a **Viewrule convention**, to be tested with representative users; it is not a detector or a validated universal workflow.

Keep factors used together in a shared comparison. Nielsen's [disclosure guidance](evidence/disclosure.md) distinguishes frequently needed information from later stages; [recognition rather than recall](evidence/recall.md) motivates keeping useful cues available. Applying these to a pricing queue is our inference, not a pricing experiment.

Treat “20% of information supports 80% of decisions” as a question for observation and usage research. We have no evidence for that ratio here. Measure which decisions recur, which fields change actions, and where users backtrack. Low usage does not prove a field is dispensable: it may protect a rare but consequential decision.

## Prefer, avoid, and exceptions

Prefer a shared comparison for recurring selection, prioritization, or approval. Prefer a sequential flow when later work genuinely depends on an earlier committed choice. For open exploration, a filterable analytical workspace may be more suitable than a fixed action list. Do not require every task to fit in one viewport; preserve meaningful groups and evaluate supported widths.

In our **synthetic** pricing task, an operator compares three proposals and chooses “Queue review” or “Hold.” Identity, current/proposed USD per parcel, modeled daily contribution range, and a declared constraint state are assumed necessary for every routine decision. “Check” means investigate before queuing; it is a fictional exercise condition, not an EasyPost rule. Queuing does not activate a price.

The estimate's construction and historical diagnostics are secondary for this exercise. If the operator must inspect a trend before every action, that trend becomes a primary factor. Reclassify it rather than insist on expansion.

## Examples

[Good: compact rows](../../../../docs/examples/pricing.html?mode=compact) keep all assumed factors beside each proposal. [Another good design](../../../../docs/examples/pricing.html?mode=table&task=routine&open=A) uses a comparison table with the same fields and a persistent investigation panel; in-place expansion is optional.

[Bad for this task: sparse navigation](../../../../docs/examples/pricing.html?mode=sparse) shows identity and an “Open proposal” control, moving factors to another view. All data still exists, but comparison requires repeated visits. A second bad design shows only a positive forecast midpoint: it hides the negative lower bound for proposal B. Retaining the range changes what the operator can assess.

These are original examples under constant data and task. They do not measure a performance improvement.

The [task selector](../../../../docs/examples/pricing.html?mode=trends&task=trend) makes the assumption inspectable: when demand histories become essential, put them in the initial comparison. The data stays constant; choosing a task changes the recommendation.

## Evidence and limits

Sources: [E-DISCLOSURE](evidence/disclosure.md) and [E-RECALL](evidence/recall.md), practitioner guidance. Field selection and the decision sentence are Viewrule conventions and hypotheses, with no numerical sufficiency threshold.

## Automated checks and judgment

Use `context` for declared units/periods, `no-clip` for labels, and a task-configured `comparison-set` or `visible-count` for declared alternatives (DR-003/DR-006). Read the [manual](../../../../docs/ui-review.md) before authoring selectors. These checks can detect missing **declared** evidence; they cannot discover omitted decision factors. The sparse example intentionally passes the gallery's label check. Ask the task owner to validate factors, exception consequences, and the action's meaning.

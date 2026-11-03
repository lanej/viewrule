# DR-013 — Rule of Priority

**Principle:** Visual emphasis follows the task's priority.

**Default:** State the intended attention order for the current task, then use
contrast, size, grouping, position, and restraint to support it. The most visually
prominent content should not routinely distract from the decision or action that
matters most in that state.

**Why:** [Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
is practitioner guidance on directing attention. This positive hierarchy rule
complements DR-008; removing decoration does not by itself establish useful emphasis.

**Application:** An exception-review screen can lead with affected shipments and
their required response while keeping summary totals available but subordinate.
The same dataset may need a different hierarchy in a planning or reporting task.

**Teaching comparisons:** Lead with the distinction the reader must recognize and
the shared facts needed to judge it. Keep fixture navigation and verification notes
subordinate. Inspect the example without its explanatory paragraphs: those
paragraphs must not compensate for an unclear value, state, or action in the
interface itself. Keep both alternatives comparably polished so unrelated styling
does not reveal the intended answer. These are Viewrule authoring conventions,
not experimentally established thresholds.

**Executable emphasis contracts:** Declare which subject is primary for the task,
then specify the observable relationships that support that decision: type scale,
contrast, grouping, placement, and any accent treatment. A correct DOM order alone
does not establish visual priority. Conversely, a controlled priority counterexample
may swap a coordinated color-and-type role; it need not freeze typography or restrict
the mutation to order. Preserve facts, readable supporting evidence, action behavior,
and consistent status meanings. An attention accent must not invent a warning or success.

Author scoped checks before repairing the UI and exercise them against the rejected
baseline. Assert measured paint, text, geometry, and behavior rather than classes,
expected-pass annotations, or the mere presence of a rule. Preserve a representative
rejected fixture so returning to the old design makes the check fail. Exact colors
and sizes remain project choices: a native style check verifies those choices, not
a universal salience score. Human review still judges task suitability.
See the [red-to-green priority example](../examples/priority-design.md).

**Exception:** Navigation, orientation, or a safety-critical alert may appropriately
outrank the page's ordinary primary task. There is no universal KPI count, occupancy
score, or rule requiring exactly one primary button on every page.

**Review:** Compare an explicit task and attention order with the rendered result.
Project-specific token checks may detect known deviations; no generic hierarchy
score establishes that the emphasis is appropriate.
For declared equal-priority peers, [DR-020](https://github.com/lanej/viewrule/blob/main/docs/design-rules/DR-020-balance.md) adds opt-in
area and font-size variation checks. These proxies do not determine the task's
priority or measure perceived salience.
[Good/bad example](../examples/behavior.html?rule=DR-013).

# Component and composition workflow

Use this for rendered UI work, not source-only lint. These are Viewrule workflow
conventions, not new engine rules or a claim of better agent outcomes. Apply the
existing [decision-context](../../guide/v1/decision-context.md),
[disclosure](../../guide/v1/progressive-disclosure.md), and
[action-list](../../guide/v1/action-lists.md) guidance selectively. Keep task-specific
requirements in the application's authored DESIGN.md and implementation in its
component library. Do not create a second design system or rendering harness.

## 1. Task and rough composition first

Name the decision/action, alternatives, and information routinely needed together.
Identify the initial-view evidence, supporting detail, and mutation actions. Unknown
requirements remain provisional and unassessed; existing code is not approval.

Sketch the composition before refining parts: shared title/context, view controls,
comparison region, actions, and disclosure destinations. A sketch can be a short
written arrangement, not a new artifact. Identify the smallest meaningful units
(section header, toolbar, decision row), not every button or framework component.

In existing DESIGN.md sections, record each affected unit's purpose, required
visible evidence, disclosed detail and trigger, shared-context owner, variants,
representative states, and verification owner. Link existing stories/tests rather
than copying their source. Distinguish established, observed, and proposed choices.
Do not mandate a new heading structure or rewrite accepted decisions.

## 2. Component pass

Refine the affected functional units in their intended container, using the app's
existing components/tokens. Reuse a story or fixture when available; an in-page
region is valid evidence when isolation would require another harness. Test the
standalone/embedded distinction only where both are used. Do not perfect unused
primitives before assembling the task.

Start with these three patterns when applicable:

| Unit | Initial presentation and behavior | Reject when it harms this task |
| --- | --- | --- |
| Section header | A meaningful heading, genuinely additional context, and related actions share a compact arrangement when space permits. Embedded units avoid repeating parent-owned context while retaining useful heading semantics and accessible names. | Automatic title/subtitle/toolbar bands displace evidence; an empty right side accompanies avoidable stacking; unrelated actions are pulled into the header merely to fill space. |
| Filter/action toolbar | Common view controls remain direct; active filters and their scope remain apparent. View changes and data mutations are distinguishable by labels/grouping, not necessarily separate rows or cards. | Routine controls or the primary action become a menu hunt; hidden filters obscure the data scope; ambiguous icons or excessive visual separation make actions harder to locate. |
| Expandable decision row | Identity, routine decision evidence, status, and explicit actions remain available. Supporting detail has an obvious disclosure trigger. Expanding does not mutate data or lose the summary. | Required factors, active error/constraint state, or action scope are hidden; the whole row ambiguously expands and executes; expansion loses identity, focus, or the comparison context. |

Exercise only relevant risks: a realistic long label/narrow container, missing
optional content, and the expanded or active-filter state. Use the application's
existing accessibility checks for keyboard operation, focus, semantics, and text
resize. Missing evidence is unassessed, not a reason to invent a passing result.
No exhaustive viewport/state matrix is required.

Attach observable conditions to existing supported checks only after reading the
installed measurement manual. Give project thresholds a task rationale. Keep
semantic judgments and interaction assertions with human review/application tests
when geometry cannot express them. A pattern name or this table creates no failure.

## 3. Composition pass

Assemble early and revise either level. A locally acceptable unit is not proof of
an acceptable whole. Inspect the overview and relevant original-size details against
the initial task, with a representative populated state and the consequential
interaction state, not only a clean empty screen.

The parent owns genuinely shared titles, dataset/time context, and shared controls.
Children own their internal structure and behavior. Do not hoist controls that have
different scopes or remove labels needed to identify distinct comparison regions.
Check three composition risks:

- **Repeated overhead:** duplicated headings, explanatory subtitles, date ranges,
  filter bars, nested card frames, and cumulative padding. Combine/remove only what
  is redundant for the task. Explanations should add information, not narrate the UI.
- **Evidence and actions:** comparisons remain simultaneously usable where required;
  identities, units, denominators, and constraint state remain attached. View controls
  and mutations have distinct meaning and correct scope without unnecessary panels.
- **Disclosure and resilience:** expanded content, active filters, long labels, and
  narrow layouts preserve orientation and access. Keep routine decision evidence in
  the initial view; disclose supporting explanation. Revisit this choice when the task
  changes. A readable compact layout that conceals required facts is rejected.

Unused space alone is not a defect. A finite comparison may remain sparse. Do not
stretch content, shrink readable type/targets, remove required headings, or hide
facts to improve box coverage. Measure actual header/control overhead only within
a justified project contract; there is no universal density score or pixel budget.

## 4. Evidence, repair, and completion

These are two review responsibilities, not two mandatory full browser runs. A single
configured run can provide both sets of evidence; component stories alone cannot
cover their parent composition. Configure the affected real states/regions within
the task's authorization. Full `check` remains the default. The phase split does not
authorize incremental mode, narrower coverage, or evidence reuse; use those only
under the existing explicit configuration and freshness/invalidation rules.

For each consequential change, retain a task-preserving accepted/rejected comparison
in the existing app/installed workflow when a supported check expresses the defect.
Assert the specific rule ID, scope, and measurement, not merely process success.
For advisory examples, record the expected human judgment separately from the actual
CLI result. Do not relabel an existing passing fixture as a detector failure. Include
a legitimate sparse case and a compact-but-missing-evidence case when testing density.

Report a small evidence ledger in the review response; it is not new CLI JSON:

| Scope | Evidence to identify | Report separately |
| --- | --- | --- |
| Component | Unit/selector or story, state, container/viewport, check/test and artifact | Observed result; remaining semantic or interaction judgment |
| Composition | Parent view, state/viewport, saved overview/detail, shared context | Repetition/overhead, comparisons, action scope, disclosure judgment |
| Unassessed | Requirement and missing evidence or capability | Owner/blocker; next verification needed, without an invented pass |

State not-applicable scopes with a reason; do not manufacture a component test for a
prose-only change. Cite consulted guide/DR IDs and document sections. Separate
contract/rule changes from implementation repairs, and distinguish measurements,
human judgment, and unresolved requirements. Never weaken a contract to get a pass.

After an authorized repair, rerun affected validation and obtain fresh aggregate
evidence under the configured workflow. Do not repeat unchanged runs or silently
stop at a component pass. Report configured-check success and unresolved judgments
independently. Only a human can supply approval of the exact rendered result.

## Workflow evaluation

Detector regression, application interaction tests, and agent-workflow evaluation
answer different questions. The repository's `benchmarks/workflow/README.md` defines
fixed review cases and a paired generation trial. It is a development resource, not
a required plugin dependency or an executed result. No outcome improvement is claimed
until real runs with retained artifacts demonstrate it.

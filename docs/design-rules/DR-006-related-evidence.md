# DR-006 — Rule of Proximity

**Principle:** Related evidence stays visible together.

**Requirement:** For each task, identify the critical comparison set. At its
supported analytical desktop sizes, the screen must show that set together in
the declared comparison view. Align related values and use consistent numeric
formatting so the reader can scan them. Keep labels close to their evidence.

**Why:** Comparing alternatives should not depend on remembering a value from
another tab or a previous scroll position.

**Application:** A carrier-selection view might require cost, delivery window,
and reliability for the selected alternatives together. Secondary detail may be
expandable. Align numeric amounts and their headers consistently, with suitable
precision and tabular digits where supported; identifiers need not follow numeric
amount formatting. Small screens may use an explicit selection or comparison mode;
the reduced view must keep the identity and context of each alternative clear.

**Meaning-changing context:** A qualifier that changes how a value should be used
belongs with that value, not in an explanation or collapsed disclosure elsewhere.
Keep stale status and snapshot age visible with retained data. Source methodology
and verification detail can be deferred; the facts needed to interpret the number
cannot. Declare the required relationship before choosing a badge, sentence, or
other presentation.

**Decision surfaces:** Keep the supporting evidence, recommendation, and next action
adjacent within an expanded analytical item. `evidence-proximity` can enforce a
project's declared text-distance limit; it cannot identify which evidence supports
the decision. Inspect simultaneous visibility and preserve map detail needed for
facility-level reading. [Expanded decision-surface reference](https://github.com/lanej/viewrule/blob/main/docs/design-examples.md#expanded-analytical-decision-surface).

**Component application:** Keep identifying marks, titles, and descriptions
visually associated. For compact discovery items, a mark can share the title's
row while the description uses the full item width. Declare the intended relative
placement and spacing, rather than prescribing one CSS layout technique. An
individual missing graphic must not be concealed by other complete items.

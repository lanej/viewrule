## Problem and resulting behavior

Describe the user-visible problem, resulting behavior, and affected DR IDs when relevant.

## Evidence

List the validation actually performed and its result. Use the existing representative
regression for behavior changes; use example/link/diff checks for documentation.
State unavailable validation without implying a pass. Do not attach private app data.

<!-- Complete the sections below when this PR materially changes a canonical
good/bad example. Otherwise delete them. -->

## Canonical example

**Target DR:** [DR-___ — Rule name](../blob/main/docs/design-rules/DR-___-filename.md)

**Intentional Good → Bad mutation:**  
Describe the single change that causes the Bad variant to violate the target rule.

### Visual evidence

<!-- Embed the actual rendered images inline. Do not substitute filenames or artifact links. -->

**Good**

<!-- ![Good rendered example](...) -->

**Bad**

<!-- ![Bad rendered example](...) -->

### Human review

<!-- Include every applicable DR whose conformance evidence is human-review.
Checking the box is the review attestation: checked means reviewed and passed.
If it does not pass, leave it unchecked and fix the example. Delete unused rows. -->

- [ ] **[DR-___ — Rule name](../blob/main/docs/design-rules/DR-___-filename.md):** Paste the rule's principle or concrete review question here so the reviewer does not need to recall it from memory.
- [ ] **[DR-___ — Rule name](../blob/main/docs/design-rules/DR-___-filename.md):** State what must be true in this example for the rule to pass.

### Isolation

<!-- The first three conformance claims are derived from CI plus the checked human-review
attestations above; do not add redundant manual checkboxes for them. -->

**Conformance isolation:** regression CI verifies the machine/behavioral evidence; the lightweight **Canonical example review** check runs on PR body edits and requires every matrix-declared human-review checkbox plus separate inline Good and Bad images. Configure both checks as required before merge.

- [ ] Every human-review rule above has been reviewed.
- [ ] Good and Bad images show the state that demonstrates the controlled difference.

## Limits and compatibility

Describe material measurement limits, changed contracts, or migration needs. Use
[REVIEW.md](https://github.com/lanej/viewrule/blob/main/REVIEW.md) for the review rubric;
omit this section if it does not apply.

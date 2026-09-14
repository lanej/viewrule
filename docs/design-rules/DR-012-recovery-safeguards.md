# DR-012 — Rule of Recovery

**Principle:** Safeguards match consequences and preserve work.

**Requirement:** Match prevention and recovery to the action's consequences.
Reversible low-risk operations should be easy to undo; consequential submissions
need an appropriate reversal, checking, or review mechanism. On failure, preserve
recoverable input and identify the problem and corrective action.

**Why:** Re-entering valid work does not correct the original error. The applicable
scope and alternatives of [WCAG 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html)
are specific; it does not require confirmation dialogs for every save.
[WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
requires textual identification of automatically detected input errors.

**Application:** Preserve the entered proposal after server rejection, associate
persistent correction guidance with the field, and show affected records before a
bulk publication. Undo must reverse the actual operation, not merely dismiss a toast.

**Exception:** Security-sensitive values or expired authorization may require
re-entry. Explain the reason and retain other safe work. An irreversible action
cannot truthfully offer Undo; show its consequences before commitment instead.

**Review:** Exercise rejection, correction, retry, cancellation, and actual reversal
where supported. A review dialog or Undo label alone does not establish protection.
[Good/bad example](../examples/behavior.html?rule=DR-012).

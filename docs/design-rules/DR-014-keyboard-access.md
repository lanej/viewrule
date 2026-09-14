# DR-014 — Rule of Access

**Principle:** Essential interactions do not require a pointer.

**Requirement:** Essential information and actions must be available through the
supported input methods, including keyboard operation where applicable. Preserve
predictable focus, a visible focus indication, and a usable route into and out of
interactive disclosures. Do not make essential information hover-only.

**Why:** [WCAG 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
addresses keyboard operation, including its path-dependent-input exception.
[WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
sets applicable dismissibility, hoverability, and persistence requirements;
[WCAG 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
addresses focused controls being entirely obscured by authored content.

**Application:** Provide deliberate keyboard chart inspection or an equivalent
accessible data view. Use native buttons for disclosures. Make opening, activation,
dismissal, and the next focus destination work without a mouse.

**Exception:** A genuinely path-dependent interaction may fall within the standard's
exception; do not use that to exclude unrelated controls or essential data. A touch
interface may expose information differently while preserving access to the task.

**Review:** Perform a real keyboard sequence; programmatically focusing a control
does not demonstrate that Tab can reach it. Static axe results do not establish
complete keyboard, touch, screen-reader, or focus-visibility behavior.
[Good/bad example](../examples/behavior.html?rule=DR-014).

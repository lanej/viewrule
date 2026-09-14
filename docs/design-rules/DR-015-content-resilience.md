# DR-015 — Layout survives content variation and text adaptation

**Requirement:** Validate task-critical content with representative long labels, distinguishing suffixes, numeric extremes, and relevant empty or populated states. Supported text enlargement and spacing changes must not remove essential content or make controls unusable. Preserve meaning rather than merely fitting boxes.

**Why:** Text resizing and spacing standards require interfaces to remain usable when text presentation changes. Our content-variation fixtures extend that reasoning to application-specific data; they are not additional universal thresholds.

**Application:** Keep the distinguishing end of a service name available through wrapping, sizing, or an explicit accessible inspection mechanism. Allow longer error messages without displacing Save outside an unscrollable fixed-height panel.

**Exception:** Truncation can be appropriate when it does not remove the information needed for the current task and full text is deliberately accessible. Large tables may use clearly scoped scrolling. Not every cell must expand indefinitely.

**Review:** Reuse existing clipping, overlap, and legibility checks with difficult fixture content, then inspect the meaning retained. Root-font scaling is not browser zoom, and one passing fixture does not certify every locale or text preference. [Good/bad example](../examples/behavior.html?rule=DR-015).

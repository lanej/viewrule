# DR-001 — Rule of Shared Scales

**Principle:** Comparable charts use comparable scales.

**Requirement:** Charts comparing absolute magnitudes of the same measure must
use the same units, axis domains, scale transformations, and plotting dimensions.
Time comparisons must use matching windows or explicitly labeled corresponding
periods. Changes in layout must preserve the interpretation of the scale.

**Why:** Visual differences should reflect differences in data. Independently
rescaling each panel can make very different magnitudes appear equivalent.

**Exception:** Separate scales may support comparison of patterns within each
series. Label those scales clearly and identify the comparison as one of shape
or relative change. Logarithmic and indexed views must identify their transform
and reference value.

# Design rule source files

Each design rule has one Markdown file named with its stable rule ID and a short label. The ID is permanent; the label is intentionally concise so links and diffs remain readable.

The registry in `src/policy-ids.mjs` records the expected filename and enforcement mode for every rule. New rules append a new ID and source file; existing IDs are never renumbered.

The legacy `docs/design-rules.md` aggregate remains temporarily for compatibility with the current policy reader while the reader and generated site are moved to consume these files directly.

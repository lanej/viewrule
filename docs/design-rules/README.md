# Design rule source files

Each design rule has one canonical Markdown file named with its stable rule ID and a short, durable label. The ID is permanent; the label stays concise so links and diffs remain readable.

The registry in `src/policy-ids.mjs` defines the expected filename and enforcement mode for every rule. The engine loads these files directly, validates that each file declares the matching rule ID, and hashes every filename and file body into the policy identity.

`docs/design-rules.md` is an index only. New rules append a new ID and source file; existing IDs are never renumbered.

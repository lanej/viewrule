# Glob scopes and review plans

Run `viewrule plan --project <directory>` to inspect the resolved workload as JSON.
It reads configuration and local files but does not launch a browser, execute source
providers, write review state, or grant approval. `check` still reviews the complete
configured browser matrix; globs do not infer source-to-page dependencies or enable
incremental evidence reuse.

## File selection

Existing arrays remain include-only shorthand. `sourcePaths` and `projectDocuments`
also accept explicit `include` and `exclude` arrays:

```json
{
  "sourcePaths": {
    "include": ["src/**/*.{ts,tsx,css}", "shared/tokens"],
    "exclude": ["src/generated/**", "src/**/*.test.tsx"]
  },
  "projectDocuments": {
    "include": ["DESIGN.md", "apps/*/DESIGN.md"],
    "exclude": ["apps/retired/**"]
  }
}
```

Patterns are relative to the project root. Backslashes are normalized to `/`.
Absolute paths, URLs, parent traversal, and leading `!` negation are rejected;
use the explicit `exclude` array. Includes form a union, exclusions always win,
and overlapping matches are deduplicated and sorted. Order does not grant precedence.

Matching uses pinned Minimatch with compiled, case-sensitive POSIX patterns, not
shell expansion. Common forms include `*`, `**`, `?`, character classes, and braces such as `*.{ts,tsx}`. Matching
is case-sensitive; wildcard segments do not implicitly match leading dots. Write
dot segments explicitly, such as `src/.storybook/**`. Exact paths always match
literally. A literal **source** directory such as `src` retains recursive prefix
behavior, including hidden descendants; `.` retains the project-wide prefix.
A literal **document** path names one required file, not a directory.

Source inventory preserves the existing Git behavior: tracked files and untracked,
non-ignored files, including tracked deletions for freshness. Without Git, Viewrule
walks regular files. Both omit `.git`, `node_modules`, `.ui-review`, `dist`, `build`,
`.next`, `coverage`, and `.cache`. Unmatched source selections remain compatible:
`plan.sources.unmatched` exposes them rather than silently claiming coverage.
Selection changes, additions, deletions, and newly matched files affect freshness.

Document globs discover local files independently of Git ignore rules, excluding
those generated/dependency directories and without descending directory symlinks.
Exact document paths can still name ignored files. An existing exact document
path takes precedence over interpreting glob characters in its filename. Every
explicitly configured document pattern must select a file after exclusions; unmatched patterns, missing
exact files, and excluding an explicitly required exact file are configuration
errors. Omitted `projectDocuments` retains optional `DESIGN.md` and `STYLE.md`;
an empty array deliberately loads neither. Overlapping patterns may select the
same document once; duplicate normalized exact entries remain errors.

Loaded documents must resolve inside the project and be regular UTF-8 text files.
Limits apply after expansion: **32 documents**, **1 MiB per document**, and **8 MiB
in aggregate**. Filesystem discovery is capped at 100,000 visited entries and 64
directory levels; branches that cannot match document patterns are pruned.
Exceeding a cap fails rather than truncating coverage. Selected source symlinks must also resolve inside the project.

`apps/*/DESIGN.md` discovers documents that exist. It does **not** establish that
every application has one, or that its design requirements have been assessed.
Declare required documents explicitly when missing application-level guidance
must be an error. Rule `sources` citations still name exact documents/sections.

## Logical page and viewport selection

Rule `pages`, rule `viewports`, and each configured page's `viewports` accept the
same array or include/exclude shape. These match **configured names**, not URLs,
source paths, CSS selectors, or automatically discovered routes:

```json
{
  "pages": { "include": ["admin-*"], "exclude": ["admin-legacy"] },
  "viewports": ["desktop", "wide-*"]
}
```

Logical names are not path-normalized and do not inherit directory-prefix behavior.
The POSIX matcher treats `/` as a separator, so use `admin/**` for slash-separated
names. Every local include must match a configured name, and exclusions cannot
remove all names. Inherited global rules may remain inactive in other projects,
as before. `comparison-set.preserveFrom` and `minVisibleByViewport` keys remain
exact viewport names; a wildcard scope still needs a count for each active viewport.

Validation, browser execution, design evaluation, and planning share applicability
logic. The plan lists every required page/viewport/checkpoint state and its active
rule IDs; it does not turn a selected source file into a rendered obligation.

## Source providers and limits

`plan.sources.files` is the conservative union used for source fingerprinting,
with a reason for each file: a matching `sourcePaths` include or a bundled source
provider. Source exclusions do **not** override a provider's separately configured
targets. A file excluded from native source selection can therefore remain in the
fingerprint because Impeccable consumes it.

Bundled Impeccable targets keep their existing literal path semantics; this change
does not add native globs to `lint --target` or provider `targets`. Its candidate
files are labeled `conservative`, because its own configuration may exclude more.
Context-discovery candidates are fingerprinted separately. External command
providers have `inputs: "unknown"`; declare relevant inputs in `sourcePaths`.
Disabled providers remain visible in the plan but contribute no work.

Configuration, local/global rules and preferences, loaded documents, engine files,
design policy, and provider context also participate in freshness. Neither a plan
nor a source fingerprint attests to changing remote data, fonts, browser binaries,
or the state of a live server. See [architecture](architecture.md).

# Dependency-aware incremental reviews

`viewrule check` remains a full review. Opt into reuse with:

```sh
viewrule plan --incremental --project .
viewrule check --incremental --project .
viewrule check --full --project .
```

`plan` reads files and verifies existing evidence; it does not launch a browser,
run a source provider, change approval, or write review state. Without
`reviewScopes`, `--incremental` conservatively runs the full existing workflow.
This feature ships in engine 0.7.0. The 0.7.0 Claude plugin pins that release;
update the plugin and run setup to adopt it. Hooks never install or upgrade software.

## Declare ownership and dependencies

The following fields extend an otherwise complete `.ui-review/config.json`:

```json
{
  "sourcePaths": ["src", "package.json", "package-lock.json"],
  "projectDocuments": ["DESIGN.md", "src/*/DESIGN.md"],
  "reviewScopes": [
    {
      "name": "shared",
      "sourcePaths": ["src/components/**", "src/tokens/**"]
    },
    {
      "name": "billing",
      "sourcePaths": ["src/billing/**"],
      "dependsOn": ["shared"],
      "pages": ["billing-*"],
      "requiredDocuments": ["src/billing/DESIGN.md"],
      "sourceChecks": ["billing-source"]
    },
    {
      "name": "shipping",
      "sourcePaths": ["src/shipping/**"],
      "dependsOn": ["shared"],
      "pages": ["shipping-*"],
      "requiredDocuments": ["src/shipping/DESIGN.md"],
      "sourceChecks": ["shipping-source"]
    }
  ],
  "evidenceReuse": {
    "environmentKey": "local-build-and-fixture-data-v7",
    "maxAgeMs": 3600000
  }
}
```

The page patterns must match existing configured page names. Provider IDs must
name enabled entries in `sourceChecks`; declare a separate bundled provider per
independently reviewable source scope. For example, `billing-source` can be an
Impeccable provider with `targets: ["src/billing"]`. A provider's own targets and
context discovery are always respected; scope exclusions cannot conceal them.
External command providers have unknown dependencies and are **never reused**.
Their owning scopes and dependents also run conservatively.

A scope can be input-only, as `shared` is above. `dependsOn` names other scopes and
inherits their inputs, documents, and provider validity conditions transitively;
it is not a command-execution ordering mechanism. Missing dependencies, cycles,
duplicate scope names, invalid selections, and unknown/disabled providers are
configuration errors. Up to 128 scopes are supported.

`sourcePaths` uses the same project-relative include/exclude semantics and bounded
inventory as [glob selection](scopes.md). These are additional inputs: top-level
exclusions do not override a scope's explicit inputs. Optional `viewports` filters
an owning scope's configured pages; all their configured checkpoints remain
obligations. A state assigned to several scopes is reusable only when all owners
and dependencies are valid. Unassigned states/providers always execute.

Optional `documents` selects already loaded project documents by path. Exact
`requiredDocuments` both assigns those documents to the scope and requires every
one to be loaded; a glob finding some existing DESIGN.md files does not prove that
all applications have one. Authored-design validation still applies. Top-level
`DESIGN.md` and `STYLE.md` always remain global. Other unassigned documents are also
global. Scoped documents inherit the existing expansion and byte limits.

## What invalidates evidence

A local input addition, deletion, rename, content change, or newly matched glob
invalidates its owners and their dependents. Input identity includes the resolved
path and a file symlink's target, so retargeting a checkpoint invalidates evidence
even when its old and new modules contain identical bytes. Artifact checksums stay
byte-only so copied screenshots remain verifiable. Shared inputs invalidate all dependent
scopes. Any inventoried input with no declared owner is a **global fallback**:
its membership or content change invalidates every scope. The plan lists these
inputs explicitly instead of assuming they cannot matter.

Configuration, scope definitions, executable rules, global documents, policy,
preferences, engine/dependency files, platform, Node version, and browser identity
are conservatively global. Scope document content and bundled-provider input,
context, and binary identities participate in the relevant scope fingerprints.
The resolved runtime URL is also global: changing `--url` or `VIEWRULE_BASE_URL`
invalidates reuse, while leaving the committed contract unchanged. A server restart
on the same URL still requires a new `environmentKey` when its relevant state changes.
Checkpoint setup and storage-state files are included even outside source globs or
Git's inventory, and must remain inside the project for scoped reviews. Storage
state is always global, even when its path matches one application's source scope.
A checkpoint's setup file also belongs to every scope owning that checkpoint's
browser state, regardless of its source directory. Declare setup-module imports,
build inputs, assets, and application dependencies in the
appropriate input scope or the global fallback. There is no import-graph inference.

`environmentKey` is a **nonsecret, operator-supplied identity** for everything file
hashes cannot establish: the running deployment, remote data, feature flags,
authentication context, OS fonts, and other relevant environment state. Change it
when any such input changes. A source hash does not prove the server is serving
that source. Do not enable reuse against uncontrolled live data with a constant
key. Missing reuse settings or an unavailable browser identity make the relevant
scopes unknown and force execution, not optimistic skipping.

`maxAgeMs` must be explicit, from 1,000 through 86,400,000 milliseconds. Expiry uses
**original measurement time**, never the time a reused report was assembled. The
Stop hook enforces this limit too. An age bound limits staleness; it does not replace
the environment identity contract.

Scoped checks explicitly launch the same browser executable whose bytes are
fingerprinted (`VIEWRULE_BROWSER_PATH`, the legacy alias, or Playwright's pinned
Chromium executable). Legacy configurations retain their existing launch behavior.
No browser or provider is downloaded by planning, checking, or hook enforcement.

## Evidence and pass semantics

The last verified **passing complete run** is the only reuse source. Missing,
failed, incompatible, interrupted, or checksum-invalid reports fall back to new
execution. No cache daemon, database, older-run search, or automatic approval is
introduced. A failed run is not a cache of successful sub-results.

Each reused page/provider retains its original run ID and measurement timestamp,
plus the immediately preceding report it was reused from. Original provider timings
remain original timings; the execution summary separately counts providers actually
run this time. Screenshots and detail tiles are verified and copied into the new
run, so each report is self-contained. Missing or altered artifacts invalidate their
owning scopes; an artifact changing during copying fails the run.

Local findings are preserved separately from aggregate findings. Cross-page and
cross-viewport rules and required design coverage are reevaluated over the entire
fresh/reused observation set. A reused page can therefore receive a new aggregate
failure when another page changes. Reuse never waives a rule or preserves an old
aggregate pass without recomputation.

All required browser states and enabled source providers must be represented in a
passing report. The Stop hook verifies the whole-source fingerprint, report and
artifact checksums, complete obligation membership, and original evidence age.
An incomplete run cannot become a whole-project pass. Reused evidence older than
an approved baseline is not described as a newly resolved finding or new visual
comparison. JSON and HTML distinguish new work from reuse; assembling a report does
not claim a fresh screenshot or human approval.

Checksums detect missing/corrupt evidence; they are not a cryptographic attestation
against someone able to rewrite both reports and their latest-state checksum.

## Validation and measurements

The existing installed-CLI workflow exercises two pages, a checkpoint, shared
inputs, two real bundled source providers, required documents, and a cross-page
encoding rule. It checks full, unchanged, local-change, cross-page-failure, recovery,
corrupted-artifact, forced-full, and expired-evidence runs. Read-only plans also
exercise scope removal, environment changes, unknown providers, cycles, new glob
matches, and global fallback inputs.

The workflow writes its synthetic inputs, configuration, observed execution counts,
versions, and elapsed times to `dist/review-evidence/incremental-workload.json`,
retained in the existing CI evidence artifact. These are observations of one
workload, not a promised speedup. Viewrule does not measure agent tokens or provider
dollar cost here.

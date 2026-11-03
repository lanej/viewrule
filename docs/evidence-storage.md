# Bounded local evidence

Available in the unreleased engine. Check `viewrule --help` for `prune` before
using these commands; engine 0.10.0 does not clean up old runs.

Completed checks now prune disposable `.ui-review/runs/` history automatically.
Defaults retain at most **three runs**, for at most **seven days**, within **256 MiB**
of logical file bytes. The current report named by `latest.json` is always retained,
even if it fails checks or exceeds the age or byte budget. Its evidence is never
partially deleted. `check` prints the cleanup result in `retention`; `overBudget`
means that the current report alone exceeds the budget. Cleanup errors are reported
there without hiding or changing the check result.

Clean up an existing backlog without starting a browser:

```sh
viewrule prune --dry-run
viewrule prune
```

Set any of these optional limits in `.ui-review/config.json`:

```json
{
  "runRetention": {
    "maxRuns": 3,
    "maxAgeDays": 7,
    "maxBytes": 268435456
  }
}
```

Newest runs are preferred; the current run counts toward all limits. The cleanup
only removes directories with engine-generated run names. It does not follow run
symlinks, touch unknown directories, or change config, rules, feedback, authentication,
approved references, or exported comparisons. These deliberately saved artifacts
remain outside the disposable-run budget and can still consume space. Nothing is
pruned by `plan`, `verify`, `lint`, or a Git gate. Concurrent checks on the same
project remain unsupported. Cleanup refuses a running/interrupted state; a fresh
completed check restores normal housekeeping.

Before a long repair session, copy any baseline that must outlive the retention
window to a chosen location outside `runs/`. `compare` accepts that saved
`report.json` and its adjacent artifacts. Exported comparisons contain independent
copies of both reports and screenshots. An approval also has its own exact copy
under `.ui-review/approved/`; deleting its original disposable run does not erase
the approval. Approval still requires actual human feedback.

## Less repeated work

For captures up to 24 million pixels with stable dimensions, detail tiles are
lossless crops of the single native-scale overview PNG. This replaces one browser
screenshot per tile with local pixel copies; coverage, tile geometry and dimensions
are still checked. Larger captures or dimensions that change after the overview use
the existing per-tile capture path to bound decoded-image memory.

Reused and reference PNG copies request filesystem copy-on-write cloning, falling
back to ordinary copies where unsupported. They remain independent files, not hard
links; changing one run cannot modify another run or an approved reference. Reuse
still verifies hashes and preserves original capture times. Pruning an origin run
does not break a newer self-contained report.

Browser measurements, accessibility analysis, source diagnostics, and complete
configured coverage still have a cost. Use `lint` for source-only diagnostics and
the explicitly configured [incremental workflow](incremental-review.md) for verified
reuse. `check --full` always recaptures; retention never turns stale evidence into a
passing review.

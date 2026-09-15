# Reviewed detector results

Source: [CI run 34989758519](https://github.com/lanej/viewrule/actions/runs/34989758519), benchmark code c62fe8a3e4cf78599d379c4e8f5c9386f5e57d6d.
[Original result JSON](results-2026-09-15.json) is preserved unchanged from the CI log.
Its provenance commit is GitHub's temporary PR merge commit. All CI checks passed.

Reviewed by the coding assistant against fixture source and raw DOM diagnostics;
this is not independent human review or screenshot adjudication. All 59 Viewrule
findings and 24 Impeccable findings correspond to seeded defects. No additional,
unresolved, or task-relative false-positive diagnostics were observed in this corpus.
The raw JSON's unreviewed markers describe its state at generation; this document
records the subsequent review without rewriting the evidence.

| Case | Viewport | Seed present | Viewrule | Impeccable |
| --- | --- | --- | --- | --- |
| reference | desktop | No | Clean | Clean |
| reference | wide | No | Clean | Clean |
| finite-control | desktop | No | Clean | Clean |
| finite-control | wide | No | Clean | Clean |
| hidden-alternatives | desktop | Yes | Detected | Missed |
| hidden-alternatives | wide | Yes | Detected | Missed |
| lost-context | desktop | Yes | Detected | Missed |
| lost-context | wide | Yes | Detected | Missed |
| stretched | desktop | No | Clean | Clean |
| stretched | wide | Yes | Detected | Missed |
| clipped-labels | desktop | Yes | Detected | Detected |
| clipped-labels | wide | Yes | Detected | Detected |
| spacious-dashboard | desktop | Yes | Detected | Missed |
| spacious-dashboard | wide | No | Clean | Clean |
| cross-viewport | desktop | No | Clean | Clean |
| cross-viewport | wide | Yes | Detected | Missed |
| after-filter | desktop | Yes | Detected | Missed |
| after-filter | wide | Yes | Detected | Missed |

A detection counts once per seeded viewport/state, regardless of duplicate or
per-element findings. Viewrule detected 11 and missed 0; Impeccable detected 2 and
missed 9. Both were clean on seven unseeded states. Clean means no emitted findings,
not proof that the UI has no possible defects.

## Diagnostic dispositions

- Hidden alternatives: four complete comparisons against a requirement of eight;
  both count and identity findings identify the same seed at each viewport.
- Lost context and after-filter: the required visible, nonempty .period is absent.
- Stretched wide layout: 24 adjacent-value gaps of 1103.17 or 1143.81 CSS pixels
  exceed the declared 150-pixel boundary; repeated row findings count as one seed.
- Clipped labels: all twelve span.service-label elements have a 90-pixel client
  width and scroll widths of 161–213 pixels at each viewport. Impeccable's twelve
  text-overflow snippets per viewport report the matching 71–123-pixel excesses.
- Spacious desktop dashboard: only two complete alternatives fit, against eight.
- Cross-viewport identity loss: carrier-2 is explicitly reported missing on wide.

All Impeccable findings are matching label-overflow detections; its other seeded
states contain empty finding arrays. This does not establish that an agent using
Impeccable would miss those requirements. Viewrule received an authored contract;
Impeccable ran its default detector without suppression. The corpus deliberately
emphasizes Viewrule use cases and is too narrow for a general product ranking.

## Remaining experiment

The [three-arm repair trial](agent-trial.md) has not run. Neutral task preparation,
a pinned authenticated agent/browser runner, frozen held-out evaluation, transcripts,
repairs, and semantic review are still needed. Issue #22 remains open.

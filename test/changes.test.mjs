import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyChanges, findingIdentity } from "../src/changes.mjs";

const viewport = { name: "desktop", width: 1280, height: 800 };
function page(findings, designCoverage = []) {
  return { name: "Comparison", checkpoint: "open", url: "http://example.test", viewport, findings, designCoverage };
}
function report(id, findings, designCoverage = []) {
  return { id, pages: [page(findings, designCoverage)] };
}

test("finding identity survives wording and evidence changes", () => {
  const a = { rule: "no-clip", severity: "error", selector: ".label", message: "clipped", actual: 3 };
  const b = { ...a, message: "Label is clipped", actual: 7, severity: "warning" };
  assert.equal(findingIdentity(a, page([])), findingIdentity(b, page([])));
});

test("classifies new persistent and resolved findings against approval", () => {
  const persistent = { rule: "no-clip", severity: "error", selector: ".label", message: "still clipped" };
  const resolved = { rule: "no-overlap", severity: "error", selector: ".card", message: "overlap" };
  const added = { rule: "min-size", severity: "warning", selector: ".button", message: "small" };
  const baseline = report("approved", [persistent, resolved]);
  const current = report("current", [{ ...persistent, message: "wording changed" }, added]);
  const changes = classifyChanges(current, baseline);
  assert.equal(changes.comparison, "available");
  assert.equal(changes.persistentFindings.length, 1);
  assert.equal(changes.newFindings.length, 1);
  assert.equal(changes.resolvedFindings.length, 1);
  assert.equal(changes.baselineId, "approved");
  assert.ok(current.pages[0].findings.every((finding) => finding.identity));
});

test("first run is explicit and newly unassessed is a delta", () => {
  const current = report("current", [{ rule: "no-clip", severity: "error", message: "x" }]);
  const first = classifyChanges(current);
  assert.equal(first.comparison, "unavailable");
  assert.equal(first.newFindings.length, 1);

  const baseline = report("approved", [], [{ id: "VR-DESIGN-001", status: "automated" }]);
  const next = report("next", [], [{ id: "VR-DESIGN-001", status: "unassessed" }]);
  const delta = classifyChanges(next, baseline);
  assert.equal(delta.newlyUnassessed.length, 1);
  assert.equal(delta.newlyUnassessed[0].designRule, "VR-DESIGN-001");
});

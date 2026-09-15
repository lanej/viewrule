import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runSourceChecks } from "../src/source-checks.mjs";

test("source-check adapters normalize provenance and advisory authority", async (t) => {
  const project = await mkdtemp(path.join(tmpdir(), "viewrule-source-check-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const provider = path.join(project, "provider.mjs");
  await writeFile(
    provider,
    'console.log(JSON.stringify({findings:[{rule:"token-drift",severity:"error",message:"Use spacing token",file:"src/card.css",line:4}]}));\n',
  );
  const [result] = await runSourceChecks(project, [
    {
      id: "fixture",
      command: [process.execPath, "provider.mjs"],
      authority: "advisory",
      version: "1.2.3",
    },
  ]);
  assert.equal(result.provider.id, "fixture");
  assert.equal(result.findings[0].rule, "source:fixture:token-drift");
  assert.equal(result.findings[0].severity, "warning");
  assert.equal(result.findings[0].sourceCheck.authority, "advisory");
  assert.equal(result.findings[0].sourceCheck.originalSeverity, "error");
});

test("source-check severity can be mapped for blocking providers", async (t) => {
  const project = await mkdtemp(path.join(tmpdir(), "viewrule-source-check-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  await writeFile(
    path.join(project, "provider.mjs"),
    'console.log(JSON.stringify([{rule:"hard",severity:"fatal",message:"Broken"}]));\n',
  );
  const [result] = await runSourceChecks(project, [
    {
      id: "fixture",
      command: [process.execPath, "provider.mjs"],
      authority: "blocking",
      severityMap: { fatal: "error" },
    },
  ]);
  assert.equal(result.findings[0].severity, "error");
  assert.equal(result.findings[0].sourceCheck.authority, "blocking");
});

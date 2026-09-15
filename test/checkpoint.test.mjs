import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkpointPath, runCheckpoint } from "../src/checkpoints.mjs";

test("checkpoint setup is project-local and receives Playwright objects", async (t) => {
  const project = await mkdtemp(path.join(tmpdir(), "viewrule-checkpoint-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(path.join(project, "checks"));
  await writeFile(
    path.join(project, "checks/open.mjs"),
    "export default async ({ page, checkpoint }) => { page.seen = checkpoint.name; };\n",
  );
  const page = {};
  const checkpoint = { name: "details-open", setup: "checks/open.mjs" };
  await runCheckpoint(project, checkpoint, page, {});
  assert.equal(page.seen, "details-open");
  assert.equal(
    checkpointPath(project, checkpoint.setup),
    path.join(project, checkpoint.setup),
  );
  assert.throws(
    () => checkpointPath(project, "../escape.mjs"),
    /inside the project/,
  );
});

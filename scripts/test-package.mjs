import { runContinuityCheckpoint } from "../docs/examples/continuity-checkpoint.mjs";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, mkdir, copyFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { runPriorityCheckpoint } from "../docs/examples/priority-checkpoint.mjs";
import { validateRules } from "../src/config.mjs";

// Exercise the packed engine's installed review and contract-authoring workflows.
const dir = await mkdtemp(path.join(tmpdir(), "viewrule-package-"));
const root = path.resolve(import.meta.dirname, "..");
try {
  execFileSync(process.execPath, ["scripts/agents.mjs", "--check"], {
    cwd: root,
    stdio: "inherit",
  });
  validateRules(
    JSON.parse(
      await readFile(
        path.join(root, "docs/examples/priority-rules.json"),
        "utf8",
      ),
    ),
  );
  validateRules(
    JSON.parse(
      await readFile(
        path.join(root, "docs/examples/continuity-rules.json"),
        "utf8",
      ),
    ),
  );
  await runContinuityCheckpoint(root);
  await runPriorityCheckpoint(root);
  execFileSync(process.execPath, ["scripts/site.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  const [packed] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", dir], {
      cwd: root,
      encoding: "utf8",
    }),
  );
  if (packed.files.some(({ path: file }) => file.endsWith("/engine.json")))
    throw new Error(
      "Engine installation pins must stay outside the engine archive to avoid a self-referential checksum.",
    );
  const archive = path.join(dir, packed.filename);
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  const pin = JSON.parse(
    await readFile(path.join(root, "skills/viewrule/engine.json"), "utf8"),
  );
  if (
    process.env.VIEWRULE_VERIFY_PLUGIN_PIN === "true" &&
    pin.version === packed.version &&
    pin.sha256 !== digest
  )
    throw new Error(
      `Plugin pin does not match packed engine: expected ${pin.sha256}, packed ${digest}. Update the pin from the tested archive.`,
    );
  execFileSync(
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "test/design-contract.test.mjs",
      "test/review.test.mjs",
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, VIEWRULE_TEST_ARCHIVE: archive },
    },
  );
  // Release CI publishes precisely the archive that passed, not a second pack.
  await mkdir(path.join(root, "dist"), { recursive: true });
  await copyFile(archive, path.join(root, "dist", packed.filename));
  console.log(`Tested archive SHA-256: ${digest}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}

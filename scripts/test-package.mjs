import { execFileSync } from "node:child_process";
import { mkdtemp, rm, mkdir, copyFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

// One workflow installs the packed engine through the isolated Claude plugin.
const dir = await mkdtemp(path.join(tmpdir(), "viewrule-package-"));
const root = path.resolve(import.meta.dirname, "..");
try {
  const [packed] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", dir], {
      cwd: root,
      encoding: "utf8",
    }),
  );
  const archive = path.join(dir, packed.filename);
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  const pin = JSON.parse(
    await readFile(path.join(root, "plugins/claude-code/engine.json"), "utf8"),
  );
  if (
    process.env.VIEWRULE_VERIFY_PLUGIN_PIN === "true" &&
    pin.version === packed.version &&
    pin.sha256 !== digest
  )
    throw new Error(
      `Plugin pin does not match packed engine: expected ${pin.sha256}, packed ${digest}. Update the pin from the tested archive.`,
    );
  execFileSync(process.execPath, ["--test", "test/review.test.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, VIEWRULE_TEST_ARCHIVE: archive },
  });
  // Release CI publishes precisely the archive that passed, not a second pack.
  await mkdir(path.join(root, "dist"), { recursive: true });
  await copyFile(archive, path.join(root, "dist", packed.filename));
  console.log(`Tested archive SHA-256: ${digest}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}

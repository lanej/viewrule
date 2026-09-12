import { execFileSync } from "node:child_process";
import { mkdtemp, rm, mkdir, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// One workflow installs the packed engine through the isolated Claude plugin.
const dir = await mkdtemp(path.join(tmpdir(), "viewrule-package-"));
const root = path.resolve(import.meta.dirname, "..");
try {
  const [packed] = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", dir], {cwd: root, encoding: "utf8"}));
  const archive = path.join(dir, packed.filename);
  execFileSync(process.execPath, ["--test", "test/review.test.mjs"], {
    cwd: root, stdio: "inherit",
    env: {...process.env, VIEWRULE_TEST_ARCHIVE: archive},
  });
  // Release CI publishes precisely the archive that passed, not a second pack.
  await mkdir(path.join(root, "dist"), {recursive: true});
  await copyFile(archive, path.join(root, "dist", packed.filename));
} finally {
  await rm(dir, {recursive: true, force: true});
}

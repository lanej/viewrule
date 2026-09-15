import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const sha256 = createHash("sha256")
  .update(await readFile("/tmp/engine.tgz"))
  .digest("hex");
const version = JSON.parse(
  await readFile("/opt/plugin/engine.json", "utf8"),
).version;
const pin = {
  version,
  sha256,
  url: "https://invalid.local/preinstalled-development-archive.tgz",
};
const root = `/opt/assistance/${version}-${sha256}`;
await mkdir(root, { recursive: true });
execFileSync(
  "npm",
  [
    "install",
    "--prefix",
    root,
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "/tmp/engine.tgz",
  ],
  { stdio: "inherit" },
);
await writeFile(`${root}/installed.json`, JSON.stringify(pin) + "\n");
await writeFile("/opt/plugin/engine.json", JSON.stringify(pin) + "\n");

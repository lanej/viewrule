import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import path from "node:path";
import { walkFiles } from "./scopes.mjs";
import { policyPaths } from "./design.mjs";

export async function engineVersion() {
  const metadata = JSON.parse(
    await readFile(path.resolve(import.meta.dirname, "../package.json"), "utf8"),
  );
  if (typeof metadata.version !== "string" || !metadata.version)
    throw new Error("viewrule package.json has no version");
  return metadata.version;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
export function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
/** Stream large source/browser inputs instead of buffering an executable in memory. */
export async function fileDigest(file) {
  const hash = createHash("sha256");
  try {
    for await (const bytes of createReadStream(file)) hash.update(bytes);
    return hash.digest("hex");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
/** Source identity includes link resolution: byte-identical modules at different
 * real paths can resolve relative imports differently. Keep fileDigest byte-only
 * for evidence artifacts that are copied under new names. Missing inputs remain
 * fingerprintable; dangling links still contribute their declared target. */
export async function inputDigest(file) {
  let link = null;
  let resolved = null;
  try {
    if ((await lstat(file)).isSymbolicLink()) link = await readlink(file);
    resolved = await realpath(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return digest({ link, resolved, content: await fileDigest(file) });
}
/** Includes new engine modules automatically; a release cannot preserve stale evidence
 * merely because someone forgot to extend a manually maintained filename list. */
export async function engineFingerprint() {
  const root = path.resolve(import.meta.dirname, "..");
  const files = new Set(["package.json", "npm-shrinkwrap.json"]);
  for (const directory of [
    "src",
    "bin",
    "presets",
    "plugins/claude-code/scripts",
  ])
    for await (const file of walkFiles(path.join(root, directory)))
      files.add(`${directory}/${file}`);
  for (const file of policyPaths) files.add(path.relative(root, file));
  const inputs = [];
  for (const file of [...files].sort())
    inputs.push([file, await fileDigest(path.join(root, file))]);
  return digest(inputs);
}

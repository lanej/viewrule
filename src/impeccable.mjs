import { createRequire } from "node:module";
import { readFile, access, readdir, stat, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";

// Local detector inputs in the pinned Impeccable 4.1.0 / engine 0.1.5.
// Keep these aligned with crates/detect/src/{file_system,design_system}.rs
// when upgrading. Context candidates deliberately include unused alternatives:
// adding a nearer DESIGN.md or changing workspace ownership must stale a pass.
const skippedDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  "__pycache__",
]);
const hiddenSourceDirectories = new Set([
  ".vitepress",
  ".vuepress",
  ".storybook",
]);
const sourceExtension =
  /\.(?:html?|css|scss|sass|less|jsx?|tsx?|vue|svelte|astro|blade\.php)$/i;
export const impeccableContextFiles = [
  ...["", ".agents/context", "docs"].flatMap((directory) =>
    ["DESIGN.md", "Design.md", "design.md", "DESIGN.json"].map((file) =>
      path.join(directory, file),
    ),
  ),
  ".impeccable/design.json",
  ".impeccable/config.json",
  ".impeccable/config.local.json",
  "package.json",
  "pnpm-workspace.yaml",
  "lerna.json",
  "turbo.json",
  "nx.json",
];

async function metadata(file) {
  try {
    return await stat(file);
  } catch (error) {
    if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
    return null;
  }
}

/** Source files selected by the native local scanner, including explicit ignored targets.
 * @param {string} cwd
 * @param {string[]} targets */
export async function impeccableInputs(cwd, targets) {
  const files = new Set();
  const directories = new Set([cwd]);
  async function walk(directory) {
    directories.add(directory);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (skippedDirectories.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (
          !entry.name.startsWith(".") ||
          hiddenSourceDirectories.has(entry.name)
        )
          await walk(file);
      } else if (sourceExtension.test(entry.name)) files.add(file);
    }
  }
  for (const target of targets) {
    const file = path.resolve(cwd, target);
    if ((await metadata(file))?.isDirectory()) await walk(file);
    else {
      files.add(file);
      directories.add(path.dirname(file));
    }
  }
  return { files, directories };
}

/** Conservatively fingerprint design discovery, without duplicating its precedence/glob rules.
 * Only named context inputs and boundary existence are read; unrelated parent files
 * and Git internals are never crawled. Missing candidates participate via the file list.
 * @param {Set<string>} starts */
export async function impeccableContextFingerprint(starts) {
  if (!starts.size) return "no-impeccable-context";
  const directories = new Set();
  const homes = new Set([homedir(), await realpath(homedir())]);
  for (const start of starts) {
    let directory = path.resolve(start);
    while (!directories.has(directory)) {
      directories.add(directory);
      if (
        homes.has(directory) ||
        (await metadata(path.join(directory, ".git")))
      )
        break;
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  const hash = createHash("sha256");
  for (const directory of [...directories].sort()) {
    // Presence of these paths also controls project/workspace inheritance.
    for (const name of [
      ".git",
      ".impeccable",
      "apps",
      "packages",
      ...impeccableContextFiles,
    ]) {
      const file = path.join(directory, name);
      const info = await metadata(file);
      hash.update(
        file +
          "\0" +
          (info ? (info.isDirectory() ? "directory" : "file") : "missing") +
          "\0",
      );
      if (info?.isFile() && impeccableContextFiles.includes(name))
        hash.update(await readFile(file));
    }
  }
  return hash.digest("hex");
}

/** @param {string[]} [targets] @returns {import("./types.js").SourceCheckProvider} */
export function impeccableProvider(targets = ["."]) {
  return {
    id: "impeccable",
    format: "impeccable",
    targets,
    authority: "advisory",
  };
}

// Resolve from Viewrule's dependency, never the application's PATH, user cache,
// environment override, or a download during a check.
export async function installedImpeccable() {
  const require = createRequire(import.meta.url);
  const packageFile = require.resolve("impeccable/package.json");
  const cli = JSON.parse(await readFile(packageFile, "utf8"));
  const own = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  if (cli.version !== own.dependencies.impeccable)
    throw new Error(
      "Installed Impeccable does not match Viewrule's pinned dependency; reinstall Viewrule.",
    );
  const platform = { win32: "windows", darwin: "darwin", linux: "linux" }[
    process.platform
  ];
  const name = `@impeccable/cli-${platform}-${process.arch}`;
  const expected = cli.optionalDependencies[name];
  if (!expected)
    throw new Error(
      `Impeccable does not support ${process.platform}/${process.arch}.`,
    );
  let engineFile;
  try {
    engineFile = createRequire(packageFile).resolve(`${name}/package.json`);
  } catch {
    throw new Error(
      `Impeccable engine is missing; reinstall Viewrule with npm --include=optional (${name}@${expected}). No engine was downloaded during this check.`,
    );
  }
  const engine = JSON.parse(await readFile(engineFile, "utf8"));
  if (engine.version !== expected)
    throw new Error(
      "Installed Impeccable engine does not match its pin; reinstall Viewrule.",
    );
  const binary = path.join(
    path.dirname(engineFile),
    "bin",
    process.platform === "win32" ? "impeccable.exe" : "impeccable",
  );
  await access(binary);
  return {
    binary,
    version: cli.version,
    engineVersion: engine.version,
    binarySHA256: createHash("sha256")
      .update(await readFile(binary))
      .digest("hex"),
  };
}

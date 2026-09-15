import { createRequire } from "node:module";
import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

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

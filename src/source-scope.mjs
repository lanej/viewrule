import { spawnSync } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { impeccableInputs } from "./impeccable.mjs";
import {
  excludedDirectories,
  walkFiles,
  pathSelection,
  selected,
  matches,
} from "./scopes.mjs";

/** Check the nearest existing ancestor too, so a missing target below an escaping
 * symlink cannot make discovery leave the project. Deleted inputs remain valid. */
export async function contained(project, file) {
  let candidate = path.resolve(project, file);
  while (true) {
    try {
      const relative = path.relative(project, await realpath(candidate));
      if (
        relative === ".." ||
        relative.startsWith(".." + path.sep) ||
        path.isAbsolute(relative)
      )
        throw new Error(`Source input resolves outside the project: ${file}`);
      return;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = path.dirname(candidate);
      if (parent === candidate) throw error;
      candidate = parent;
    }
  }
}

/** The same conservative input union drives plan output and freshness. Provider
 * targets have their own semantics; sourcePaths exclusions do not override them.
 * @param {string} project @param {import("./types.js").ProjectConfig} config */
export async function resolveSourceScope(project, config) {
  project = await realpath(project);
  const scope = pathSelection(config.sourcePaths);
  const listed = spawnSync(
    "git",
    [
      "-C",
      project,
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
    ],
    {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const candidates = new Set();
  if (listed.status === 0)
    for (const file of listed.stdout.split("\0").filter(Boolean))
      candidates.add(file);
  else for await (const file of walkFiles(project)) candidates.add(file);
  /** @type {Map<string, Set<string>>} */
  const files = new Map();
  function add(file, reason) {
    if (!files.has(file)) files.set(file, new Set());
    files.get(file).add(reason);
  }
  const sourceFiles = [...candidates]
    .filter(
      (file) =>
        !file.split("/").some((part) => excludedDirectories.has(part)) &&
        selected(file, scope, true),
    )
    .sort();
  for (const file of sourceFiles)
    for (const pattern of scope.include)
      if (matches(file, pattern, true)) add(file, `sourcePaths:${pattern}`);
  // Explicit scope inputs are additional freshness obligations, never narrowed by
  // the top-level sourcePaths selection or its exclusions.
  for (const reviewScope of config.reviewScopes ?? []) {
    const selection = pathSelection(reviewScope.sourcePaths);
    for (const file of candidates)
      if (
        !file.split("/").some((part) => excludedDirectories.has(part)) &&
        selected(file, selection, true)
      )
        add(file, `reviewScope:${reviewScope.name}`);
  }
  // Setup and authentication files can be outside source globs or Git's inventory.
  for (const file of config.reviewScopes?.length
    ? [
        config.storageState,
        ...config.pages.flatMap((page) =>
          (page.checkpoints ?? []).map((checkpoint) => checkpoint.setup),
        ),
      ].filter(Boolean)
    : []) {
    const relative = pathSelection([file]).include[0];
    add(relative, "runtime-setup");
  }
  const contextDirectories = new Set();
  const providerContexts = new Map();
  const providers = [];
  for (const provider of config.sourceChecks ?? []) {
    const enabled = provider.enabled !== false;
    const bundled = provider.format === "impeccable" && !provider.command;
    const providerFiles = [];
    if (enabled && bundled) {
      const cwd = path.resolve(project, provider.cwd ?? ".");
      await contained(project, cwd);
      for (const target of provider.targets)
        await contained(project, path.resolve(cwd, target));
      const inputs = await impeccableInputs(cwd, provider.targets);
      for (const file of inputs.files) {
        const relative = path.relative(project, file).split(path.sep).join("/");
        add(relative, `sourceCheck:${provider.id}`);
        providerFiles.push(relative);
      }
      providerContexts.set(
        provider.id,
        provider.noConfig ? new Set() : inputs.directories,
      );
      if (!provider.noConfig)
        for (const directory of inputs.directories)
          contextDirectories.add(directory);
    }
    providers.push({
      id: provider.id,
      enabled,
      authority: provider.authority,
      format: provider.format ?? "viewrule",
      cwd: provider.cwd ?? ".",
      ...(provider.targets ? { targets: provider.targets } : {}),
      inputs: !enabled ? "disabled" : bundled ? "conservative" : "unknown",
      files: providerFiles.sort(),
      reason: !enabled
        ? "Provider is disabled."
        : bundled
          ? "Pinned scanner candidates; provider configuration may exclude more. Context discovery is fingerprinted separately."
          : "External command input dependencies cannot be inferred. Declare relevant inputs in sourcePaths.",
    });
  }
  for (const file of files.keys()) await contained(project, file);
  return {
    inventory: listed.status === 0 ? "git" : "filesystem",
    sourceFiles,
    unmatched: scope.include.filter(
      (pattern) => !sourceFiles.some((file) => matches(file, pattern, true)),
    ),
    files: [...files]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([file, reasons]) => ({ path: file, reasons: [...reasons].sort() })),
    providers,
    contextDirectories,
    providerContexts,
  };
}

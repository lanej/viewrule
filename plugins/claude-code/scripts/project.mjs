import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

/** Recognize the retired command before loading an older pinned engine.
 * Legacy callers can place the global project option before the command. */
export function isLegacyHook(args) {
  let index = 0;
  while (index < args.length) {
    if (args[index] === "--project" && index + 1 < args.length) index += 2;
    else if (args[index].startsWith("--project=")) index++;
    else break;
  }
  return args[index] === "hook";
}

// Shared by the isolated plugin and packaged CLI. Keep discovery dependency-free
// so resolving an application does not need an installed engine or Git executable.
async function exists(file) {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return false;
  }
}

/** Find the nearest configured application without leaving this checkout.
 * A linked worktree/submodule uses a .git file; a normal checkout a directory.
 * Missing setup never falls back to the main worktree or creates a configuration.
 * @param {string} start */
export async function findProject(start) {
  const original = await realpath(start);
  let directory = original;
  while (true) {
    if (await exists(path.join(directory, ".ui-review/config.json")))
      return directory;
    if (await exists(path.join(directory, ".git"))) return original;
    const parent = path.dirname(directory);
    if (parent === directory) return original;
    directory = parent;
  }
}

/** Keep mutable evidence in this application, even when someone links setup files.
 * Individual configuration files may be shared deliberately; the state directory
 * must not redirect runs, latest state, or feedback into another checkout.
 * @param {string} project */
export async function assertLocalReviewDirectory(project) {
  try {
    const root = await realpath(project);
    const review = await realpath(path.join(root, ".ui-review"));
    const relative = path.relative(root, review);
    if (
      relative === ".." ||
      relative.startsWith(".." + path.sep) ||
      path.isAbsolute(relative)
    )
      throw new Error(
        ".ui-review resolves outside the project. Keep a separate .ui-review directory in each worktree; copy or commit setup files instead of sharing runs and latest.json.",
      );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

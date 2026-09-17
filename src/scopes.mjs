import path from "node:path";
import { Minimatch } from "minimatch";
import { readdir } from "node:fs/promises";

export const excludedDirectories = new Set([
  ".git",
  "node_modules",
  ".ui-review",
  "dist",
  "build",
  ".next",
  "coverage",
  ".cache",
]);

/** Arrays remain include-only shorthand. Exclusions always win, regardless of order.
 * @param {import("./types.js").Selection} value */
export function selection(value) {
  return Array.isArray(value)
    ? { include: value, exclude: [] }
    : {
        include: value.include,
        exclude: value.exclude ?? [],
      };
}

/** Normalize project-relative patterns without allowing traversal or shell negation. */
export function localPattern(value) {
  const normalized = value.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.startsWith("!") ||
    /^[a-z][a-z0-9+.-]*:/i.test(normalized) ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").includes("..")
  )
    throw new Error(
      `Scope paths must stay inside the project; use exclude for negation: ${value}`,
    );
  return path.posix.normalize(normalized).replace(/\/$/, "") || ".";
}

// Fix options rather than inheriting the host filesystem's case/separator rules.
// Compile once per pattern; matching never invokes a shell or enumerates files.
const compiled = new Map();
function matcher(pattern) {
  if (!compiled.has(pattern))
    compiled.set(
      pattern,
      new Minimatch(pattern, {
        nocase: false,
        dot: false,
        nonegate: true,
        nocomment: true,
        platform: "linux",
        windowsPathsNoEscape: true,
        magicalBraces: true,
      }),
    );
  return compiled.get(pattern);
}
export function hasMagic(value) {
  return matcher(value).hasMagic();
}

/** Literal source prefixes remain valid, including names containing glob characters.
 * @param {string} value @param {string} pattern @param {boolean} [recursive] */
export function matches(value, pattern, recursive = false) {
  if (value === pattern) return true;
  if (recursive && (pattern === "." || value.startsWith(pattern + "/")))
    return true;
  return matcher(pattern).match(value);
}

/** @param {string} value @param {import("./types.js").Selection} [scope]
 * @param {boolean} [recursive] */
export function selected(value, scope, recursive = false) {
  if (!scope) return true;
  const { include, exclude } = selection(scope);
  return (
    include.some((pattern) => matches(value, pattern, recursive)) &&
    !exclude.some((pattern) => matches(value, pattern, recursive))
  );
}

/** @param {import("./types.js").Selection} scope */
export function pathSelection(scope) {
  const { include, exclude } = selection(scope);
  return {
    include: include.map(localPattern),
    exclude: exclude.map(localPattern),
  };
}

/** Logical names are not filesystem paths: no normalization or directory inheritance.
 * Each include must match; exclusions may be anticipatory but cannot remove all names.
 * @param {import("./types.js").Selection} scope @param {string[]} names @param {string} label */
export function validateNames(scope, names, label) {
  if (!scope) return;
  const { include, exclude } = selection(scope);
  for (const pattern of [...include, ...exclude])
    if (pattern.startsWith("!") || pattern.includes("\0"))
      throw new Error(`${label}: use exclude for negation`);
  for (const pattern of include)
    if (!names.some((name) => matches(name, pattern)))
      throw new Error(`${label}: unknown name or unmatched pattern ${pattern}`);
  if (!names.some((name) => selected(name, scope)))
    throw new Error(`${label}: scope selects no names`);
}

/** @param {import("./types.js").Rule} rule @param {string} page @param {string} viewport */
export function ruleApplies(rule, page, viewport) {
  return selected(page, rule.pages) && selected(viewport, rule.viewports);
}

/** The planner, configuration loader, and browser runner share this obligation matrix.
 * @param {import("./types.js").ProjectConfig} config */
export function* reviewStates(config) {
  for (const page of config.pages)
    for (const viewport of config.viewports) {
      if (!selected(viewport.name, page.viewports)) continue;
      for (const checkpoint of page.checkpoints?.length
        ? page.checkpoints
        : [null])
        yield { page, viewport, checkpoint };
    }
}

/** Bounded fallback/discovery inventory. Never descend directory symlinks.
 * @param {string} root @param {boolean} [includeLinks]
 * @param {string[]} [patterns] */
export async function* walkFiles(root, includeLinks = false, patterns) {
  let visited = 0;
  async function* walk(relative, depth) {
    if (depth > 64)
      throw new Error(
        "Scope discovery exceeds 64 directory levels; narrow the project root",
      );
    for (const entry of await readdir(path.join(root, relative), {
      withFileTypes: true,
    })) {
      if (++visited > 100000)
        throw new Error(
          "Scope discovery exceeds 100000 entries; narrow the project root",
        );
      if (excludedDirectories.has(entry.name)) continue;
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) {
        // Partial matches prune unrelated trees before reading their contents.
        if (
          !patterns ||
          patterns.some((pattern) => matcher(pattern).match(file, true))
        )
          yield* walk(file, depth + 1);
      } else if (entry.isFile() || (includeLinks && entry.isSymbolicLink()))
        yield file;
    }
  }
  yield* walk("", 0);
}

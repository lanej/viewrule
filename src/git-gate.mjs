import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import path from "node:path";
import { validateConfig } from "./config.mjs";
import {
  excludedDirectories,
  matches,
  selected,
  pathSelection,
} from "./scopes.mjs";
import { verifyReview } from "./state.mjs";
import { impeccableContextFiles } from "./impeccable.mjs";

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
const paths = (output) => output.split("\0").filter(Boolean);

/** Read the actual index (including GIT_INDEX_FILE for partial commits), or a tree. */
function entries(root, revision) {
  const result = new Map();
  const output = revision
    ? git(root, ["ls-tree", "-rz", "--full-tree", revision])
    : git(root, ["ls-files", "--stage", "-z"]);
  for (const record of paths(output)) {
    const tab = record.indexOf("\t");
    const [mode, second, third] = record.slice(0, tab).split(" ");
    if (!revision && third !== "0")
      throw new Error(
        "Resolve the unmerged Git index before verifying a commit.",
      );
    result.set(record.slice(tab + 1), { mode, oid: revision ? third : second });
  }
  return result;
}

/** Source/provider/document scopes also select deleted and newly added Git paths. */
function isInput(file, config) {
  if ([".ui-review/config.json", ".ui-review/rules.json"].includes(file))
    return true;
  if (
    selected(
      file,
      pathSelection(config.projectDocuments ?? ["DESIGN.md", "STYLE.md"]),
    )
  )
    return true;
  const normalized = (value) =>
    value && path.posix.normalize(value.replaceAll("\\", "/"));
  if (
    file === normalized(config.storageState) ||
    config.pages.some((page) =>
      page.checkpoints?.some(
        (checkpoint) => file === normalized(checkpoint.setup),
      ),
    )
  )
    return true;
  if (
    (config.sourceChecks ?? []).some(
      (provider) =>
        provider.enabled !== false &&
        provider.targets?.some((target) =>
          matches(
            file,
            path.posix.join(provider.cwd ?? ".", target.replaceAll("\\", "/")),
            true,
          ),
        ),
    )
  )
    return true;
  if (file.split("/").some((part) => excludedDirectories.has(part)))
    return false;
  return (
    selected(file, pathSelection(config.sourcePaths), true) ||
    config.reviewScopes?.some((scope) =>
      selected(file, pathSelection(scope.sourcePaths), true),
    )
  );
}

function changed(root, base, target) {
  return base
    ? paths(
        git(root, [
          "diff",
          "--name-only",
          "-z",
          "--no-renames",
          base,
          target,
          "--",
        ]),
      )
    : [...entries(root, target).keys()];
}

function configuration(root, files, configPath) {
  const entry = files.get(configPath);
  if (!entry) return null;
  if (!["100644", "100755"].includes(entry.mode))
    throw new Error(
      `Git review configuration must be a regular file: ${configPath}`,
    );
  return validateConfig(JSON.parse(git(root, ["cat-file", "blob", entry.oid])));
}

/** Provider configuration can live above a narrowly selected source directory. */
function providerContextInputs(prefix, configs, inventory) {
  const files = new Set();
  for (const config of configs)
    for (const provider of config.sourceChecks ?? []) {
      if (
        provider.enabled === false ||
        provider.noConfig ||
        provider.command ||
        provider.format !== "impeccable"
      )
        continue;
      const cwd = path.posix.join(prefix, provider.cwd ?? ".");
      const directories = new Set([cwd]);
      for (const file of inventory)
        if (
          provider.targets.some((target) =>
            matches(
              file,
              path.posix.join(cwd, target.replaceAll("\\", "/")),
              true,
            ),
          )
        )
          directories.add(path.posix.dirname(file));
      for (let directory of directories)
        while (true) {
          for (const name of impeccableContextFiles)
            files.add(path.posix.join(directory, name.replaceAll("\\", "/")));
          if (directory === ".") break;
          directory = path.posix.dirname(directory);
        }
    }
  return files;
}

/** Compare raw Git blobs, not filtered diffs: an unstaged fix cannot certify the index. */
async function matchesTree(root, file, entry, algorithm) {
  const absolute = path.join(root, file);
  const metadata = await lstat(absolute).catch((error) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  });
  if (!entry || !metadata) return !entry && !metadata;
  if (entry.mode === "160000")
    throw new Error(
      `Review input is a Git submodule: ${file}. Verify its checked-out commit in application CI.`,
    );
  const mode = metadata.isSymbolicLink()
    ? "120000"
    : metadata.isFile()
      ? metadata.mode & 0o111
        ? "100755"
        : "100644"
      : null;
  if (mode !== entry.mode) return false;
  const bytes = metadata.isSymbolicLink()
    ? Buffer.from(await readlink(absolute))
    : await readFile(absolute);
  return (
    createHash(algorithm)
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex") === entry.oid
  );
}

async function verifyTarget(
  root,
  project,
  globalDir,
  target,
  baseline,
  changedFiles,
  label,
) {
  const prefix = path.relative(root, project).split(path.sep).join("/");
  if (prefix === ".." || prefix.startsWith("../") || path.isAbsolute(prefix))
    throw new Error("The review application must be inside the Git checkout.");
  const relative = (file) =>
    !prefix
      ? file
      : file.startsWith(prefix + "/")
        ? file.slice(prefix.length + 1)
        : null;
  const configPath = [prefix, ".ui-review/config.json"]
    .filter(Boolean)
    .join("/");
  const configs = [
    configuration(root, target, configPath),
    ...baseline.map((files) => configuration(root, files, configPath)),
  ].filter(Boolean);
  // An untracked setup may still identify unrelated changes, but cannot certify a commit.
  if (!configs.length)
    configs.push(
      validateConfig(
        JSON.parse(
          await readFile(path.join(project, ".ui-review/config.json"), "utf8"),
        ),
      ),
    );
  const inventory = new Set([
    ...target.keys(),
    ...baseline.flatMap((files) => [...files.keys()]),
    ...paths(
      git(root, [
        "ls-files",
        "-z",
        "--cached",
        "--others",
        "--exclude-standard",
      ]),
    ),
  ]);
  const providerContext = providerContextInputs(prefix, configs, inventory);
  const relevant = (file) =>
    providerContext.has(file) ||
    (relative(file) !== null &&
      configs.some((config) => isInput(relative(file), config)));
  if (!changedFiles.some(relevant))
    return {
      project,
      ref: label,
      status: "skip",
      reason: "No declared UI inputs changed.",
    };
  if (!target.has(configPath))
    return {
      project,
      ref: label,
      status: "fail",
      reason: `Stage or restore ${configPath}; Git review requires its configuration in the target tree.`,
    };
  const algorithm = git(root, ["rev-parse", "--show-object-format"]).trim();
  for (const file of [...inventory].filter(relevant).sort()) {
    if (!(await matchesTree(root, file, target.get(file), algorithm)))
      return {
        project,
        ref: label,
        status: "fail",
        reason: `Reviewed working files differ from ${label}: ${file}. Make the declared UI inputs match the staged or pushed contents, then run viewrule check --project ${JSON.stringify(project)}. Viewrule does not stage, stash, or rewrite files.`,
      };
  }
  const result = await verifyReview(project, globalDir);
  return {
    project,
    ref: label,
    ...result,
    ...(result.status === "fail"
      ? {
          reason: `${result.reason} Review this application with viewrule check --project ${JSON.stringify(project)}.`,
        }
      : {}),
  };
}

/** Optional Git entrypoints only inspect existing evidence; they never run a browser. */
export async function gitGate(
  projects,
  globalDir,
  event,
  input = "",
  remote = "",
) {
  const results = [];
  const root = await realpath(
    git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim(),
  );
  for (const requested of projects) {
    const project = await realpath(requested);
    if (event === "pre-commit") {
      let head = null;
      try {
        head = git(root, ["rev-parse", "--verify", "HEAD"]).trim();
      } catch {
        /* Unborn branch. */
      }
      results.push(
        await verifyTarget(
          root,
          project,
          globalDir,
          entries(root, null),
          head ? [entries(root, head)] : [],
          paths(
            git(root, [
              "diff",
              "--cached",
              "--name-only",
              "-z",
              "--no-renames",
              "--",
            ]),
          ),
          "the Git index",
        ),
      );
    } else {
      for (const line of input.split(/\r?\n/).filter(Boolean)) {
        const fields = line.trim().split(/\s+/);
        const [localRef, local, , previous] = fields;
        if (
          fields.length !== 4 ||
          !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(local) ||
          !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(previous)
        )
          throw new Error("Expected Git pre-push ref updates on stdin.");
        if (/^0+$/.test(local)) continue; // Deleting a ref publishes no new UI.
        let bases = [previous];
        if (/^0+$/.test(previous)) {
          const knownRemote = git(root, ["remote"])
            .split("\n")
            .includes(remote);
          const history = knownRemote
            ? git(root, [
                "rev-list",
                "--boundary",
                local,
                `--not`,
                `--remotes=${remote}`,
                "--",
              ])
                .trim()
                .split("\n")
                .filter(Boolean)
            : [local];
          if (!history.length) continue; // The destination already has this history.
          bases = history
            .filter((line) => line.startsWith("-"))
            .map((line) => line.slice(1));
        }
        const files = bases.length
          ? [...new Set(bases.flatMap((base) => changed(root, base, local)))]
          : changed(root, null, local);
        results.push(
          await verifyTarget(
            root,
            project,
            globalDir,
            entries(root, local),
            bases.map((base) => entries(root, base)),
            files,
            localRef,
          ),
        );
      }
    }
  }
  return {
    status: results.some((result) => result.status === "fail")
      ? "fail"
      : results.some((result) => result.status === "pass")
        ? "pass"
        : "skip",
    projects: results,
  };
}

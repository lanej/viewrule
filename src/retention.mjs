import { lstat, readdir, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { assertLocalReviewDirectory } from "./paths.mjs";

export const retentionDefaults = {
  maxRuns: 3,
  maxAgeDays: 7,
  maxBytes: 256 * 1024 * 1024,
};

// Only directories named by runReview belong to the disposable run store.
const runName =
  /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z-[0-9a-f]{8}$/;

async function latestText(project) {
  try {
    return await readFile(path.join(project, ".ui-review/latest.json"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "null";
    throw error;
  }
}

// Count logical file bytes without following links. Only retained candidates need
// sizing: an old backlog can be removed without reading every PNG or JSON file.
async function directoryBytes(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) bytes += await directoryBytes(file);
    else if (entry.isFile()) bytes += (await lstat(file)).size;
  }
  return bytes;
}

/** Prune disposable runs only, after the latest report is published.
 * @param {string} project
 * @param {Partial<typeof retentionDefaults>} [options]
 * @param {boolean} [dryRun] */
export async function pruneRuns(project, options = {}, dryRun = false) {
  project = await realpath(project);
  await assertLocalReviewDirectory(project);
  const limits = { ...retentionDefaults, ...options };
  const root = path.join(project, ".ui-review/runs");
  const snapshot = await latestText(project);
  const latest = JSON.parse(snapshot);
  if (latest?.status === "running")
    throw new Error(
      "A review is running or was interrupted. Finish a fresh check before pruning.",
    );
  let protectedRun = null;
  if (latest?.reportFile) {
    const file = path.resolve(latest.reportFile);
    const directory = path.dirname(file);
    if (
      path.dirname(directory) !== root ||
      path.basename(file) !== "report.json" ||
      !runName.test(path.basename(directory))
    )
      throw new Error(
        "Latest report is outside the managed run store; refusing to prune.",
      );
    protectedRun = path.basename(directory);
  }
  let entries;
  try {
    if (!(await lstat(root)).isDirectory() || (await realpath(root)) !== root)
      throw new Error(
        "The run store must be a local directory, not a symlink.",
      );
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    entries = [];
  }
  const runs = entries
    .filter((entry) => entry.isDirectory() && runName.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const retained = [];
  const removed = [];
  let retainedBytes = 0;
  if (protectedRun && runs.includes(protectedRun)) {
    retained.push(protectedRun);
    retainedBytes = await directoryBytes(path.join(root, protectedRun));
  }
  const cutoff = Date.now() - limits.maxAgeDays * 86400000;
  for (const id of runs) {
    if (id === protectedRun) continue;
    const [, date, hours, minutes, seconds, milliseconds] = runName.exec(id);
    const created = Date.parse(
      `${date}T${hours}:${minutes}:${seconds}.${milliseconds}Z`,
    );
    if (created < cutoff || retained.length >= limits.maxRuns) {
      removed.push(id);
      continue;
    }
    const bytes = await directoryBytes(path.join(root, id));
    if (retainedBytes + bytes > limits.maxBytes) removed.push(id);
    else {
      retained.push(id);
      retainedBytes += bytes;
    }
  }
  if (!dryRun) {
    // Do not apply a plan if another check replaced latest while it was built.
    if ((await latestText(project)) !== snapshot)
      throw new Error(
        "Review state changed while planning cleanup; retry after the check finishes.",
      );
    for (const id of removed)
      await rm(path.join(root, id), { recursive: true, force: true });
  }
  return {
    dryRun,
    limits,
    removed,
    retained,
    retainedBytes,
    overBudget: retainedBytes > limits.maxBytes,
  };
}

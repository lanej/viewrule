import { lstat } from "node:fs/promises";
import path from "node:path";
import { digest, fileDigest } from "./fingerprints.mjs";
import { readJSON } from "./config.mjs";
import { feedbackEntries } from "./state.mjs";
import { contained } from "./source-scope.mjs";
import { walkFiles } from "./scopes.mjs";
import { coverageProblem } from "./incremental.mjs";

const documents = ["index.html", "design-rules.html", "project-documents.html"];
const outputName =
  /^(?:(?:index|design-rules|project-documents)\.html|reference\/capture-\d+\.png|change-\d+-\d+-(?:before|after)\.png)$/;

async function boundedDigest(root, file) {
  const target = path.join(root, file);
  await contained(root, target);
  const metadata = await lstat(target);
  if (!metadata.isFile() || metadata.size > 64 * 1024 * 1024)
    throw new Error(`Invalid report artifact: ${file}`);
  return fileDigest(target);
}

/** Presentation inputs are separate from measurement dependencies. Feedback and
 * approved references can change without requiring another browser capture. */
export async function reportInputFingerprint(project, globalDir) {
  try {
    const directory = path.join(project, ".ui-review");
    const inputs = [];
    for (const file of [
      path.join(directory, "feedback.jsonl"),
      path.join(globalDir, "feedback.jsonl"),
      path.join(globalDir, "preferences.json"),
    ])
      inputs.push([file, await fileDigest(file)]);
    const approved = (await feedbackEntries(directory)).findLast(
      (entry) => entry.decision === "approve" && entry.reference,
    );
    if (approved) {
      if (!/^approved\/[^/\\.]+$/.test(approved.reference)) return null;
      const root = path.join(directory, approved.reference);
      await contained(directory, root);
      inputs.push(["reference", await boundedDigest(root, "report.json")]);
      const report = await readJSON(path.join(root, "report.json"));
      for (const page of report.pages) {
        if (!page.screenshot) continue;
        if (!/^capture-\d+\.png$/.test(page.screenshot)) return null;
        inputs.push([
          page.screenshot,
          await boundedDigest(root, page.screenshot),
        ]);
      }
    }
    return digest(inputs);
  } catch {
    // Unknown presentation inputs disable whole-report reuse; normal assembly
    // retains its existing diagnostics and missing-reference behavior.
    return null;
  }
}

/** Capture PNGs already have a measurement manifest. Hash only the remaining
 * report outputs, including copied reference images and comparison crops. */
export async function reportArtifacts(directory) {
  const artifacts = {};
  for await (const file of walkFiles(directory))
    if (outputName.test(file))
      artifacts[file] = await boundedDigest(directory, file);
  return artifacts;
}

/** Planning has already verified every required capture/provider. Only an exact,
 * complete passing report can bypass aggregation and all evidence writes. */
export async function reusableReport(plan, config, contract, before, inputs) {
  if (
    !plan ||
    plan.mode !== "incremental" ||
    plan.units.some((unit) => unit.action !== "reuse")
  )
    return false;
  const { report, directory } = plan.cache;
  if (
    !report?.reuse ||
    !inputs ||
    report.reuse.inputs !== inputs ||
    report.fingerprint !== before ||
    report.contract.hash !== contract.hash ||
    report.targetBaseURL !== config.baseURL ||
    coverageProblem(report, config)
  )
    return false;
  try {
    const artifacts = report.reuse.artifacts;
    if (!documents.every((file) => artifacts[file])) return false;
    for (const [file, hash] of Object.entries(artifacts))
      if (
        !outputName.test(file) ||
        (await boundedDigest(directory, file)) !== hash
      )
        return false;
    return true;
  } catch {
    return false;
  }
}

/** Do not return a candidate superseded or modified while it was checked. */
export async function unchangedCache(project, cache) {
  try {
    return (
      digest(await readJSON(path.join(project, ".ui-review/latest.json"))) ===
        cache.latestFingerprint &&
      (await fileDigest(cache.reportFile)) === cache.reportSHA256
    );
  } catch {
    return false;
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Resolve a checkpoint setup file without allowing it to escape the project.
 * @param {string} project
 * @param {string} setup */
export function checkpointPath(project, setup) {
  if (path.isAbsolute(setup) || setup.split(/[\\/]/).includes(".."))
    throw new Error("Checkpoint setup paths must stay inside the project");
  const file = path.resolve(project, setup);
  if (!file.startsWith(path.resolve(project) + path.sep))
    throw new Error("Checkpoint setup paths must stay inside the project");
  return file;
}

/** Load application-owned Playwright setup code. The module must default-export
 * an async function receiving { page, context, checkpoint }.
 * @param {string} project
 * @param {{name:string, setup:string}} checkpoint */
export async function runCheckpoint(project, checkpoint, page, context) {
  const file = checkpointPath(project, checkpoint.setup);
  await readFile(file);
  const module = await import(
    `${pathToFileURL(file).href}?viewrule=${Date.now()}`
  );
  if (typeof module.default !== "function")
    throw new Error(
      `Checkpoint ${checkpoint.name}: ${checkpoint.setup} must default-export a function`,
    );
  await module.default({ page, context, checkpoint });
}

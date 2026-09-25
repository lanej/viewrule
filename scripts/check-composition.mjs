import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCompositionScenario } from "../test/composition-scenario.mjs";

// Development feedback only. npm test still verifies the complete installed archive.
assert.equal(process.argv.length, 2, "Usage: npm run check:composition");
const repository = path.resolve(import.meta.dirname, "..");
const exampleDirectory = path.join(repository, "docs/examples");
const project = await mkdtemp(path.join(tmpdir(), "viewrule-composition-"));
const evidenceDirectory = path.join(repository, "dist/composition-focus");
const started = performance.now();
const files = new Set([
  "composition.html",
  "composition.js",
  "composition.css",
]);
const server = createServer(async (req, res) => {
  const name = new URL(req.url, "http://localhost").pathname.replace(
    /^\/examples\//,
    "",
  );
  if (!files.has(name)) return res.writeHead(404).end();
  try {
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
      }[path.extname(name)],
    );
    res.end(await readFile(path.join(project, "src", name)));
  } catch {
    res.writeHead(500).end("Example unavailable");
  }
});
try {
  await mkdir(path.join(project, ".ui-review"));
  await mkdir(path.join(project, "src"));
  await mkdir(path.join(project, "global"));
  // Freeze and fingerprint the same fixture bytes the browser will inspect.
  for (const file of files)
    await copyFile(
      path.join(exampleDirectory, file),
      path.join(project, "src", file),
    );
  await rm(evidenceDirectory, { recursive: true, force: true });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(undefined));
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseURL = `http://127.0.0.1:${address.port}`;
  const env = {
    ...process.env,
    VIEWRULE_CONFIG_DIR: path.join(project, "global"),
    VIEWRULE_BASE_URL: baseURL,
  };
  const cli = (args) =>
    new Promise((resolve, reject) => {
      execFile(
        process.execPath,
        [path.join(repository, "bin/viewrule.mjs"), ...args],
        { cwd: project, env, timeout: 90000 },
        (error, stdout, stderr) => {
          if (error && typeof error.code !== "number") return reject(error);
          resolve({ code: error?.code ?? 0, stdout, stderr });
        },
      );
    });
  await runCompositionScenario({
    cli,
    baseURL,
    project,
    rulesPath: path.join(project, ".ui-review/rules.json"),
    exampleDirectory,
    repository,
    env,
    evidenceDirectory,
  });
  console.log(
    `Composition source check passed in ${((performance.now() - started) / 1000).toFixed(1)}s. Evidence: ${evidenceDirectory}`,
  );
  console.log(
    "Partial development validation; run npm test before delivery. No release archive was produced.",
  );
} finally {
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  await rm(project, { recursive: true, force: true });
}

// Maintenance-time import only. Normal checks and site builds are fully offline.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const manifestPath = "plugins/claude-code/guide/v1/examples.json";
const bundlePath = "docs/examples/easy-ui";
const pages = {
  "pricing.html": { anchors: ["pricing"] },
  "encodings.html": {
    anchors: [
      "encodings",
      "position",
      "area",
      "shared",
      "rescaled",
      "ornament",
      "context",
    ],
  },
};
const hash = (data) => createHash("sha256").update(data).digest("hex");

export async function validateExamples() {
  const manifest = JSON.parse(
    await readFile(path.join(root, manifestPath), "utf8"),
  );
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.repository, "https://github.com/lanej/easy-ui");
  assert.match(manifest.revision, /^[a-f0-9]{40}$/);
  for (const source of [manifest.source, manifest.stories]) {
    assert.ok(
      source.startsWith("easy-ui-react/src/examples/") &&
        !source.includes(".."),
    );
  }
  assert.deepEqual(manifest.pages, pages);
  const actual = (
    await readdir(path.join(root, bundlePath), {
      recursive: true,
      withFileTypes: true,
    })
  )
    .filter((e) => e.isFile())
    .map((e) =>
      path
        .relative(root, path.join(e.parentPath, e.name))
        .split(path.sep)
        .join("/"),
    );
  actual.push(...Object.keys(pages).map((page) => `docs/examples/${page}`));
  assert.deepEqual(
    Object.keys(manifest.files).sort(),
    actual.sort(),
    "Example asset inventory changed; reimport the source revision",
  );
  for (const [file, digest] of Object.entries(manifest.files)) {
    assert.match(String(digest), /^[a-f0-9]{64}$/);
    assert.equal(
      hash(await readFile(path.join(root, file))),
      digest,
      `${file}: imported asset changed`,
    );
  }
  return manifest;
}

async function importExamples(checkout, revision) {
  assert.ok(
    checkout && /^[a-f0-9]{40}$/.test(revision || ""),
    "Usage: npm run examples:import -- <easy-ui-checkout> <40-character-commit>",
  );
  const cwd = path.resolve(checkout);
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  assert.equal(
    git("rev-parse", "HEAD"),
    revision,
    "Checkout must match the requested revision",
  );
  assert.equal(
    git("status", "--porcelain"),
    "",
    "Commit source changes before importing",
  );
  // Dependency installation is explicit; npm ci enforces the source lockfile.
  execFileSync(
    "npm",
    ["ci", "--prefix", "scripts/preview-metrics", "--no-audit", "--no-fund"],
    { cwd, stdio: "inherit" },
  );
  execFileSync("npm", ["run", "--prefix", "scripts/preview-metrics", "build"], {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      EASY_UI_GUIDE_ONLY: "1",
      EASY_UI_PREVIEW_BASE: "./",
      EASY_UI_PREVIEW_OUT_DIR: "dist-guide",
    },
  });
  const built = path.join(cwd, "scripts/preview-metrics/dist-guide");
  // Verify required entry files and notices before replacing the prior build.
  const html = await Promise.all(
    Object.keys(pages).map(async (page) => [
      page,
      (await readFile(path.join(built, page), "utf8")).replaceAll(
        "./assets/",
        "./easy-ui/assets/",
      ),
    ]),
  );
  await readFile(path.join(built, "NOTICE.txt"));
  await rm(path.join(root, bundlePath), { recursive: true, force: true });
  await mkdir(path.join(root, bundlePath), { recursive: true });
  await cp(path.join(built, "assets"), path.join(root, bundlePath, "assets"), {
    recursive: true,
  });
  await cp(
    path.join(built, "NOTICE.txt"),
    path.join(root, bundlePath, "NOTICE.txt"),
  );
  for (const [page, content] of html)
    await writeFile(path.join(root, "docs/examples", page), content);
  const files = [
    ...Object.keys(pages).map((p) => `docs/examples/${p}`),
    `${bundlePath}/NOTICE.txt`,
    ...(await readdir(path.join(root, bundlePath, "assets"))).map(
      (p) => `${bundlePath}/assets/${p}`,
    ),
  ].sort();
  const manifest = {
    schemaVersion: 1,
    repository: "https://github.com/lanej/easy-ui",
    revision,
    source: "easy-ui-react/src/examples/DesignGuide.examples.tsx",
    stories: "easy-ui-react/src/examples/DesignGuide.stories.tsx",
    build:
      "EASY_UI_GUIDE_ONLY=1 EASY_UI_PREVIEW_BASE=./ EASY_UI_PREVIEW_OUT_DIR=dist-guide npm run --prefix scripts/preview-metrics build",
    pages,
    files: Object.fromEntries(
      await Promise.all(
        files.map(async (file) => [
          file,
          hash(await readFile(path.join(root, file))),
        ]),
      ),
    ),
  };
  await writeFile(
    path.join(root, manifestPath),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await validateExamples();
  console.log(
    `Imported Easy UI ${revision}; ${files.length} checksummed files.`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await importExamples(process.argv[2], process.argv[3]);

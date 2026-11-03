import {
  access,
  readFile,
  readdir,
  mkdir,
  writeFile,
  rm,
} from "node:fs/promises";
import path from "node:path";

// One authored skill; Claude's isolated marketplace cache needs physical copies.
const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "skills/viewrule");
const target = path.join(root, "plugins/claude-code");
const check = process.argv.slice(2);
if (check.length > 1 || (check.length && check[0] !== "--check"))
  throw new Error("Usage: node scripts/agents.mjs [--check]");
const outputs = new Map();
async function collect(directory, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(directory, file)));
    else files.push(file);
  }
  return files.sort();
}
// The portable entrypoint and workflow links must resolve inside the copied skill.
for (const file of [
  "SKILL.md",
  ...(await collect(path.join(source, "references"))).map(
    (name) => `references/${name}`,
  ),
]) {
  const markdown = await readFile(path.join(source, file), "utf8");
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].split("#")[0];
    if (!link || /^[a-z]+:/i.test(link)) continue;
    const resolved = path.resolve(source, path.dirname(file), link);
    const relative = path.relative(source, resolved);
    if (
      relative === ".." ||
      relative.startsWith(".." + path.sep) ||
      path.isAbsolute(relative)
    )
      throw new Error(`${file}: link leaves the portable skill: ${link}`);
    await access(resolved);
  }
}
for (const directory of ["guide"])
  for (const file of await collect(path.join(source, directory)))
    outputs.set(
      path.join(directory, file),
      await readFile(path.join(source, directory, file)),
    );
for (const file of [
  "engine.json",
  "scripts/runtime.mjs",
  "scripts/guide.mjs",
  "scripts/project.mjs",
])
  outputs.set(file, await readFile(path.join(source, file)));
for (const name of ["setup", "design", "review", "add-rule", "feedback"]) {
  let text = await readFile(
    path.join(source, "references", `${name}.md`),
    "utf8",
  );
  text = text
    .replaceAll(
      "<viewrule-root>/references/",
      "${CLAUDE_PLUGIN_ROOT}/skills/review/",
    )
    .replaceAll("<viewrule-root>", "${CLAUDE_PLUGIN_ROOT}")
    .replace(/\[([\w-]+) workflow\]\(\1\.md\)/g, "`/viewrule:$1`");
  if (name === "setup") {
    text = text
      .replace("skill installation", "plugin installation")
      .replace("skill directory", "plugin cache");
    text = text.replace(
      "   Setup verifies and installs",
      `   Setup removes recognized legacy Viewrule Stop handlers from user settings and
   project settings up to the checkout root, preserving other hooks and permissions.
   Report \`stopHookMigration.manual\` entries; inspect custom wrappers and remove
   only their confirmed Viewrule Stop invocation. Do not delete combined checks,
   edit managed policy, or claim migration finished while a reported entry remains.
   Restart sessions holding an old registration. See the plugin README for scope.
   Setup then verifies and installs`,
    );
  }
  outputs.set(`skills/${name}/SKILL.md`, Buffer.from(text));
}
for (const file of ["preflight.md", "component-composition.md"])
  outputs.set(
    `skills/review/${file}`,
    Buffer.from(
      (
        await readFile(path.join(source, "references", file), "utf8")
      ).replaceAll("](../guide/", "](../../guide/"),
    ),
  );
const stale = [];
for (const directory of ["guide", "skills"])
  for (const file of await collect(path.join(target, directory))) {
    const relative = path.join(directory, file);
    if (!outputs.has(relative)) stale.push(relative);
  }
const changed = [...stale];
for (const [relative, bytes] of outputs) {
  const destination = path.join(target, relative);
  let actual;
  try {
    actual = await readFile(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (actual?.equals(bytes)) continue;
  changed.push(relative);
  if (!check.length) {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
}
if (check.length && changed.length)
  throw new Error(
    `Agent bundles are stale: ${changed.join(", ")}. Run npm run agents:build.`,
  );
if (!check.length) for (const file of stale) await rm(path.join(target, file));
console.log(
  check.length
    ? "Agent bundles match the canonical skill."
    : `Generated ${changed.length} agent bundle files.`,
);

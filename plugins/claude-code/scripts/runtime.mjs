#!/usr/bin/env node
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { isLegacyHook } from "./project.mjs";

const json = async (file) => JSON.parse(await readFile(file, "utf8"));

async function installed(root, pin) {
  try {
    const pkg = await json(
      path.join(root, "node_modules/viewrule/package.json"),
    );
    const receipt = await json(path.join(root, "installed.json"));
    await access(path.join(root, "node_modules/viewrule/bin/viewrule.mjs"));
    return (
      pkg.name === "viewrule" &&
      pkg.version === pin.version &&
      receipt.sha256 === pin.sha256
    );
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

async function install(root, pin, data) {
  if (await installed(root, pin)) return;
  await mkdir(data, { recursive: true });
  const lock = path.join(data, "install.lock");
  try {
    await mkdir(lock);
  } catch (err) {
    if (err.code === "EEXIST")
      throw new Error(
        `Installation lock exists at ${lock}. Wait for setup to finish; remove it only if that setup was interrupted.`,
        { cause: err },
      );
    throw err;
  }
  let staging;
  try {
    if (await installed(root, pin)) return;
    staging = await mkdtemp(path.join(data, ".install-"));
    const response = await fetch(pin.url, {
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(`Engine download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== pin.sha256) {
      throw new Error(
        "Engine archive checksum mismatch; nothing was installed",
      );
    }
    const archive = path.join(staging, "engine.tgz");
    await writeFile(archive, bytes);
    const result = spawnSync(
      "npm",
      [
        "install",
        "--prefix",
        staging,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        archive,
      ],
      { stdio: ["ignore", 2, 2], timeout: 120000 },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(`npm installation failed (${result.status})`);
    const pkg = await json(
      path.join(staging, "node_modules/viewrule/package.json"),
    );
    if (pkg.name !== "viewrule" || pkg.version !== pin.version)
      throw new Error("Installed package does not match the engine pin");
    await writeFile(
      path.join(staging, "installed.json"),
      JSON.stringify(pin) + "\n",
    );
    await rm(archive);
    // A completed install becomes visible at once; old engine versions are retained.
    await rename(staging, root);
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

/** Run the pinned client without depending on any agent host.
 * @param {string[]} args
 * @param {{ dataDirectory?: string, defaultProject?: string, beforeSetup?: (project: string) => Promise<object> }} [options]
 */
export async function run(args, options = {}) {
  const data = path.resolve(
    options.dataDirectory ||
      process.env.VIEWRULE_DATA_DIR ||
      path.join(
        process.env.XDG_DATA_HOME || path.join(homedir(), ".local/share"),
        "viewrule/engines",
      ),
  );
  const isHook = isLegacyHook(args);
  // Pattern/evidence pages are bundled with the isolated skill. Design rules
  // belong to the pinned engine and are read through its CLI after explicit setup.
  if (
    args[0] === "guide" &&
    args[1] !== "rules" &&
    !args[1]?.startsWith("DR-")
  ) {
    const { printGuide } = await import("./guide.mjs");
    return printGuide(args.slice(1));
  }
  // Handle old manual registrations before loading the still-pinned engine.
  if (isHook) return console.log("{}");
  if (Number(process.versions.node.split(".")[0]) < 22)
    throw new Error("Node.js 22 or newer is required");
  const pin = await json(new URL("../engine.json", import.meta.url));
  if (
    !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(pin.version) ||
    !/^[a-f0-9]{64}$/.test(pin.sha256)
  ) {
    throw new Error("Invalid engine pin");
  }
  const root = path.join(data, `${pin.version}-${pin.sha256}`);
  const engine = path.join(root, "node_modules/viewrule");
  const launcher = path.join(engine, "bin/viewrule.mjs");
  if (args[0] === "setup") {
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        project: { type: "string" },
        "skip-browser": { type: "boolean" },
        "with-deps": { type: "boolean" },
      },
    });
    if (values["skip-browser"] && values["with-deps"])
      throw new Error(
        "Usage: setup [--project DIR] [--skip-browser | --with-deps]",
      );
    const setupDetails = options.beforeSetup
      ? await options.beforeSetup(
          path.resolve(
            values.project ?? options.defaultProject ?? process.cwd(),
          ),
        )
      : {};
    await install(root, pin, data);
    if (!values["skip-browser"]) {
      const result = spawnSync(
        process.execPath,
        [
          launcher,
          "install-browser",
          ...(values["with-deps"] ? ["--with-deps"] : []),
        ],
        { stdio: ["ignore", 2, 2] },
      );
      if (result.error) throw result.error;
      if (result.status !== 0)
        throw new Error(
          "Browser installation failed. Resolve the error and rerun setup",
        );
    }
    console.log(
      JSON.stringify({
        version: pin.version,
        engine,
        browser: values["skip-browser"] ? "skipped" : "installed",
        ...setupDetails,
      }),
    );
    return;
  }
  if (!(await installed(root, pin)))
    throw new Error(
      "Pinned engine is not installed. Run this launcher with setup",
    );
  if (args.length === 1 && args[0] === "docs") {
    console.log(
      JSON.stringify({
        version: pin.version,
        policy: path.join(engine, "docs/design-rules.md"),
        rules: path.join(engine, "docs/ui-review.md"),
        detection: path.join(engine, "docs/ui-review-enforcement.md"),
        defaults: path.join(engine, "docs/defaults.md"),
        authoring: path.join(engine, "docs/rule-authoring.md"),
      }),
    );
  } else {
    const result = spawnSync(process.execPath, [launcher, ...args], {
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 2;
  }
}

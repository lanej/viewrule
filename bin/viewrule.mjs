#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
// Keep an unconfigured Stop hook independent of optional browser setup and npm dependencies.
if (args.length === 1 && args[0] === "hook") {
  try {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    const payload = JSON.parse(input);
    if (!payload || typeof payload !== "object")
      throw new Error("Expected a hook payload object");
    let config;
    if (payload.cwd && !payload.stop_hook_active) {
      try {
        config = JSON.parse(
          await readFile(
            path.join(payload.cwd, ".ui-review/config.json"),
            "utf8",
          ),
        );
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    }
    if (!config || config.enforceOnStop === false) console.log("{}");
    else {
      const { hookDecision } = await import("../src/state.mjs");
      const { globalConfigDir } = await import("../src/paths.mjs");
      console.log(
        JSON.stringify(await hookDecision(payload, globalConfigDir())),
      );
    }
  } catch (err) {
    console.log(
      JSON.stringify({
        decision: "block",
        reason: `Viewrule could not verify this project: ${err.message}. Check installation and run viewrule check.`,
      }),
    );
  }
} else if (args[0] === "guide") {
  try {
    const { printGuide } =
      await import("../plugins/claude-code/scripts/guide.mjs");
    await printGuide(args.slice(1));
  } catch (err) {
    console.error(`viewrule: ${err.message}`);
    process.exitCode = 2;
  }
} else if (args.length === 1 && args[0] === "--version") {
  console.log(
    JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    ).version,
  );
} else if (args[0] === "install-browser") {
  if (args.slice(1).some((arg) => arg !== "--with-deps") || args.length > 2) {
    console.error("Usage: viewrule install-browser [--with-deps]");
    process.exitCode = 2;
  } else {
    try {
      const cli = path.join(
        path.dirname(
          createRequire(import.meta.url).resolve("playwright/package.json"),
        ),
        "cli.js",
      );
      const result = spawnSync(
        process.execPath,
        [cli, "install", ...args.slice(1), "chromium"],
        { stdio: "inherit" },
      );
      if (result.error) throw result.error;
      process.exitCode = result.status ?? 2;
    } catch (err) {
      console.error(`viewrule: ${err.message}`);
      process.exitCode = 2;
    }
  }
} else {
  try {
    await import("../src/cli.mjs");
  } catch (err) {
    console.error(`viewrule: ${err.message}. Check the package installation.`);
    process.exitCode = 2;
  }
}

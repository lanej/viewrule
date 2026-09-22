#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
// Retired Stop entrypoint: old registrations must never block or need an engine.
if (args[0] === "hook") {
  console.log("{}");
} else if (args[0] === "guide") {
  try {
    if (args[1] === "rules" || args[1]?.startsWith("DR-")) {
      const { printRuleGuide } = await import("../src/rule-guide.mjs");
      await printRuleGuide(args.slice(1));
    } else {
      const { printGuide } =
        await import("../plugins/claude-code/scripts/guide.mjs");
      await printGuide(args.slice(1));
    }
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

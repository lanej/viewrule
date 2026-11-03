#!/usr/bin/env node
import path from "node:path";
import { homedir } from "node:os";
import { run } from "./runtime.mjs";

// This adapter alone owns Claude's legacy Stop migration and existing cache path.
try {
  await run(process.argv.slice(2), {
    defaultProject: process.env.CLAUDE_PROJECT_DIR,
    dataDirectory:
      process.env.VIEWRULE_PLUGIN_DATA_DIR ||
      path.join(
        process.env.XDG_DATA_HOME || path.join(homedir(), ".local/share"),
        "viewrule/claude-code",
      ),
    beforeSetup: async (project) => {
      const { migrateStopHooks } = await import("./migrate-stop.mjs");
      const stopHookMigration = await migrateStopHooks(project);
      for (const { file, count } of stopHookMigration.removed)
        console.error(
          `Removed ${count} legacy Viewrule Stop hook(s) from ${file}.`,
        );
      for (const { file, reason } of stopHookMigration.manual)
        console.error(`Viewrule Stop migration: ${file}: ${reason}`);
      if (stopHookMigration.removed.length)
        console.error(
          "Restart Claude sessions that still hold the old Stop registration.",
        );
      return { stopHookMigration };
    },
  });
} catch (err) {
  console.error(`viewrule plugin: ${err.message}`);
  process.exitCode = 2;
}

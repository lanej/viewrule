import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  readFile,
  realpath,
  stat,
  chmod,
  writeFile,
  rename,
  rm,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

// Recognize one simple invocation without evaluating shell text. Compound commands
// need human editing: deleting their handler could remove someone else's check.
function shellWords(command) {
  if (/[;&|<>()`\r\n]/.test(command)) return null;
  const words = [];
  let word = "";
  let quote = "";
  for (const character of command.trim()) {
    if (character === "\\") return null;
    if (quote) {
      if (character === quote) quote = "";
      else word += character;
    } else if (character === '"' || character === "'") quote = character;
    else if (/\s/.test(character)) {
      if (word) words.push(word);
      word = "";
    } else word += character;
  }
  if (quote) return null;
  if (word) words.push(word);
  return words;
}

function isViewruleStop(handler) {
  if (handler?.type !== "command" || typeof handler.command !== "string")
    return false;
  const words = Array.isArray(handler.args)
    ? [handler.command, ...handler.args]
    : shellWords(handler.command);
  if (!words?.length || words.some((word) => typeof word !== "string"))
    return false;
  if (!handler.args && words[0] === "exec") words.shift();
  const name = (word = "") => word.replaceAll("\\", "/").split("/").at(-1);
  let executable = name(words.shift());
  if (["node", "nodejs", "node.exe"].includes(executable)) {
    const script = words.shift()?.replaceAll("\\", "/") ?? "";
    if (!/(?:^|\/)(?:bin|scripts)\/(?:viewrule|ui-review)\.mjs$/.test(script))
      return false;
  } else {
    if (["npx", "npx.cmd"].includes(executable)) {
      if (["--no-install", "--yes", "-y"].includes(words[0])) words.shift();
      executable = words.shift();
    }
    if (
      !/^(?:viewrule|ui-review)(?:@\d+\.\d+\.\d+(?:-[\w.-]+)?)?$/.test(
        executable,
      )
    )
      return false;
  }
  return words.length === 1 && words[0] === "hook";
}

/** Remove only known Viewrule Stop handlers; leave other settings and symlinks intact. */
export async function migrateStopHooks(requested) {
  const project = await realpath(requested);
  const checkout = spawnSync(
    "git",
    ["-C", project, "rev-parse", "--show-toplevel"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let root =
    checkout.status === 0 ? await realpath(checkout.stdout.trim()) : project;
  const relative = path.relative(root, project);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  )
    root = project;
  const files = new Set([
    path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(homedir(), ".claude"),
      "settings.json",
    ),
  ]);
  // Include repository settings when setup selects a nested frontend application.
  for (let directory = project; ; directory = path.dirname(directory)) {
    files.add(path.join(directory, ".claude/settings.json"));
    files.add(path.join(directory, ".claude/settings.local.json"));
    if (directory === root || directory === path.dirname(directory)) break;
  }
  const removed = [];
  const manual = [];
  const visited = new Set();
  for (const file of files) {
    let temporary;
    try {
      const target = await realpath(file);
      if (visited.has(target)) continue;
      visited.add(target);
      const original = await readFile(target, "utf8");
      let settings;
      try {
        settings = JSON.parse(original);
      } catch {
        throw new Error("Invalid JSON; settings were left unchanged.");
      }
      if (!settings || typeof settings !== "object" || Array.isArray(settings))
        throw new Error("Expected a settings object; file was left unchanged.");
      if (settings.hooks?.Stop === undefined) continue;
      if (!Array.isArray(settings.hooks.Stop))
        throw new Error(
          "Expected a Stop handler array; settings were left unchanged.",
        );
      let count = 0;
      let uncertain = 0;
      settings.hooks.Stop = settings.hooks.Stop.flatMap((group) => {
        if (!Array.isArray(group?.hooks)) return [group];
        const hooks = group.hooks.filter((handler) => {
          if (isViewruleStop(handler)) {
            count++;
            return false;
          }
          if (
            handler?.type === "command" &&
            /(?:viewrule|ui-review)/i.test(
              [
                handler.command,
                ...(Array.isArray(handler.args) ? handler.args : []),
              ].join(" "),
            )
          )
            uncertain++;
          return true;
        });
        if (hooks.length === group.hooks.length) return [group];
        return hooks.length ? [{ ...group, hooks }] : [];
      });
      if (uncertain)
        manual.push({
          file,
          reason: `${uncertain} custom Viewrule Stop command(s) need manual editing; other commands in those handlers may still be needed.`,
        });
      if (!count) continue;
      if (!settings.hooks.Stop.length) delete settings.hooks.Stop;
      const metadata = await stat(target);
      temporary = `${target}.viewrule-${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(settings, null, 2) + "\n", {
        flag: "wx",
        mode: metadata.mode & 0o777,
      });
      await chmod(temporary, metadata.mode & 0o777);
      if ((await readFile(target, "utf8")) !== original)
        throw new Error("Settings changed during migration; rerun setup.");
      await rename(temporary, target);
      removed.push({ file, count });
    } catch (error) {
      if (error.code !== "ENOENT")
        manual.push({
          file,
          reason: error.code
            ? `Could not migrate settings (${error.code}); file was left unchanged.`
            : error.message,
        });
    } finally {
      if (temporary) await rm(temporary, { force: true });
    }
  }
  return { removed, manual };
}

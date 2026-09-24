import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
  cp,
  symlink,
  lstat,
  chmod,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { chromium } from "playwright";
import { inspectPage } from "../src/checks.mjs";
import { config } from "./fixtures.mjs";
import {
  analyticalHtml,
  analyticalScript,
  analyticalCSS,
} from "./analytical-fixtures.mjs";

// One user workflow through the installed entrypoint; no helper/edge-case matrix.
test(
  "Installed presets reject broken and stretched comparisons, accept distinct React layouts under one contract, and preserve feedback",
  { timeout: 360000 },
  async (t) => {
    const project = await mkdtemp(path.join(tmpdir(), "ui-review-"));
    t.after(() => rm(project, { recursive: true, force: true }));
    const globalDir = path.join(project, "global");
    await mkdir(globalDir);
    await mkdir(path.join(project, "src"));
    await mkdir(path.join(project, ".ui-review"));
    const source = path.join(project, "src/page.html");
    await writeFile(source, analyticalHtml("broken"));
    await writeFile(path.join(project, "src/analytical.js"), analyticalScript);
    await writeFile(path.join(project, "src/analytical.css"), analyticalCSS);
    assert.ok(
      process.env.VIEWRULE_TEST_ARCHIVE,
      "Run npm test to exercise the packed engine",
    );
    const archive = await readFile(process.env.VIEWRULE_TEST_ARCHIVE);
    let corruptDownload = true;
    const server = createServer(async (req, res) => {
      const pathname = new URL(req.url, "http://localhost").pathname;
      // Exercise deployment below a project prefix, including relative assets.
      if (pathname.startsWith("/incremental/")) {
        const relative = pathname.slice("/incremental/".length);
        if (
          !["a/index.html", "b/index.html", "shared/tokens.css"].includes(
            relative,
          )
        ) {
          res.writeHead(404);
          return res.end();
        }
        res.setHeader(
          "Content-Type",
          relative.endsWith(".css") ? "text/css" : "text/html",
        );
        return res.end(
          await readFile(path.join(project, "incremental-app/src", relative)),
        );
      }
      if (pathname.startsWith("/viewrule/")) {
        const siteRoot = path.resolve(import.meta.dirname, "../dist/site");
        const file = path.resolve(
          siteRoot,
          pathname.slice("/viewrule/".length),
          ...(pathname.endsWith("/") ? ["index.html"] : []),
        );
        try {
          assert.ok(file.startsWith(siteRoot + path.sep));
          const content = await readFile(file);
          res.setHeader(
            "Content-Type",
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".json": "application/json",
            }[path.extname(file)] || "application/octet-stream",
          );
          return res.end(content);
        } catch {
          res.writeHead(404);
          return res.end();
        }
      }
      if (pathname.startsWith("/examples/") && exampleDirectory) {
        const file = pathname.slice("/examples/".length);
        if (
          ![
            "decision.html",
            "decision.js",
            "decision.css",
            "composition.html",
            "composition.js",
            "composition.css",
            "pattern-review.html",
            "pattern-review.js",
            "pattern-review.css",
            "behavior.html",
            "behavior.js",
            "priority-scene.js",
            "behavior.css",
            "gallery.css",
            "behavior-catalog.json",
          ].includes(file) &&
          !/^(?:(?:pricing|encodings|gallery)\.(?:html|css|js)|easy-ui\/assets\/[a-zA-Z0-9_.-]+\.(?:js|css|woff2?))$/.test(
            file,
          )
        ) {
          res.writeHead(404);
          return res.end();
        }
        const types = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
        };
        res.setHeader("Content-Type", types[path.extname(file)]);
        return res.end(await readFile(path.join(exampleDirectory, file)));
      }
      if (pathname.startsWith("/components/")) {
        const variant = pathname.split("/")[2];
        res.setHeader("Content-Type", "text/html");
        return res.end(
          (
            await readFile(
              new URL("./templates/components.html", import.meta.url),
              "utf8",
            )
          ).replace(
            "{{variant}}",
            /^[a-z-]+$/.test(variant) ? variant : "grid",
          ),
        );
      }
      if (pathname.startsWith("/reading/")) {
        const variant = pathname.split("/")[2];
        res.setHeader("Content-Type", "text/html");
        return res.end(
          (
            await readFile(
              new URL("./templates/reading.html", import.meta.url),
              "utf8",
            )
          ).replace(
            "{{variant}}",
            /^[a-z-]+$/.test(variant) ? variant : "good",
          ),
        );
      }
      if (pathname.startsWith("/app/") && mockDirectory) {
        const file = pathname === "/app/" ? "index.html" : pathname.slice(5);
        if (!["index.html", "app.js", "app.css", "data.js"].includes(file)) {
          res.writeHead(404);
          return res.end();
        }
        res.setHeader(
          "Content-Type",
          file.endsWith(".js")
            ? "text/javascript"
            : file.endsWith(".css")
              ? "text/css"
              : "text/html",
        );
        return res.end(await readFile(path.join(mockDirectory, file)));
      }
      if (req.url === "/engine.tgz") {
        res.setHeader("Content-Type", "application/octet-stream");
        return res.end(
          corruptDownload ? Buffer.from("corrupt download") : archive,
        );
      }
      if (req.url === "/analytical.css") {
        res.setHeader("Content-Type", "text/css");
        return res.end(
          await readFile(path.join(project, "src/analytical.css")),
        );
      }
      if (req.url === "/analytical.js") {
        res.setHeader("Content-Type", "text/javascript");
        return res.end(await readFile(path.join(project, "src/analytical.js")));
      }
      res.setHeader("Content-Type", "text/html");
      res.end(await readFile(source));
    });
    await new Promise((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve(undefined)),
    );
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseURL = `http://127.0.0.1:${address.port}`;
    // Copy only the marketplace's plugin source, just as Claude's cache does.
    const repository = path.resolve(import.meta.dirname, "..");
    const marketplace = JSON.parse(
      await readFile(
        path.join(repository, ".claude-plugin/marketplace.json"),
        "utf8",
      ),
    );
    const plugin = path.join(project, "plugin cache/viewrule");
    await cp(path.join(repository, marketplace.plugins[0].source), plugin, {
      recursive: true,
    });
    const manifest = JSON.parse(
      await readFile(path.join(plugin, ".claude-plugin/plugin.json"), "utf8"),
    );
    assert.equal(manifest.name, marketplace.plugins[0].name);
    const pin = JSON.parse(
      await readFile(path.join(plugin, "engine.json"), "utf8"),
    );
    pin.version = JSON.parse(
      await readFile(path.join(repository, "package.json"), "utf8"),
    ).version;
    pin.url = `${baseURL}/engine.tgz`;
    pin.sha256 = createHash("sha256").update(archive).digest("hex");
    await writeFile(path.join(plugin, "engine.json"), JSON.stringify(pin));
    const runtime = path.join(project, "runtime data");
    /** @type {NodeJS.ProcessEnv} */
    const env = {
      ...process.env,
      VIEWRULE_CONFIG_DIR: globalDir,
      VIEWRULE_PLUGIN_DATA_DIR: runtime,
      CLAUDE_PLUGIN_ROOT: plugin,
      CLAUDE_CONFIG_DIR: path.join(project, "claude user"),
      CLAUDE_PROJECT_DIR: project,
    };
    const run = (command, args, input = "") =>
      new Promise((resolve, reject) => {
        const child = execFile(
          command,
          args,
          { cwd: project, env, timeout: 45000 },
          (error, stdout, stderr) => {
            if (error && typeof error.code !== "number") return reject(error);
            resolve({ code: error?.code ?? 0, stdout, stderr });
          },
        );
        child.stdin.end(input);
      });
    const cli = (args) =>
      run(process.execPath, [
        path.join(plugin, "scripts/viewrule.mjs"),
        ...args,
      ]);
    await assert.rejects(readFile(path.join(plugin, "hooks/hooks.json")), {
      code: "ENOENT",
    });
    const legacyHook = async (extra = {}) => {
      const result = await run(
        process.execPath,
        [path.join(plugin, "scripts/viewrule.mjs"), "hook"],
        JSON.stringify({ cwd: project, ...extra }),
      );
      assert.equal(result.code, 0, result.stderr);
      return JSON.parse(result.stdout);
    };
    const verify = async (extra = {}) => {
      const result = await cli(["verify", "--project", extra.cwd ?? project]);
      assert.ok([0, 1].includes(result.code), result.stderr);
      const output = JSON.parse(result.stdout);
      assert.equal(result.code, output.status === "pass" ? 0 : 1);
      return output;
    };
    // Offline guide retrieval works from an isolated plugin before setup.
    const guide = await cli(["guide"]);
    assert.equal(guide.code, 0, guide.stderr);
    const guideIndex = JSON.parse(guide.stdout);
    const actionGuide = guideIndex.pages.find((p) => p.id === "P-003");
    assert.ok(actionGuide && actionGuide.sources.includes("E-CARBON"));
    const selectedGuide = await cli(["guide", actionGuide.id]);
    assert.equal(selectedGuide.code, 0, selectedGuide.stderr);
    assert.equal(
      selectedGuide.stdout,
      await readFile(
        path.join(guideIndex.localRoot, actionGuide.markdown),
        "utf8",
      ),
    );
    const evidenceGuide = await cli(["guide", "E-CARBON"]);
    assert.equal(evidenceGuide.code, 0, evidenceGuide.stderr);
    assert.ok(evidenceGuide.stdout.includes("https://carbondesignsystem.com/"));
    assert.equal((await cli(["guide", "../engine.json"])).code, 2);
    assert.deepEqual(
      await legacyHook(),
      {},
      "Retired Stop command needs no engine",
    );
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify({ enforceOnStop: true }),
    );
    assert.deepEqual(
      await legacyHook(),
      {},
      "Retired Stop registration does not need an installed engine",
    );
    assert.deepEqual(
      await legacyHook({ stop_hook_active: true }),
      {},
      "Retired Stop continuation cannot require an engine",
    );
    const prefixedHook = await cli(["--project", project, "hook"]);
    assert.equal(prefixedHook.code, 0, prefixedHook.stderr);
    assert.deepEqual(
      JSON.parse(prefixedHook.stdout),
      {},
      "Legacy global options cannot delegate to an old blocking engine",
    );
    await rm(path.join(project, ".ui-review/config.json"));
    const rejected = await cli(["setup", "--skip-browser"]);
    assert.equal(rejected.code, 2);
    assert.match(rejected.stderr, /checksum mismatch/);
    assert.deepEqual(
      await readdir(runtime),
      [],
      "Rejected download leaves no partial install",
    );
    corruptDownload = false;
    // Setup migrates old settings, including dotfile symlinks and a nested app,
    // without removing other checks or requiring a new engine release.
    const migrationRoot = path.join(project, "migration checkout");
    const migrationApp = path.join(migrationRoot, "apps/web");
    await mkdir(path.join(migrationRoot, ".claude"), { recursive: true });
    await mkdir(path.join(migrationApp, ".claude"), { recursive: true });
    assert.equal((await run("git", ["init", "-q", migrationRoot])).code, 0);
    await mkdir(env.CLAUDE_CONFIG_DIR);
    const userSettings = path.join(env.CLAUDE_CONFIG_DIR, "settings.json");
    const dotfile = path.join(project, "dotfiles-settings.json");
    const projectSettings = path.join(migrationRoot, ".claude/settings.json");
    const localSettings = path.join(
      migrationApp,
      ".claude/settings.local.json",
    );
    const malformedSettings = path.join(migrationApp, ".claude/settings.json");
    const unrelated = {
      type: "command",
      command: "node ./scripts/other-check.mjs",
    };
    const combined = {
      type: "command",
      command: "viewrule hook && other-check",
    };
    const retained = {
      permissions: { allow: ["Bash(npm test)"] },
      env: { APP_THEME: "light" },
      hooks: {
        Stop: [{ matcher: "", hooks: [unrelated, combined] }],
        PostToolUse: [
          { hooks: [{ type: "command", command: "viewrule hook" }] },
        ],
      },
    };
    const oldSettings = structuredClone(retained);
    oldSettings.hooks.Stop[0].hooks.unshift({
      type: "command",
      command: 'node "${CLAUDE_PLUGIN_ROOT}/scripts/viewrule.mjs" hook',
    });
    await writeFile(dotfile, JSON.stringify(oldSettings));
    await chmod(dotfile, 0o640);
    await symlink(dotfile, userSettings);
    await writeFile(
      projectSettings,
      JSON.stringify({
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "ui-review --project apps/web hook",
                },
              ],
            },
          ],
        },
      }),
    );
    await writeFile(
      localSettings,
      JSON.stringify({
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: process.execPath,
                  args: [path.join(plugin, "scripts/viewrule.mjs"), "hook"],
                },
              ],
            },
          ],
        },
      }),
    );
    await writeFile(malformedSettings, "{invalid JSON\n");
    const setup = await cli([
      "setup",
      "--skip-browser",
      "--project",
      migrationApp,
    ]);
    assert.equal(setup.code, 0, setup.stderr);
    const migration = JSON.parse(setup.stdout).stopHookMigration;
    assert.equal(migration.removed.length, 3);
    assert.equal(
      migration.removed.reduce((sum, file) => sum + file.count, 0),
      3,
    );
    assert.equal(migration.manual.length, 2);
    assert.deepEqual(
      JSON.parse(await readFile(userSettings, "utf8")),
      retained,
    );
    assert.ok((await lstat(userSettings)).isSymbolicLink());
    assert.equal((await lstat(dotfile)).mode & 0o777, 0o640);
    assert.deepEqual(JSON.parse(await readFile(projectSettings, "utf8")), {
      hooks: {},
    });
    assert.deepEqual(JSON.parse(await readFile(localSettings, "utf8")), {
      hooks: {},
    });
    assert.equal(await readFile(malformedSettings, "utf8"), "{invalid JSON\n");
    const settingsAfter = await readFile(userSettings, "utf8");
    const repeatSetup = await cli([
      "setup",
      "--skip-browser",
      "--project",
      migrationApp,
    ]);
    assert.equal(repeatSetup.code, 0, repeatSetup.stderr);
    assert.deepEqual(
      JSON.parse(repeatSetup.stdout).stopHookMigration.removed,
      [],
    );
    assert.equal(
      await readFile(userSettings, "utf8"),
      settingsAfter,
      "Migration is idempotent",
    );
    assert.equal((await cli(["--version"])).stdout.trim(), pin.version);
    const packageGuide = await run(process.execPath, [
      path.join(JSON.parse(setup.stdout).engine, "bin/viewrule.mjs"),
      "guide",
      "P-003",
    ]);
    assert.equal(packageGuide.code, 0, packageGuide.stderr);
    assert.equal(
      packageGuide.stdout,
      selectedGuide.stdout,
      "Plugin and packed engine read identical canonical guidance",
    );
    const docs = await cli(["docs"]);
    assert.equal(docs.code, 0, docs.stderr);
    assert.match(
      await readFile(JSON.parse(docs.stdout).policy, "utf8"),
      /DR-007/,
    );
    // The installed runtime scans a file without configuration or Chromium.
    const lintSource = path.join(project, "src/lint.css");
    await writeFile(lintSource, "body { font-family: Inter, sans-serif; }\n");
    const savedBrowserPath = env.VIEWRULE_BROWSER_PATH;
    env.VIEWRULE_BROWSER_PATH = path.join(project, "unavailable-browser");
    env.IMPECCABLE_BIN = process.execPath; // A user override must not replace the installed detector.
    const standaloneLint = await cli(["lint", "--target", "src/lint.css"]);
    if (savedBrowserPath === undefined) delete env.VIEWRULE_BROWSER_PATH;
    else env.VIEWRULE_BROWSER_PATH = savedBrowserPath;
    delete env.IMPECCABLE_BIN;
    assert.equal(standaloneLint.code, 0, standaloneLint.stderr);
    const standaloneReport = JSON.parse(standaloneLint.stdout);
    assert.equal(standaloneReport.coverage, "source-only");
    assert.equal(standaloneReport.renderedRequirements, "not-assessed");
    assert.equal(
      standaloneReport.sourceChecks[0].provider.engineVersion,
      "0.1.5",
    );
    assert.match(
      standaloneReport.sourceChecks[0].provider.binarySHA256,
      /^[a-f0-9]{64}$/,
    );
    assert.ok(
      standaloneReport.findings.some(
        (finding) => finding.rule === "source:impeccable:overused-font",
      ),
    );
    await assert.rejects(
      readFile(path.join(project, ".ui-review/latest.json")),
      { code: "ENOENT" },
    );
    await rm(lintSource);
    // Inspect one scoped app through the installed CLI without browser/provider work.
    const scoped = path.join(project, "scoped-app");
    await mkdir(path.join(scoped, ".ui-review"), { recursive: true });
    await mkdir(path.join(scoped, "src/generated"), { recursive: true });
    await mkdir(path.join(scoped, "apps/web"), { recursive: true });
    await writeFile(
      path.join(scoped, "src/page.tsx"),
      "export const Page = 1;\n",
    );
    await writeFile(path.join(scoped, "src/.hidden.tsx"), "hidden\n");
    await writeFile(path.join(scoped, "src/generated/page.tsx"), "generated\n");
    await writeFile(
      path.join(scoped, "apps/web/DESIGN.md"),
      "# Controls\nKeep labels.\n",
    );
    const scopedConfig = {
      ...config(baseURL),
      sourcePaths: {
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/generated/**"],
      },
      projectDocuments: { include: ["apps/*/DESIGN.md", "apps/web/DESIGN.md"] },
      pages: [
        { name: "admin-home", path: "/", ready: "main", viewports: ["desk*"] },
        { name: "public-home", path: "/", ready: "main" },
      ],
      viewports: [
        { name: "desktop", width: 1280, height: 800 },
        { name: "mobile", width: 390, height: 844 },
      ],
      sourceChecks: [
        {
          id: "opaque",
          authority: "advisory",
          command: [process.execPath, "-e", "process.exit(77)"],
        },
      ],
    };
    const scopedConfigPath = path.join(scoped, ".ui-review/config.json");
    await writeFile(scopedConfigPath, JSON.stringify(scopedConfig));
    await writeFile(
      path.join(scoped, ".ui-review/rules.json"),
      JSON.stringify([
        {
          id: "scope-labels",
          type: "min-font-size",
          selector: "label",
          min: 14,
          severity: "error",
          reason: "Labels remain readable.",
          pages: { include: ["admin-*"], exclude: ["admin-legacy"] },
          viewports: ["desk*"],
          sources: ["apps/web/DESIGN.md#controls"],
        },
      ]),
    );
    env.VIEWRULE_BROWSER_PATH = path.join(project, "unavailable-browser");
    const planned = await cli(["plan", "--project", scoped]);
    if (savedBrowserPath === undefined) delete env.VIEWRULE_BROWSER_PATH;
    else env.VIEWRULE_BROWSER_PATH = savedBrowserPath;
    assert.equal(planned.code, 0, planned.stderr);
    const plan = JSON.parse(planned.stdout);
    assert.equal(plan.evidence, "not-assessed");
    assert.deepEqual(
      plan.sources.files.map((file) => file.path),
      ["src/page.tsx"],
    );
    assert.equal(plan.documents.length, 1);
    assert.equal(plan.documents[0].reasons.length, 2);
    assert.equal(plan.sourceChecks[0].inputs, "unknown");
    assert.equal(plan.browser.captureCount, 3);
    assert.deepEqual(
      plan.browser.states.map((state) => state.rules),
      [["scope-labels"], [], []],
    );
    assert.deepEqual((await readdir(path.join(scoped, ".ui-review"))).sort(), [
      "config.json",
      "rules.json",
    ]);
    await writeFile(
      scopedConfigPath,
      JSON.stringify({ ...scopedConfig, sourcePaths: ["src"] }),
    );
    const legacyPlan = JSON.parse(
      (await cli(["plan", "--project", scoped])).stdout,
    );
    assert.equal(
      legacyPlan.sources.files.length,
      3,
      "Legacy prefixes retain hidden and generated descendants",
    );
    await writeFile(
      scopedConfigPath,
      JSON.stringify({
        ...scopedConfig,
        projectDocuments: ["missing/*/DESIGN.md"],
      }),
    );
    const missingDocument = await cli(["plan", "--project", scoped]);
    assert.equal(missingDocument.code, 2);
    assert.match(missingDocument.stderr, /pattern matches no files/);
    await writeFile(
      scopedConfigPath,
      JSON.stringify({
        ...scopedConfig,
        projectDocuments: {
          include: ["apps/web/DESIGN.md"],
          exclude: ["apps/**"],
        },
      }),
    );
    const excludedDocument = await cli(["plan", "--project", scoped]);
    assert.equal(excludedDocument.code, 2);
    assert.match(
      excludedDocument.stderr,
      /Required project document is excluded/,
    );
    await rm(scoped, { recursive: true });
    const init = await cli(["init", "--url", baseURL]);
    assert.equal(init.code, 0, init.stderr);
    assert.equal(
      JSON.parse(
        await readFile(path.join(project, ".ui-review/config.json"), "utf8"),
      ).enforceOnStop,
      false,
    );
    assert.deepEqual(
      await legacyHook(),
      {},
      "Setup does not enable enforcement",
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(project, ".ui-review/config.json"), "utf8"),
      ).sourceChecks,
      [
        {
          id: "impeccable",
          format: "impeccable",
          targets: ["."],
          authority: "advisory",
        },
      ],
    );
    const initialRules = await readFile(
      path.join(project, ".ui-review/rules.json"),
      "utf8",
    );
    assert.ok(
      JSON.parse(initialRules).some(
        (rule) => rule.id === "baseline-readable-text",
      ),
      "Default init supplies executable rules",
    );
    assert.equal(
      (await cli(["init", "--url", baseURL, "--preset", "analytical"])).code,
      2,
    );
    assert.equal(
      await readFile(path.join(project, ".ui-review/rules.json"), "utf8"),
      initialRules,
      "Init preserves existing rules",
    );
    const personalPreference =
      'Keep service labels visible; show <b>literal markup</b> & quotes "as text".';
    await writeFile(
      path.join(globalDir, "preferences.json"),
      JSON.stringify([personalPreference]),
    );
    const guidance = JSON.parse((await cli(["guidance"])).stdout);
    assert.ok(
      guidance.defaults.some((note) => note.includes("DR-006")),
      "Built-in opinions are available without personal dotfiles",
    );
    assert.deepEqual(guidance.preferences, [personalPreference]);
    const starter = await cli(["preset", "--name", "analytical"]);
    assert.equal(starter.code, 0, starter.stderr);
    const rules = JSON.parse(starter.stdout).map((rule) => {
      if (rule.viewports)
        rule.viewports = rule.viewports.filter((name) =>
          ["desktop", "4k"].includes(name),
        );
      if (rule.minVisibleByViewport)
        rule.minVisibleByViewport = {
          desktop: rule.minVisibleByViewport.desktop,
          "4k": rule.minVisibleByViewport["4k"],
        };
      return rule;
    });
    // A local starter rule overrides a same-ID personal default; don't rewrite either.
    const readable = rules.find((rule) => rule.id === "baseline-readable-text");
    await writeFile(
      path.join(globalDir, "rules.json"),
      JSON.stringify([{ ...readable, min: 18 }]),
    );
    const cfg = {
      ...config(baseURL),
      viewports: [
        { name: "desktop", width: 1280, height: 800 },
        { name: "4k", width: 3840, height: 2160 },
      ],
      requiredDesignRules: ["DR-001", "DR-003", "DR-006", "DR-007"],
    };
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(cfg),
    );
    const rulesPath = path.join(project, ".ui-review/rules.json");
    await writeFile(rulesPath, JSON.stringify(rules));
    const periodRule = {
      id: "period",
      type: "consistent",
      selector: "table",
      keyAttribute: "data-measure",
      properties: [],
      attributes: ["data-period"],
      designRules: ["DR-001"],
      severity: "error",
      reason: "Resizing must preserve the reporting period.",
      pages: { include: ["compar*"], exclude: ["compar-legacy"] },
    };
    const proposal = path.join(project, "period-rule.json");
    await writeFile(proposal, JSON.stringify(periodRule));
    const schema = await cli(["schema", "--type", "consistent"]);
    assert.equal(schema.code, 0, schema.stderr);
    assert.ok(JSON.parse(schema.stdout).required.includes("keyAttribute"));
    const beforeAdd = await readFile(rulesPath, "utf8");
    const preview = await cli(["add-rule", "--rule", proposal, "--dry-run"]);
    assert.equal(preview.code, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).applied, false);
    assert.equal(
      await readFile(rulesPath, "utf8"),
      beforeAdd,
      "Preview does not change boundaries",
    );
    await writeFile(
      proposal,
      JSON.stringify({ ...periodRule, pages: ["typo"] }),
    );
    assert.equal(
      (await cli(["add-rule", "--rule", proposal])).code,
      2,
      "Invalid local scope is rejected before writing",
    );
    assert.equal(await readFile(rulesPath, "utf8"), beforeAdd);
    await writeFile(proposal, JSON.stringify(periodRule));
    const added = await cli(["add-rule", "--rule", proposal]);
    assert.equal(added.code, 0, added.stderr);
    const afterAdd = await readFile(rulesPath, "utf8");
    assert.equal(
      (await cli(["add-rule", "--rule", proposal])).code,
      2,
      "Adding cannot replace a boundary",
    );
    assert.equal(await readFile(rulesPath, "utf8"), afterAdd);
    const beforeDesign = JSON.parse((await cli(["contract"])).stdout);
    assert.equal(beforeDesign.comparison, "initial");
    assert.equal(
      beforeDesign.rules.find((rule) => rule.id === "baseline-readable-text")
        .min,
      14,
    );
    assert.deepEqual(beforeDesign.config.viewports, cfg.viewports);

    const bad = await cli(["check"]);
    assert.equal(bad.code, 1, bad.stderr);
    const badOutput = JSON.parse(bad.stdout);
    const badReport = JSON.parse(await readFile(badOutput.report, "utf8"));
    assert.equal(badReport.changes.comparison, "unavailable");
    assert.equal(badReport.changes.baselineId, null);
    assert.equal(badReport.changes.resolvedFindings.length, 0);
    assert.equal(
      new Set(badReport.changes.newFindings.map((entry) => entry.id)).size,
      badReport.changes.newFindings.length,
      "Repeated selector matches retain distinct finding occurrences",
    );
    assert.equal(
      badReport.contract.hash,
      beforeDesign.hash,
      "The pre-design contract is the contract actually evaluated",
    );
    const wide = badReport.pages.find((page) => page.viewport.name === "4k");
    assert.ok(wide, bad.stdout);
    assert.ok(
      wide.findings.some((finding) => finding.designRules.includes("DR-001")),
    );
    assert.ok(
      wide.findings.some(
        (finding) =>
          finding.message.includes("lost previously visible") &&
          finding.actual.includes("carrier-2"),
      ),
    );
    const findings = badReport.pages.flatMap((page) => page.findings);
    for (const page of badReport.pages)
      assert.ok(
        page.findings.some(
          (finding) =>
            finding.rule === "axe:color-contrast" &&
            finding.selector === "#comparison-guidance" &&
            finding.severity === "error",
        ),
        `Low-contrast guidance must produce a blocking contrast finding at ${page.viewport.name}`,
      );
    for (const [id, dr] of [
      ["baseline-readable-text", "DR-007"],
      ["baseline-content-clipping", "DR-006"],
      ["baseline-header-height", "DR-008"],
      ["baseline-control-size", "DR-007"],
      ["baseline-prose-alignment", "DR-007"],
      ["analytical-numeric-alignment", "DR-006"],
      ["analytical-labels", "DR-006"],
      ["analytical-context", "DR-003"],
      ["analytical-metric-alignment", "DR-006"],
      ["analytical-metric-overlap", "DR-006"],
    ])
      assert.ok(
        findings.some((f) => f.rule === id && f.designRules.includes(dr)),
        `${id} must detect its actual fixture defect`,
      );
    assert.ok(
      findings.some(
        (f) =>
          f.rule === "baseline-readable-text" &&
          f.actual === 12 &&
          f.expected === 14,
      ),
    );
    assert.ok(
      findings.some(
        (f) =>
          f.rule === "baseline-header-height" &&
          f.actual === 450 &&
          f.expected === 160,
      ),
    );
    assert.ok(
      findings.some(
        (f) =>
          f.rule === "analytical-metric-alignment" &&
          f.actual === 20 &&
          f.expected === 2,
      ),
    );
    const tinyControl = findings.find(
      (finding) => finding.rule === "baseline-control-size",
    );
    assert.deepEqual(tinyControl.actual, { width: 18, height: 18 });
    assert.deepEqual(tinyControl.expected, { width: 24, height: 24 });
    assert.equal(tinyControl.severity, "warning");
    assert.ok(
      findings.some(
        (f) => f.rule === "baseline-prose-alignment" && f.actual === "justify",
      ),
    );
    assert.ok(
      findings.some(
        (f) => f.rule === "analytical-numeric-alignment" && f.actual === "left",
      ),
    );
    const blocked = await verify();
    assert.equal(blocked.status, "fail");
    assert.match(blocked.reason, /DR-007/);

    const note = await cli([
      "feedback",
      "--report",
      badOutput.report,
      "--decision",
      "adjust",
      "--note",
      "Fixture feedback: keep adjacent comparison values within 150 CSS px while preserving readable type.",
    ]);
    assert.equal(note.code, 0, note.stderr);
    const ruleFile = path.join(project, "distance-rule.json");
    await writeFile(
      ruleFile,
      JSON.stringify({
        ...rules.find((r) => r.id === "analytical-value-distance"),
        max: 150,
      }),
    );
    const learned = await cli([
      "learn",
      "--feedback",
      JSON.parse(note.stdout).id,
      "--rule",
      ruleFile,
    ]);
    assert.equal(learned.code, 0, learned.stderr);
    const savedRules = JSON.parse(
      await readFile(path.join(project, ".ui-review/rules.json"), "utf8"),
    );
    assert.equal(
      savedRules.find((rule) => rule.id === "analytical-value-distance")
        .feedbackId,
      JSON.parse(note.stdout).id,
    );

    await writeFile(source, analyticalHtml("compact"));
    const good = await cli(["check"]);
    assert.equal(good.code, 0, good.stderr || good.stdout);
    assert.deepEqual(await verify(), { status: "pass" });
    const newlyMatched = path.join(project, "src/newly-matched.css");
    await writeFile(newlyMatched, "/* new dependency */\n");
    assert.equal(
      (await verify()).status,
      "fail",
      "New glob matches invalidate a passing capture",
    );
    await rm(newlyMatched);
    assert.deepEqual(
      await verify(),
      { status: "pass" },
      "Removing the new match restores the original input set",
    );
    await mkdir(path.join(project, "src/generated"), { recursive: true });
    await writeFile(
      path.join(project, "src/generated/ignored.css"),
      "/* excluded */\n",
    );
    assert.deepEqual(
      await verify(),
      { status: "pass" },
      "An excluded file does not invalidate unrelated evidence",
    );
    const output = JSON.parse(good.stdout);
    const report = JSON.parse(await readFile(output.report, "utf8"));
    assert.deepEqual(
      report.summary,
      { errors: 0, warnings: 0 },
      "Compact layout must genuinely pass, not merely suppress errors",
    );
    assert.equal(report.engineVersion, pin.version);
    const latestPath = path.join(project, ".ui-review/latest.json");
    const latestAfterGoodText = await readFile(latestPath, "utf8");
    const latestAfterGood = JSON.parse(latestAfterGoodText);
    assert.equal(latestAfterGood.engineVersion, pin.version);
    await writeFile(
      latestPath,
      JSON.stringify(
        { ...latestAfterGood, engineVersion: "9.9.9-test" },
        null,
        2,
      ) + "\n",
    );
    const mismatchedReview = await verify();
    assert.equal(mismatchedReview.status, "fail");
    assert.ok(
      mismatchedReview.reason.includes(
        "generated by viewrule engine v9.9.9-test",
      ),
    );
    assert.ok(
      mismatchedReview.reason.includes(`verifier is running v${pin.version}`),
    );
    await writeFile(latestPath, latestAfterGoodText);
    assert.deepEqual(
      await verify(),
      { status: "pass" },
      "Restoring the report-generating engine version restores the pass",
    );
    const changedDistance = report.contract.changes.find(
      (change) => change.id === "analytical-value-distance",
    );
    assert.equal(changedDistance.kind, "modified");
    assert.equal(changedDistance.before.max, 160);
    assert.equal(changedDistance.after.max, 150);
    assert.equal(report.contract.configurationChange, null);
    const details = report.pages.find(
      (page) => page.viewport.name === "4k",
    ).details;
    assert.equal(details.complete, true);
    const last = details.tiles.at(-1);
    assert.deepEqual([last.x + last.width, last.y + last.height], [3840, 2160]);
    const png = await readFile(
      path.join(path.dirname(output.report), last.file),
    );
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1024, 800]);
    const reportHtml = await readFile(output.html, "utf8");
    assert.match(reportHtml, /capture-1-detail-/);
    assert.match(reportHtml, /&quot;max&quot;:160/);
    assert.match(reportHtml, /&quot;max&quot;:150/);
    assert.match(reportHtml, /&lt;b&gt;literal markup/);
    assert.doesNotMatch(reportHtml, /<b>literal markup/);
    assert.equal(
      report.pages[0].designCoverage.find((rule) => rule.id === "DR-002")
        .status,
      "unassessed",
    );
    assert.match(
      await readFile(
        path.join(path.dirname(output.report), "design-rules.html"),
        "utf8",
      ),
      /id="DR-007"/,
    );

    const approval = await cli([
      "feedback",
      "--report",
      output.report,
      "--decision",
      "approve",
      "--note",
      "Fixture human feedback: this comparison layout works.",
    ]);
    assert.equal(approval.code, 0, approval.stderr);
    const approved = JSON.parse(approval.stdout);
    assert.equal(
      await readFile(
        path.join(project, ".ui-review", approved.reference, "report.json"),
        "utf8",
      ),
      await readFile(output.report, "utf8"),
    );

    await writeFile(source, analyticalHtml("sidebar"));
    const alternate = await cli(["check"]);
    assert.equal(alternate.code, 0, alternate.stderr || alternate.stdout);
    const alternateReport = JSON.parse(
      await readFile(JSON.parse(alternate.stdout).report, "utf8"),
    );
    assert.deepEqual(alternateReport.summary, { errors: 0, warnings: 0 });
    assert.equal(alternateReport.changes.baselineId, report.id);
    assert.deepEqual(alternateReport.changes.newFindings, []);
    assert.equal(
      alternateReport.contract.hash,
      report.contract.hash,
      "Different accepted React compositions use the identical contract",
    );
    assert.deepEqual(alternateReport.contract.changes, []);
    assert.deepEqual(
      alternateReport.pages.map((page) => page.metrics.comparisons),
      report.pages.map((page) => page.metrics.comparisons),
    );

    await writeFile(source, analyticalHtml("stretched"));
    assert.equal(
      (await verify()).status,
      "fail",
      "Source changes invalidate the passing review",
    );
    const stretched = await cli(["check"]);
    assert.equal(stretched.code, 1, stretched.stderr);
    assert.match(
      await readFile(JSON.parse(stretched.stdout).html, "utf8"),
      /href="reference\/capture-1.png"/,
    );
    const stretchedReport = JSON.parse(
      await readFile(JSON.parse(stretched.stdout).report, "utf8"),
    );
    const stretchedWide = stretchedReport.pages.find(
      (page) => page.viewport.name === "4k",
    );
    assert.ok(
      stretchedWide.findings.some(
        (f) =>
          f.rule === "analytical-value-distance" &&
          f.actual > 150 &&
          f.designRules.includes("DR-007"),
      ),
    );
    assert.deepEqual(
      stretchedReport.pages.find((p) => p.viewport.name === "desktop").findings,
      [],
    );
    assert.ok(
      stretchedWide.findings.every(
        (f) => f.rule === "analytical-value-distance",
      ),
      "Stretching alone causes the failure",
    );
    assert.deepEqual(
      stretchedWide.metrics.comparisons,
      report.pages.find((p) => p.viewport.name === "4k").metrics.comparisons,
      "Empty width does not add comparison identities",
    );

    await writeFile(source, analyticalHtml("finite"));
    const finiteRules = savedRules.map((r) =>
      r.id === "analytical-comparisons"
        ? {
            ...r,
            minVisibleByViewport: { desktop: 4, "4k": 4 },
            reason:
              "This finite task has four relevant alternatives; show all four without inventing content.",
          }
        : r,
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(finiteRules),
    );
    const finite = await cli(["check"]);
    assert.equal(finite.code, 0, finite.stderr || finite.stdout);
    const finiteReport = JSON.parse(
      await readFile(JSON.parse(finite.stdout).report, "utf8"),
    );
    assert.deepEqual(
      finiteReport.summary,
      { errors: 0, warnings: 0 },
      "Useful surrounding whitespace is allowed",
    );
    assert.deepEqual(await verify(), { status: "pass" });
    assert.equal(
      finiteReport.contract.changes.find(
        (change) => change.id === "analytical-comparisons",
      ).after.minVisibleByViewport.desktop,
      4,
      "A finite-task exception remains visible as a changed boundary",
    );

    const installedTemplate = path.join(
      JSON.parse(setup.stdout).engine,
      "src/templates/report.html",
    );
    const originalTemplate = await readFile(installedTemplate, "utf8");
    await writeFile(
      installedTemplate,
      originalTemplate + "\n<!-- changed report template -->\n",
    );
    assert.equal(
      (await verify()).status,
      "fail",
      "Template edits invalidate passing evidence",
    );
    await writeFile(installedTemplate, originalTemplate);

    // One missing-evidence case uses one existing viewport; it is not a viewport matrix.
    await writeFile(source, analyticalHtml("finite", "missing"));
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify({
        ...cfg,
        viewports: cfg.viewports.filter((v) => v.name === "desktop"),
      }),
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(
        finiteRules.map((r) => ({
          ...r,
          ...(r.viewports ? { viewports: ["desktop"] } : {}),
          ...(r.minVisibleByViewport
            ? { minVisibleByViewport: { desktop: 4 } }
            : {}),
        })),
      ),
    );
    const unmeasured = await cli(["check"]);
    assert.equal(unmeasured.code, 1);
    assert.ok(
      JSON.parse(unmeasured.stdout).findings.some(
        (f) => f.rule === "analytical-comparisons" && f.actual === 0,
      ),
    );
    // One integrated mock-app scenario extends this same installed workflow.
    // Earlier scenarios install a personal 18px preference. Keep it intact;
    // this separate example uses a fresh user's configuration and its own contract.
    env.VIEWRULE_CONFIG_DIR = path.join(project, "mock-global");
    await mkdir(env.VIEWRULE_CONFIG_DIR);
    const mockDirectory = path.join(
      JSON.parse(setup.stdout).engine,
      "docs/app",
    );
    const appConfig = JSON.parse(
      await readFile(
        path.join(mockDirectory, ".ui-review/config.json"),
        "utf8",
      ),
    );
    const appRules = JSON.parse(
      await readFile(path.join(mockDirectory, ".ui-review/rules.json"), "utf8"),
    );
    appConfig.baseURL = baseURL;
    appConfig.sourcePaths = ["src"];
    appConfig.viewports = appConfig.viewports.filter(
      (v) => v.name === "desktop",
    );
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(appConfig),
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(appRules),
    );
    const referenceApp = await cli(["check"]);
    assert.equal(
      referenceApp.code,
      0,
      referenceApp.stderr ||
        JSON.stringify(JSON.parse(referenceApp.stdout).findings?.slice(0, 3)),
    );
    appConfig.pages[0].path =
      "/app/?defects=framing,tabs,contrast,scales,context,alignment";
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(appConfig),
    );
    const defectiveApp = await cli(["check"]);
    assert.equal(
      defectiveApp.code,
      1,
      defectiveApp.stderr || defectiveApp.stdout,
    );
    const appFindings = JSON.parse(defectiveApp.stdout).findings;
    for (const id of [
      "app-bounded-framing",
      "app-complete-tabs",
      "app-zero-baseline",
      "app-shared-scale",
      "app-chart-context",
      "app-amount-alignment",
      "axe:color-contrast",
    ])
      assert.ok(
        appFindings.some((f) => f.rule === id),
        `Mock app should expose ${id}`,
      );
    // New policy IDs are first-class without pretending all their semantics are
    // automatically assessed. Both sides use one scoped contract and real DOM.
    const exampleDirectory = path.join(
      JSON.parse(setup.stdout).engine,
      "docs/examples",
    );
    // Screenshot-informed calibration: local units can pass while their parent
    // still fails. The same contract also rejects compact-but-hidden evidence.
    const patternCatalog = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "pattern-review-catalog.json"),
        "utf8",
      ),
    );
    const patternRules = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "pattern-review-rules.json"),
        "utf8",
      ),
    );
    const patternConfig = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "pattern-review-config.json"),
        "utf8",
      ),
    );
    await mkdir(path.join(project, "docs/examples"), { recursive: true });
    await cp(
      path.join(exampleDirectory, "pattern-review-design.md"),
      path.join(project, "docs/examples/pattern-review-design.md"),
    );
    await writeFile(rulesPath, JSON.stringify(patternRules));
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify({ ...patternConfig, baseURL, sourcePaths: ["src"] }),
    );
    const patternCheck = await cli(["check"]);
    assert.equal(
      patternCheck.code,
      1,
      patternCheck.stderr || patternCheck.stdout,
    );
    const patternReportPath = JSON.parse(patternCheck.stdout).report;
    const patternReport = JSON.parse(await readFile(patternReportPath, "utf8"));
    assert.equal(patternReport.pages.length, 4);
    const patternEvidence = path.join(
      repository,
      "dist/pattern-review-evidence",
    );
    await rm(patternEvidence, { recursive: true, force: true });
    await cp(
      path.dirname(patternReportPath),
      path.join(patternEvidence, "cli"),
      { recursive: true },
    );
    const patternFindings = {};
    for (const capture of patternReport.pages) {
      const ids = [
        ...new Set(capture.findings.map((finding) => finding.rule)),
      ].sort();
      assert.deepEqual(
        ids,
        [...patternCatalog.expected[capture.name]].sort(),
        JSON.stringify(capture.findings),
      );
      assert.equal(capture.viewport.name, "desktop");
      assert.equal(capture.details.complete, true);
      assert.ok(
        capture.metrics.evaluations.every(
          (entry) => entry.status === "checked",
        ),
      );
      patternFindings[capture.name] = {
        component: ids.filter((id) =>
          patternCatalog.componentRules.includes(id),
        ),
        composition: ids.filter((id) =>
          patternCatalog.compositionRules.includes(id),
        ),
      };
      for (const finding of capture.findings) {
        const rule = patternRules.find((rule) => rule.id === finding.rule);
        assert.deepEqual(finding.designRules, rule.designRules);
        assert.ok(
          rule.sources.every((source) => finding.sources.includes(source)),
        );
        assert.equal(finding.selector, rule.selector);
        if (rule.type === "max-height") {
          assert.ok(finding.actual > rule.max);
          assert.equal(finding.expected, rule.max);
        }
        if (rule.type === "visible-count") {
          assert.equal(finding.actual, 0);
          assert.equal(finding.expected, 3);
        }
      }
      if (capture.name === "hidden")
        assert.deepEqual(
          capture.findings.map((finding) => finding.actual).sort(),
          [".denominator", ".trend-value", ".trend-comparison"].sort(),
        );
    }
    assert.deepEqual(patternFindings.components.component, []);
    assert.deepEqual(patternFindings.composition, {
      component: [],
      composition: [],
    });
    // One synthetic operations pair exercises declared decision surfaces through
    // the packed CLI. No proprietary reference asset enters the package.
    const decisionCatalog = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "decision-catalog.json"),
        "utf8",
      ),
    );
    const decisionRules = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "decision-rules.json"),
        "utf8",
      ),
    );
    const decisionConfig = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "decision-config.json"),
        "utf8",
      ),
    );
    await mkdir(path.join(project, "docs/examples"), { recursive: true });
    await cp(
      path.join(exampleDirectory, "decision-rationale.md"),
      path.join(project, "docs/examples/decision-rationale.md"),
    );
    Object.assign(decisionConfig, { baseURL, sourcePaths: ["src"] });
    await writeFile(rulesPath, JSON.stringify(decisionRules));
    const decisionMetrics = {};
    for (const quality of ["bad", "good"]) {
      const scenario = {
        ...decisionConfig,
        pages: decisionConfig.pages.filter((page) => page.name === quality),
      };
      await writeFile(
        path.join(project, ".ui-review/config.json"),
        JSON.stringify(scenario),
      );
      const result = await cli(["check"]);
      assert.equal(
        result.code,
        quality === "bad" ? 1 : 0,
        result.stderr || result.stdout,
      );
      const report = JSON.parse(
        await readFile(JSON.parse(result.stdout).report, "utf8"),
      );
      const capture = report.pages[0];
      assert.deepEqual(
        [...new Set(capture.findings.map((finding) => finding.rule))].sort(),
        [...decisionCatalog.expected[quality]].sort(),
        JSON.stringify(capture.findings),
      );
      decisionMetrics[quality] = capture.metrics;
      assert.equal(capture.metrics.markContrasts.length, 6);
      assert.ok(
        capture.metrics.markContrasts.every(
          (mark) =>
            mark.status === "measured" &&
            (quality === "good" ? mark.ratio >= 3 : mark.ratio < 3),
        ),
      );
      assert.deepEqual(capture.metrics.repeatedMetrics[0].counts, {
        readiness: quality === "good" ? 1 : 2,
        observations: quality === "good" ? 1 : 2,
      });
      assert.ok(
        quality === "good"
          ? capture.metrics.evidenceDistances[0].distance <= 80
          : capture.metrics.evidenceDistances[0].distance > 80,
      );
      const density = capture.metrics.density[0];
      assert.ok(
        quality === "good"
          ? density.coverage >= 0.06 && density.largestVerticalGap <= 48
          : density.coverage < 0.06 || density.largestVerticalGap > 48,
      );
      if (quality === "bad") {
        assert.equal(
          capture.findings.filter(
            (finding) =>
              finding.rule === "decision-scalar-height" && finding.actual > 56,
          ).length,
          2,
        );
        for (const finding of capture.findings) {
          const rule = decisionRules.find((rule) => rule.id === finding.rule);
          assert.deepEqual(finding.designRules, rule.designRules);
          assert.ok(
            rule.sources.every((source) => finding.sources.includes(source)),
          );
        }
      }
      assert.equal(
        report.designPolicy.rules.find((rule) => rule.id === "DR-016")
          .enforcement,
        "review",
        "A solid-paint contrast check must not promote semantic color to fully automated enforcement",
      );
    }
    assert.ok(
      decisionMetrics.good.density[0].coverage >
        decisionMetrics.bad.density[0].coverage,
    );

    // Missing declarations and unsupported paint cannot become a successful
    // review by removing evidence or measuring nominal colors over a gradient.
    await writeFile(
      path.join(project, "decision-missing.mjs"),
      `export default async function ({ page }) {
      await page.locator('summary [data-metric="readiness"]').evaluate((el) => el.removeAttribute('data-metric'));
      await page.locator('.decision-text').evaluate((el) => { el.textContent = ''; });
      await page.locator('.map').evaluate((el) => { el.style.backgroundImage = 'linear-gradient(white, black)'; });
    }`,
    );
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify({
        ...decisionConfig,
        pages: [
          {
            ...decisionConfig.pages.find((page) => page.name === "good"),
            checkpoints: [
              { name: "missing-evidence", setup: "decision-missing.mjs" },
            ],
          },
        ],
      }),
    );
    const missingDecision = await cli(["check"]);
    assert.equal(
      missingDecision.code,
      1,
      missingDecision.stderr || missingDecision.stdout,
    );
    const missingReport = JSON.parse(
      await readFile(JSON.parse(missingDecision.stdout).report, "utf8"),
    );
    for (const [id, status] of [
      ["decision-repeated-summary", "missing"],
      ["decision-evidence-distance", "missing"],
      ["decision-mark-contrast", "unassessed"],
    ]) {
      assert.equal(
        missingReport.pages[0].metrics.evaluations.find(
          (entry) => entry.rule === id,
        ).status,
        status,
      );
      assert.ok(
        missingReport.pages[0].findings.some((finding) => finding.rule === id),
      );
    }
    assert.ok(
      missingReport.pages[0].metrics.markContrasts.every(
        (mark) => mark.status === "unassessed" && mark.ratio === undefined,
      ),
    );

    // Four declared composition relationships share one baseline and one
    // controlled counterexample each, exercised through the installed CLI.
    const compositionRules = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "composition-rules.json"),
        "utf8",
      ),
    );
    const compositionConfig = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "composition-config.json"),
        "utf8",
      ),
    );
    Object.assign(compositionConfig, { baseURL, sourcePaths: ["src"] });
    await writeFile(rulesPath, JSON.stringify(compositionRules));
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(compositionConfig),
    );
    const compositionCheck = await cli(["check"]);
    assert.equal(
      compositionCheck.code,
      1,
      compositionCheck.stderr || compositionCheck.stdout,
    );
    const compositionReportFile = JSON.parse(compositionCheck.stdout).report;
    const compositionReport = JSON.parse(
      await readFile(compositionReportFile, "utf8"),
    );
    const compositionEvidence = path.join(
      repository,
      "dist/composition-evidence",
    );
    await mkdir(compositionEvidence, { recursive: true });
    await cp(
      path.dirname(compositionReportFile),
      path.join(compositionEvidence, "report"),
      { recursive: true },
    );
    for (const capture of compositionReport.pages) {
      const [family, quality] = capture.name.split("-");
      const expected =
        quality === "bad" &&
        (family !== "economy" || capture.viewport.name === "wide")
          ? [`composition-${family === "economy" ? "growth" : family}`]
          : [];
      assert.deepEqual(
        [...new Set(capture.findings.map((finding) => finding.rule))],
        expected,
        JSON.stringify(capture.findings),
      );
      const measured = capture.metrics.composition;
      if (family === "alignment") {
        assert.equal(
          measured.find((entry) => entry.rule === "composition-alignment")
            .maxResidual,
          quality === "good" ? 0 : 24,
        );
      } else if (family === "rhythm") {
        const rhythm = measured.find(
          (entry) => entry.rule === "composition-rhythm",
        );
        assert.deepEqual(rhythm.gaps, quality === "good" ? [12, 12] : [12, 36]);
        assert.equal(
          rhythm.coefficientOfVariation,
          quality === "good" ? 0 : 0.5,
        );
      } else if (family === "balance") {
        const balance = measured.find(
          (entry) => entry.rule === "composition-balance",
        );
        assert.ok(
          quality === "good"
            ? balance.coefficientOfVariation < 0.001
            : balance.coefficientOfVariation > 0.29,
        );
        assert.equal(
          measured.find((entry) => entry.rule === "composition-peer-type")
            .coefficientOfVariation,
          0,
        );
      } else {
        const growth = capture.metrics.growth[0];
        assert.deepEqual(growth.keys.slice(0, 3), [
          "AL-104",
          "BI-208",
          "CE-312",
        ]);
        assert.equal(
          growth.keys.length,
          quality === "good" && capture.viewport.name === "wide" ? 6 : 3,
        );
        if (capture.viewport.name === "wide") {
          assert.equal(growth.comparison.referenceCount, 3);
          assert.deepEqual(growth.comparison.lostKeys, []);
          assert.equal(growth.comparison.referenceArea, 686 * 336);
          assert.equal(growth.area, 1166 * 336);
          assert.equal(growth.comparison.areaGrowth, 480 / 686);
          assert.equal(
            growth.comparison.yield,
            quality === "good" ? 686 / 480 : 0,
          );
        }
        const chrome = measured.find(
          (entry) => entry.rule === "composition-chrome",
        );
        assert.ok(chrome.valid && chrome.ratio < 0.45);
      }
    }
    const savedGlobalDirectory = env.VIEWRULE_CONFIG_DIR;
    env.VIEWRULE_CONFIG_DIR = path.join(project, "composition-global");
    await mkdir(env.VIEWRULE_CONFIG_DIR);
    await writeFile(
      path.join(env.VIEWRULE_CONFIG_DIR, "rules.json"),
      JSON.stringify([
        {
          ...compositionRules.find((rule) => rule.id === "composition-growth"),
          id: "global-growth",
          pages: ["economy-good"],
        },
      ]),
    );
    await writeFile(rulesPath, "[]");
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify({
        ...compositionConfig,
        pages: [
          compositionConfig.pages.find((page) => page.name === "economy-good"),
        ],
        viewports: [compositionConfig.viewports[0]],
      }),
    );
    const referenceOnly = await cli(["contract"]);
    assert.equal(referenceOnly.code, 2);
    assert.match(
      referenceOnly.stderr,
      /global-growth.*at least two captured viewports/,
    );
    env.VIEWRULE_CONFIG_DIR = savedGlobalDirectory;
    // The same workflow records useful finite whitespace, nested chrome union,
    // a concrete prominence regression, and missing evidence isolated by checkpoint.
    await writeFile(
      path.join(project, "composition-checkpoint.mjs"),
      `export default async function ({ page, checkpoint }) {
      if (checkpoint.name === 'missing-identity' && page.viewportSize().width < 1000)
        await page.locator('.queue li').first().evaluate((el) => el.removeAttribute('data-shipment'));
      if (checkpoint.name === 'lost-identity' && page.viewportSize().width > 1000)
        await page.locator('.queue li').first().evaluate((el) => {
          el.setAttribute('data-shipment', 'AL-999');
          el.querySelector('strong').textContent = 'AL-999';
        });
      if (checkpoint.name === 'oversized-chrome')
        await page.locator('#good .economy-surface > header').evaluate((el) => { el.style.minHeight = '600px'; });
      if (checkpoint.name === 'unequal-type')
        await page.locator('.coverage-peers h4').nth(1).evaluate((el) => { el.style.fontSize = '24px'; });
    }`,
    );
    const finiteRule = {
      ...compositionRules.find((rule) => rule.id === "composition-growth"),
      id: "composition-finite",
      pages: ["economy-finite"],
      finiteKeys: ["AL-104", "BI-208", "CE-312"],
    };
    await writeFile(
      rulesPath,
      JSON.stringify([
        ...compositionRules.flatMap((rule) => {
          if (!rule.pages) return [rule];
          const pages = rule.pages.filter((name) =>
            ["economy-good", "balance-good"].includes(name),
          );
          if (rule.id === "composition-chrome") pages.push("chrome-regression");
          return pages.length ? [{ ...rule, pages }] : [];
        }),
        finiteRule,
      ]),
    );
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify({
        ...compositionConfig,
        pages: [
          {
            ...compositionConfig.pages.find(
              (page) => page.name === "economy-good",
            ),
            checkpoints: [
              { name: "intact", setup: "composition-checkpoint.mjs" },
              { name: "missing-identity", setup: "composition-checkpoint.mjs" },
              { name: "lost-identity", setup: "composition-checkpoint.mjs" },
            ],
          },
          {
            ...compositionConfig.pages.find(
              (page) => page.name === "balance-good",
            ),
            checkpoints: [
              { name: "unequal-type", setup: "composition-checkpoint.mjs" },
            ],
          },
          {
            name: "economy-finite",
            path: "/examples/composition.html?rule=DR-019&quality=good&mode=finite",
            ready: "#composition-examples[data-ready]",
          },
          {
            name: "chrome-regression",
            path: "/examples/composition.html?rule=DR-019&quality=good",
            ready: "#composition-examples[data-ready]",
            checkpoints: [
              { name: "oversized-chrome", setup: "composition-checkpoint.mjs" },
            ],
          },
        ],
      }),
    );
    const compositionRegressionCheck = await cli(["check"]);
    assert.equal(
      compositionRegressionCheck.code,
      1,
      compositionRegressionCheck.stderr || compositionRegressionCheck.stdout,
    );
    const compositionRegressionFile = JSON.parse(
      compositionRegressionCheck.stdout,
    ).report;
    const compositionRegression = JSON.parse(
      await readFile(compositionRegressionFile, "utf8"),
    );
    await cp(
      path.dirname(compositionRegressionFile),
      path.join(compositionEvidence, "regression-report"),
      { recursive: true },
    );
    for (const capture of compositionRegression.pages) {
      if (capture.name === "economy-finite") {
        assert.deepEqual(capture.findings, []);
        const growth = capture.metrics.growth[0];
        assert.equal(growth.keys.length, 3);
        if (capture.viewport.name === "wide") {
          assert.equal(growth.comparison.yield, 0);
          assert.equal(growth.comparison.status, "saturated");
        }
      } else if (capture.name === "economy-good") {
        const growth = capture.metrics.growth[0];
        if (capture.checkpoint === "missing-identity") {
          assert.equal(growth.valid, capture.viewport.name === "wide");
          assert.equal(growth.comparison.status, "unassessed");
          assert.ok(
            capture.findings.some(
              (finding) => finding.rule === "composition-growth",
            ),
          );
          assert.equal(
            capture.metrics.evaluations.find(
              (entry) => entry.rule === "composition-growth",
            ).status,
            "unassessed",
          );
          if (capture.viewport.name === "wide")
            assert.match(
              growth.comparison.reason,
              /reference evidence is missing or invalid/,
            );
        } else if (
          capture.checkpoint === "lost-identity" &&
          capture.viewport.name === "wide"
        ) {
          assert.equal(growth.valid, true);
          assert.equal(growth.keys.length, 6);
          assert.equal(growth.comparison.yield, 686 / 480);
          assert.deepEqual(growth.comparison.lostKeys, ["AL-104"]);
          assert.ok(
            capture.findings.some(
              (finding) =>
                finding.rule === "composition-growth" &&
                /lost previously visible task evidence/.test(finding.message),
            ),
          );
        } else {
          assert.deepEqual(capture.findings, []);
          if (capture.viewport.name === "wide")
            assert.equal(
              growth.comparison.yield,
              686 / 480,
              "A missing identity in another checkpoint must not contaminate this comparison",
            );
        }
      } else if (capture.name === "balance-good") {
        assert.ok(
          capture.findings.some(
            (finding) => finding.rule === "composition-peer-type",
          ),
        );
        assert.ok(
          capture.metrics.composition.find(
            (entry) => entry.rule === "composition-peer-type",
          ).coefficientOfVariation > 0.2,
        );
      } else {
        const chrome = capture.metrics.composition.find(
          (entry) => entry.rule === "composition-chrome",
        );
        assert.ok(chrome.ratio > 0.45 && chrome.ratio <= 1);
        assert.ok(
          capture.findings.some(
            (finding) => finding.rule === "composition-chrome",
          ),
        );
      }
    }

    const catalog = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "behavior-catalog.json"),
        "utf8",
      ),
    );
    const additions = Array.from(
      { length: 8 },
      (_, i) => `DR-${String(i + 9).padStart(3, "0")}`,
    );
    assert.deepEqual(
      catalog.rules.map((rule) => rule.id),
      additions,
    );
    for (const rule of catalog.rules) {
      for (const key of [
        "task",
        "good",
        "bad",
        "exception",
        "verification",
        "policyAnchor",
      ])
        assert.ok(rule[key]?.trim(), `${rule.id} needs ${key}`);
      assert.ok(
        rule.alternatives.length &&
          rule.sources.every((url) => new URL(url).protocol === "https:"),
      );
    }
    const contextSchema = JSON.parse(
      (await cli(["schema", "--type", "context"])).stdout,
    );
    assert.equal(contextSchema.properties.designRules.items.enum.length, 20);
    assert.deepEqual(
      contextSchema.properties.designRules.items.enum.slice(8, 16),
      additions,
    );
    const conformance = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "conformance-matrix.json"),
        "utf8",
      ),
    );
    const registeredRules = contextSchema.properties.designRules.items.enum;
    for (const example of conformance.examples) {
      assert.equal(example.target, example.id);
      assert.deepEqual(Object.keys(example.rules), registeredRules);
      const failures = [];
      for (const [id, assessment] of Object.entries(example.rules)) {
        assert.ok(["pass", "fail", "not-applicable"].includes(assessment.good));
        assert.ok(["pass", "fail", "not-applicable"].includes(assessment.bad));
        assert.ok(
          assessment.evidence?.trim(),
          `${example.id}/${id} needs evidence`,
        );
        assert.ok(
          ["automated", "behavioral", "human-review", "rationale"].includes(
            assessment.evidenceType,
          ),
          `${example.id}/${id} needs a valid evidenceType`,
        );
        if (assessment.good === "not-applicable")
          assert.equal(
            assessment.evidenceType,
            "rationale",
            `${example.id}/${id} not-applicable needs rationale evidence`,
          );
        assert.notEqual(
          assessment.good,
          "fail",
          `${example.id} Good must not fail ${id}`,
        );
        if (assessment.bad === "fail") failures.push(id);
        else
          assert.equal(
            assessment.bad,
            assessment.good,
            `${example.id} non-target ${id} must match Good`,
          );
      }
      assert.deepEqual(
        failures,
        [example.target],
        `${example.id} Bad must fail exactly its target rule`,
      );
    }

    const behaviorConfig = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "behavior-config.json"),
        "utf8",
      ),
    );
    const behaviorRules = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "behavior-rules.json"),
        "utf8",
      ),
    );
    Object.assign(behaviorConfig, {
      baseURL,
      sourcePaths: ["src"],
      requiredDesignRules: ["DR-016"],
    });
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(behaviorConfig),
    );
    await writeFile(rulesPath, JSON.stringify(behaviorRules));
    const behaviorCheck = await cli(["check"]);
    assert.equal(
      behaviorCheck.code,
      1,
      behaviorCheck.stderr || behaviorCheck.stdout,
    );
    const behaviorReport = JSON.parse(
      await readFile(JSON.parse(behaviorCheck.stdout).report, "utf8"),
    );
    assert.equal(behaviorReport.designPolicy.rules.length, 20);
    for (const capture of behaviorReport.pages) {
      const findings = capture.findings.filter(
        (finding) => finding.rule !== "design-coverage",
      );
      const dr = capture.name === "failed-refresh" ? "DR-009" : "DR-015";
      assert.equal(
        findings.length,
        dr === "DR-009" ? 0 : 2,
        JSON.stringify(capture.findings),
      );
      if (dr === "DR-009") {
        assert.deepEqual(
          findings,
          [],
          "The DR-009 counterexample must not acquire unrelated native defects; its intentional state-model violation is exercised by the application checkpoint.",
        );
      } else {
        assert.ok(
          findings.every((finding) => finding.designRules.includes(dr)),
        );
        assert.ok(
          findings.every(
            (finding) =>
              finding.actual.scrollWidth > finding.actual.clientWidth + 1,
          ),
        );
      }
      assert.equal(
        capture.designCoverage.find((rule) => rule.id === "DR-016").status,
        "unassessed",
      );
      assert.equal(
        capture.findings.filter(
          (finding) =>
            finding.rule === "design-coverage" &&
            finding.designRules.includes("DR-016"),
        ).length,
        1,
        "A required subjective rule must not acquire a false pass from the catalog or a palette label",
      );
    }
    await writeFile(
      proposal,
      JSON.stringify({ ...behaviorRules[0], designRules: ["DR-021"] }),
    );
    assert.equal(
      (await cli(["add-rule", "--rule", proposal, "--dry-run"])).code,
      2,
      "Unregistered design-rule IDs remain invalid",
    );
    const browser = await chromium.launch({
      executablePath:
        process.env.VIEWRULE_BROWSER_PATH ||
        process.env.UI_REVIEW_BROWSER_PATH ||
        undefined,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      const patternErrors = [];
      const recordPatternError = (error) => patternErrors.push(error.message);
      page.on("pageerror", recordPatternError);
      const patternLayouts = {};
      const patternFacts = {
        ".group-identity": "Emerging pattern — Sample group Q7",
        ".observation-window": "Ranking window: cycles I–L",
        ".confidence": "High confidence",
        ".direction": "Decreasing",
        ".rate-value": "26.4%",
        ".denominator": "231 of 875 classified records",
        ".trend-value": "−8.6%",
        ".trend-comparison": "Relative change vs cycles E–H",
        ".volume-value": "875 records",
        ".rate-weight": "Ranking weight: 45%",
        ".trend-weight": "Ranking weight: 35%",
        ".volume-weight": "Ranking weight: 20%",
        ".processing-context .context-value":
          "Average duration: unavailable · Retries observed: 2 of 7 runs",
        ".corroboration-context .context-value":
          "Confirmed reviews: 3 recent · 7 total",
        ".mix-context .context-value":
          "Subtype share: unavailable · Subgroup review rate: 47.2%",
      };
      for (const stage of ["before", "components", "composition", "hidden"]) {
        // Use built Pages paths too: no root-relative asset assumptions.
        await page.goto(
          `${baseURL}/viewrule/examples/pattern-review.html?stage=${stage}`,
        );
        await page.waitForSelector(`#pattern-review[data-ready="${stage}"]`);
        patternLayouts[stage] = await page.evaluate((selectors) => {
          const doc = globalThis.document;
          const bounds = (selector) =>
            doc.querySelector(selector).getBoundingClientRect();
          return {
            surfaceHeight: bounds(".pattern-surface").height,
            evidenceHeight: bounds(".evidence-panel").height,
            headerHeight: bounds(".identity-header").height,
            toolbarHeight: bounds(".chart-toolbar").height,
            chartHeight: bounds(".history-chart").height,
            chartWidth: bounds(".history-chart").width,
            cardHeights: [...doc.querySelectorAll(".evidence-card")].map(
              (card) => card.getBoundingClientRect().height,
            ),
            facts: Object.fromEntries(
              selectors.map((selector) => [
                selector,
                (
                  doc.querySelector(selector).getAttribute("aria-label") ||
                  [...doc.querySelector(selector).childNodes]
                    .map((node) =>
                      node.nodeName === "BR" ? " · " : node.textContent,
                    )
                    .join("")
                )
                  .trim()
                  .replace(/\s+/g, " "),
              ]),
            ),
            fontSizes: selectors.map(
              (selector) =>
                globalThis.getComputedStyle(doc.querySelector(selector))
                  .fontSize,
            ),
            secondary: [...doc.querySelectorAll(".supporting-copy")].map(
              (node) => node.textContent.trim(),
            ),
            chartPoints: doc
              .querySelector(".chart-line")
              .getAttribute("points"),
          };
        }, Object.keys(patternFacts));
        assert.deepEqual(patternLayouts[stage].facts, patternFacts);
        const revised = ["composition", "hidden"].includes(stage);
        assert.equal(
          await page.locator(".evidence-grid > article").count(),
          revised ? 3 : 6,
        );
        assert.equal(await page.locator(".ranking-summary").count(), 3);
        assert.deepEqual(
          await page.locator(".context-role").allTextContents(),
          Array(revised ? 1 : 3).fill("Not used in ranking"),
        );
        assert.equal(
          await page.getByText("Why flagged", { exact: true }).count(),
          ["before", "components"].includes(stage) ? 2 : 1,
        );
        assert.equal(
          await page.locator("details[open]").count(),
          stage === "before" ? 6 : 0,
        );
        for (const selector of Object.keys(patternFacts)) {
          const hidden =
            stage === "hidden" &&
            [".denominator", ".trend-value", ".trend-comparison"].includes(
              selector,
            );
          assert.equal(
            await page.locator(selector).isVisible(),
            !hidden,
            `${stage}: ${selector}`,
          );
        }
        if (revised) {
          const compositionGeometry = await page.evaluate(() => {
            const doc = globalThis.document;
            const box = (selector) =>
              doc.querySelector(selector).getBoundingClientRect();
            const center = (selector) => {
              const b = box(selector);
              return b.y + b.height / 2;
            };
            const track = box(".comparison-track");
            return {
              titleCenters: [
                ".group-identity",
                ".confidence",
                ".direction",
              ].map(center),
              controlCenters: [".chart-controls", ".latest-value"].map(center),
              latestGap:
                box(".latest-value").left - box(".chart-controls").right,
              contextRows: [
                ...doc.querySelectorAll(".context-rows > article"),
              ].map((row) => ({
                height: row.getBoundingClientRect().height,
                labelLeft: row.querySelector("h4").getBoundingClientRect().left,
                labelHeight: row.querySelector("h4").getBoundingClientRect()
                  .height,
                valueHeight: row
                  .querySelector(".context-value")
                  .getBoundingClientRect().height,
                role: row.getAttribute("aria-describedby"),
              })),
              currentRatio: box(".current-bar").width / track.width,
              priorRatio:
                (box(".prior-marker").left - track.left) / track.width,
              rateBarCenters: [
                ".current-bar",
                '[data-factor="rate"] .weight-track',
              ].map(center),
              weights: [...doc.querySelectorAll(".ranking-summary")].map(
                (row) => {
                  const weight = row.querySelector(".weight");
                  const track = row
                    .querySelector(".weight-track")
                    .getBoundingClientRect();
                  const bar = row
                    .querySelector(".weight-bar")
                    .getBoundingClientRect();
                  const detail = row
                    .querySelector("summary")
                    .getBoundingClientRect();
                  const subject = row
                    .querySelector("h4")
                    .getBoundingClientRect();
                  return {
                    percent: parseFloat(weight.textContent),
                    ratio: bar.width / track.width,
                    left: track.left,
                    width: track.width,
                    height: bar.height,
                    valueGap:
                      track.top -
                      row.querySelector(".weight-value").getBoundingClientRect()
                        .bottom,
                    subjectLeft: subject.left,
                    rowLeft: row.getBoundingClientRect().left,
                    detailLeft: detail.left,
                    detailGap: detail.top - subject.bottom,
                    scale: weight.getAttribute("aria-describedby"),
                  };
                },
              ),
            };
          });
          for (const centers of [
            compositionGeometry.titleCenters,
            compositionGeometry.controlCenters,
          ])
            assert.ok(
              Math.max(...centers) - Math.min(...centers) <= 1,
              "Related header/toolbar items share a centerline",
            );
          assert.ok(
            compositionGeometry.latestGap >= 0 &&
              compositionGeometry.latestGap <= 12,
          );
          assert.equal(compositionGeometry.contextRows.length, 3);
          assert.equal(
            new Set(compositionGeometry.contextRows.map((row) => row.labelLeft))
              .size,
            1,
          );
          for (const row of compositionGeometry.contextRows) {
            assert.ok(
              row.height <= 36 &&
                row.labelHeight <= 21 &&
                row.valueHeight <= 21,
              "Context labels, values and Details fit on one aligned line",
            );
            assert.equal(row.role, "context-role");
          }
          assert.equal(
            await page.locator("#context-role").textContent(),
            "Not used in ranking",
          );
          assert.equal(
            await page.locator(".weight-heading").textContent(),
            "Weight · 0–100%",
          );
          assert.deepEqual(
            compositionGeometry.weights.map((weight) => weight.percent),
            [45, 35, 20],
          );
          for (const property of ["left", "width"])
            assert.equal(
              new Set(
                compositionGeometry.weights.map((weight) => weight[property]),
              ).size,
              1,
              "Ranking weights share aligned, equal-width 0–100% tracks",
            );
          for (const weight of compositionGeometry.weights) {
            assert.ok(Math.abs(weight.ratio - weight.percent / 100) < 0.001);
            assert.ok(weight.width >= 100 && weight.height >= 6);
            assert.ok(weight.valueGap >= 4 && weight.valueGap <= 8);
            assert.ok(
              Math.abs(weight.detailLeft - weight.subjectLeft) <= 1 &&
                Math.abs(weight.detailLeft - weight.rowLeft) <= 1 &&
                weight.detailGap >= 4 &&
                weight.detailGap <= 12,
              "Each Details control is aligned below its subject at the far left",
            );
            assert.equal(weight.scale, "weight-heading");
          }
          assert.ok(
            Math.max(...compositionGeometry.rateBarCenters) -
              Math.min(...compositionGeometry.rateBarCenters) <=
              1,
            "Review-rate and weight bars share a horizontal centerline",
          );
          assert.ok(
            Math.abs(compositionGeometry.currentRatio - 26.4 / 50) < 0.001,
          );
          assert.ok(
            Math.abs(compositionGeometry.priorRatio - 28.875 / 50) < 0.001,
          );
          patternLayouts[stage].compositionGeometry = compositionGeometry;
        }
        await page
          .locator(".pattern-surface")
          .screenshot({ path: path.join(patternEvidence, `${stage}.png`) });
      }
      for (const stage of ["before", "components", "hidden"]) {
        for (const key of ["fontSizes", "secondary", "chartPoints"])
          assert.deepEqual(
            patternLayouts[stage][key],
            patternLayouts.composition[key],
          );
      }
      assert.ok(
        patternLayouts.before.cardHeights
          .slice(0, 5)
          .every((height) => height >= 360),
      );
      assert.ok(
        patternLayouts.components.cardHeights
          .slice(0, 5)
          .every((height) => height >= 310),
      );
      assert.ok(patternLayouts.components.evidenceHeight > 360);
      assert.ok(patternLayouts.composition.evidenceHeight <= 360);
      assert.ok(patternLayouts.composition.headerHeight <= 56);
      assert.ok(
        patternLayouts.composition.chartHeight >= 120 &&
          patternLayouts.composition.chartHeight <= 160,
      );
      assert.ok(patternLayouts.composition.chartWidth >= 600);
      assert.ok(patternLayouts.composition.surfaceHeight <= 560);
      assert.ok(
        patternLayouts.composition.surfaceHeight <
          patternLayouts.components.surfaceHeight * 0.5,
      );

      assert.ok(
        patternLayouts.composition.surfaceHeight <
          patternLayouts.components.surfaceHeight * 0.75,
      );
      assert.ok(
        patternLayouts.composition.fontSizes.every(
          (size) => parseFloat(size) >= 14,
        ),
      );

      await page.goto(`${baseURL}/viewrule/examples/pattern-review.html`);
      await page.waitForSelector('#pattern-review[data-ready="composition"]');
      const disclosureNames = [
        "Details: Rate calculation",
        "Details: Trend calculation",
        "Details: Volume calculation",
        "Details: Processing diagnostics",
        "Details: Corroboration notes",
        "Details: Collection notes",
      ];
      assert.equal(
        await page.locator("summary").count(),
        disclosureNames.length,
      );
      for (const name of disclosureNames) {
        const summary = page.getByLabel(name, { exact: true });
        assert.equal(await summary.textContent(), "Details");
      }
      // Chromium exposes native summaries as DisclosureTriangle nodes; the
      // generic ARIA text snapshot omits their computed names.
      const accessibilitySession = await page.context().newCDPSession(page);
      const { nodes: accessibilityNodes } = await accessibilitySession.send(
        "Accessibility.getFullAXTree",
      );
      await accessibilitySession.detach();
      assert.deepEqual(
        accessibilityNodes
          .filter(
            (node) =>
              !node.ignored && node.role?.value === "DisclosureTriangle",
          )
          .map((node) => node.name?.value),
        disclosureNames,
      );
      const rankingBefore = await page
        .locator(".ranking-summary")
        .allTextContents();
      for (const { label, count, start } of [
        { label: "4 cycles", count: 4, start: "I" },
        { label: "8 cycles", count: 8, start: "E" },
        { label: "All cycles", count: 12, start: "A" },
      ]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        assert.equal(
          await page
            .getByRole("button", { name: label, exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await page.locator("button[aria-pressed=true]").count(),
          1,
        );
        assert.equal(
          await page.locator(".chart-window").textContent(),
          `History: cycles ${start}–L`,
        );
        const points = (
          await page.locator(".chart-line").getAttribute("points")
        ).split(" ");
        assert.equal(points.length, count);
        assert.equal(points.at(-1), "1000,100.8");
        assert.deepEqual(
          await page.locator(".ranking-summary").allTextContents(),
          rankingBefore,
        );
        assert.equal(
          await page.locator(".action-status").textContent(),
          "Not queued",
        );
      }
      const disclosure = page.locator(".trend-detail summary");
      await disclosure.focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await page.locator(".trend-detail").getAttribute("open"),
        "",
      );
      assert.equal(
        await page.locator(".trend-detail .supporting-copy").isVisible(),
        true,
      );
      assert.ok(
        await page.locator(".trend-detail").evaluate((detail) => {
          const summary = detail
            .querySelector("summary")
            .getBoundingClientRect();
          const copy = detail
            .querySelector(".supporting-copy")
            .getBoundingClientRect();
          return copy.top >= summary.bottom;
        }),
        "Expanded supporting text stays below the row and its left-hand Details control",
      );
      assert.equal(
        await disclosure.evaluate(
          (el) => el === globalThis.document.activeElement,
        ),
        true,
      );
      for (const selector of Object.keys(patternFacts))
        assert.equal(await page.locator(selector).isVisible(), true);
      assert.equal(
        await page.locator(".action-status").textContent(),
        "Not queued",
      );
      await page.locator(".pattern-surface").screenshot({
        path: path.join(patternEvidence, "composition-expanded.png"),
      });
      await page.keyboard.press("Enter");
      assert.equal(
        await page.locator(".trend-detail .supporting-copy").isVisible(),
        false,
      );
      const contextDisclosures = [];
      for (const context of ["processing", "corroboration", "mix"]) {
        const row = page.locator(`.context-rows [data-context="${context}"]`);
        const detail = row.locator("details");
        const summary = detail.locator("summary");
        const before = await summary.boundingBox();
        await summary.focus();
        await page.keyboard.press("Enter");
        assert.equal(await detail.getAttribute("open"), "");
        assert.equal(
          await detail.locator(".supporting-copy").isVisible(),
          true,
        );
        const expanded = await summary.boundingBox();
        const content = await detail.locator(".supporting-copy").boundingBox();
        assert.ok(content.y >= expanded.y + expanded.height);
        assert.equal(await row.locator(".context-value").isVisible(), true);
        assert.equal(
          await summary.evaluate(
            (el) => el === globalThis.document.activeElement,
          ),
          true,
        );
        if (context === "processing")
          await page.locator(".pattern-surface").screenshot({
            path: path.join(
              patternEvidence,
              "composition-context-expanded.png",
            ),
          });
        await page.keyboard.press("Enter");
        assert.equal(await detail.getAttribute("open"), null);
        assert.equal(
          await detail.locator(".supporting-copy").isVisible(),
          false,
        );
        assert.equal(
          await summary.evaluate(
            (el) => el === globalThis.document.activeElement,
          ),
          true,
        );
        const closed = await summary.boundingBox();
        for (const bounds of [expanded, closed])
          for (const key of ["x", "y", "width", "height"])
            assert.ok(
              Math.abs(bounds[key] - before[key]) <= 1,
              `${context}: Details retains its position and target size through disclosure`,
            );
        contextDisclosures.push({ context, before, expanded, closed });
      }
      for (const selector of Object.keys(patternFacts))
        assert.equal(await page.locator(selector).isVisible(), true);
      assert.equal(
        await page.locator(".chart-window").textContent(),
        "History: cycles A–L",
      );
      assert.equal(
        await page.locator(".action-status").textContent(),
        "Not queued",
      );
      await page.getByRole("button", { name: "Queue Q7 for review" }).click();
      assert.equal(
        await page.locator(".action-status").textContent(),
        "Q7 queued locally · no external changes",
      );
      await page.getByRole("button", { name: "4 cycles", exact: true }).click();
      await disclosure.click();
      assert.equal(
        await page.locator(".action-status").textContent(),
        "Q7 queued locally · no external changes",
      );
      assert.deepEqual(
        await page.locator(".ranking-summary").allTextContents(),
        rankingBefore,
      );
      assert.deepEqual(patternErrors, []);
      page.off("pageerror", recordPatternError);
      await writeFile(
        path.join(patternEvidence, "captures.json"),
        JSON.stringify(
          {
            viewport: patternConfig.viewports[0],
            deviceScaleFactor: 1,
            browser: browser.version(),
            contractHash: patternReport.contract.hash,
            findings: patternFindings,
            layouts: patternLayouts,
            disclosureNames,
            contextDisclosures,
            interactions:
              "Passed: revised default route, inline header and chart controls, aligned one-line context rows with a shared pill, correct current/prior chart geometry, proportional weights on shared tracks, aligned review-rate and weight bars, Details below left-hand row subjects, visible disclosure labels retained in accessible names, stationary context controls through expansion/collapse, history range and fixed ranking scope, keyboard disclosure/focus, required facts retained, Q7-only local action, retained action state, Pages prefix assets.",
            unassessed: patternCatalog.humanReview,
          },
          null,
          2,
        ),
      );
      const decisionEvidence = path.join(repository, "dist/decision-evidence");
      await mkdir(decisionEvidence, { recursive: true });
      await page.setViewportSize(decisionConfig.viewports[0]);
      const layouts = {};
      for (const quality of ["good", "bad"]) {
        await page.goto(`${baseURL}/examples/decision.html?quality=${quality}`);
        await page.waitForSelector("#decision-examples[data-ready]");
        layouts[quality] = await page.evaluate(() => {
          const bounds = (selector) =>
            globalThis.document.querySelector(selector).getBoundingClientRect();
          return {
            height: bounds(".decision-surface").height,
            mapWidth: bounds(".map").width,
            mapHeight: bounds(".map").height,
            mapShare: bounds(".map").width / bounds(".analysis").width,
            evidence:
              globalThis.document.querySelector(".evidence").textContent,
            context: globalThis.document.querySelector(".context").textContent,
            labels: [...globalThis.document.querySelectorAll(".site")].map(
              (site) => site.textContent,
            ),
            textSize: globalThis.getComputedStyle(
              globalThis.document.querySelector(".decision-text"),
            ).fontSize,
          };
        });
        assert.ok(
          layouts[quality].mapShare > 0.45 && layouts[quality].mapShare < 0.52,
        );
        assert.ok(
          layouts[quality].mapWidth >= 480 && layouts[quality].mapHeight >= 340,
        );
        await page
          .locator(".decision-surface")
          .screenshot({ path: path.join(decisionEvidence, `${quality}.png`) });
      }
      assert.ok(
        layouts.good.height < layouts.bad.height * 0.7,
        "Hierarchy should reclaim area without shrinking text or the map to a thumbnail",
      );
      for (const key of ["evidence", "context", "labels", "textSize"])
        assert.deepEqual(layouts.good[key], layouts.bad[key]);
      await writeFile(
        path.join(decisionEvidence, "captures.json"),
        JSON.stringify(
          {
            viewport: decisionConfig.viewports[0],
            deviceScaleFactor: 1,
            browser: browser.version(),
            layouts: Object.fromEntries(
              Object.entries(layouts).map(
                ([
                  quality,
                  { evidence: _evidence, context: _context, ...measurements },
                ]) => [quality, measurements],
              ),
            ),
          },
          null,
          2,
        ),
      );
      // Deployment serves the same example beneath the repository prefix.
      await page.goto(
        `${baseURL}/viewrule/examples/decision.html?quality=good`,
      );
      await page.waitForSelector("#decision-examples[data-ready]");
      await page
        .getByRole("button", { name: "Prepare coverage review" })
        .click();
      assert.match(
        await page.locator(".action-status").textContent(),
        /Nodes A–F/,
      );
      await page.locator("summary").click();
      assert.equal(await page.locator(".analysis").isVisible(), false);
      await page.locator("summary").click();
      assert.equal(await page.locator(".analysis").isVisible(), true);
      await page.setViewportSize({ width: 1440, height: 1000 });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(`${baseURL}/app/`);
      await page.waitForSelector("#application[data-ready]");
      await page.locator('[data-view="attention"]').click();
      assert.equal(await page.locator(".shipment-row").count(), 3);
      await page.locator(".select-parcel").nth(1).click();
      assert.equal(
        await page.locator("#parcel-heading").textContent(),
        "EP 1047",
      );
      await page.locator(".expand-parcel").nth(1).click();
      await page.locator("#tab-events").click();
      assert.match(
        await page.locator("#event-list").textContent(),
        /Bakersfield/,
      );
      await page.locator("#lab-toggle").click();
      await page.locator('.defect-option input[value="framing"]').check();
      assert.equal(
        await page.locator("#parcel-heading").textContent(),
        "EP 1047",
      );
      assert.equal(
        await page.locator(".shipment-disclosure:visible").count(),
        1,
      );
      await page.reload();
      await page.waitForSelector("#application[data-ready]");
      assert.equal(
        await page.locator("#parcel-heading").textContent(),
        "EP 1047",
      );
      assert.equal(
        await page.locator(".shipment-disclosure:visible").count(),
        1,
      );
      await page.locator("#lab-toggle").click();
      await page.locator("#reset-design").click();
      await page.keyboard.press("Escape");
      await page.locator("#search").fill("no matching parcel");
      assert.equal(await page.locator("#empty-state").isVisible(), true);
      await page.locator("#clear-filters").click();
      assert.equal(await page.locator(".shipment-row").count(), 12);
      assert.deepEqual(pageErrors, []);

      // The optional gallery still loads the shared implementation.
      await page.goto(`${baseURL}/examples/behavior.html?rule=DR-010`);
      await page.waitForSelector(
        '#behavior-examples[data-ready][data-rule="DR-010"]',
      );
      await page.locator("#rule-picker").selectOption("DR-009");
      assert.equal(
        await page.locator('#good [data-role="count"]').textContent(),
        "12",
      );

      await page.setViewportSize({ width: 1280, height: 900 });
      for (const id of ["DR-017", "DR-018", "DR-019", "DR-020"]) {
        const variants = {};
        for (const quality of ["good", "bad"]) {
          await page.goto(
            `${baseURL}/examples/composition.html?rule=${id}&quality=${quality}`,
          );
          await page.waitForSelector(
            `#composition-examples[data-ready][data-rule="${id}"]`,
          );
          variants[quality] = await page
            .locator(`#${quality} .composition-surface`)
            .evaluate((surface) => ({
              text: surface.textContent.replace(/\s+/g, " ").trim(),
              headings: [...surface.querySelectorAll("h3, h4")].map((el) => ({
                text: el.textContent,
                size: globalThis.getComputedStyle(el).fontSize,
              })),
              identities: [...surface.querySelectorAll("[data-shipment]")].map(
                (el) => el.getAttribute("data-shipment"),
              ),
              colors: [...surface.querySelectorAll("h3, h4, strong")].map(
                (el) => globalThis.getComputedStyle(el).color,
              ),
              width: surface.getBoundingClientRect().width,
            }));
          await page.locator(`#${quality} .composition-surface`).screenshot({
            path: path.join(compositionEvidence, `${id}-${quality}.png`),
          });
        }
        assert.deepEqual(
          variants.good,
          variants.bad,
          `${id} must preserve task text, identities, heading type, semantic color, and total surface width`,
        );
      }

      // Every canonical rule owns its examples and resolves links under /viewrule/.
      for (let number = 1; number <= 20; number++) {
        const id = `DR-${String(number).padStart(3, "0")}`;
        const url = `${baseURL}/viewrule/rules/${id.toLowerCase()}/`;
        await page.goto(url);
        await page.waitForSelector(`[data-ready][data-rule="${id}"]`);
        const links = await page
          .locator("a[href], link[href], script[src]")
          .evaluateAll((elements) =>
            elements.map(
              (el) => el.getAttribute("href") || el.getAttribute("src"),
            ),
          );
        for (const link of links) {
          const target = new URL(link, url);
          if (target.origin !== new URL(baseURL).origin) continue;
          assert.ok(
            !target.pathname.startsWith("/viewrule/examples/"),
            `${id} depends on the gallery: ${link}`,
          );
          assert.ok(
            (await page.request.get(target.href)).ok(),
            `${id} has a broken link: ${link}`,
          );
        }
        assert.equal(await page.locator("#good .sample").count(), 1);
        assert.equal(await page.locator("#bad .sample").count(), 1);
        if (number <= 8) {
          const before = await page.locator("#good .sample").innerHTML();
          await page.locator("#evidence-toggle").click();
          assert.notEqual(
            await page.locator("#good .sample").innerHTML(),
            before,
            `${id} control must change the example`,
          );
          await page.locator("#evidence-toggle").click();
          assert.equal(
            await page.locator("#good .sample").innerHTML(),
            before,
            `${id} must restore its starting comparison`,
          );
        } else {
          assert.equal(await page.locator("#rule-picker").isVisible(), false);
          assert.equal(
            page.url(),
            url,
            "An embedded example must not change the rule URL",
          );
        }
      }

      // One connected inline walkthrough, with one positive/negative boundary
      // for each new concern; not a new test suite or universal UI detector.
      await page.setViewportSize({ width: 1200, height: 1000 });
      await page.emulateMedia({ colorScheme: "light" });
      const evidenceDirectory = path.join(repository, "dist/behavior-evidence");
      await mkdir(evidenceDirectory, { recursive: true });
      const captures = [];
      const choose = async (id) => {
        await page.goto(`${baseURL}/viewrule/rules/${id.toLowerCase()}/`);
        await page.waitForSelector(
          `#behavior-examples[data-ready][data-rule="${id}"]`,
        );
      };
      const role = (quality, name) =>
        page.locator(`#${quality} [data-role="${name}"]`);
      const screenshot = async (id, state = "initial") => {
        const file = `${id.toLowerCase()}-${state}.png`;
        await page.screenshot({
          path: path.join(evidenceDirectory, file),
          fullPage: true,
        });
        captures.push({
          id,
          state,
          file,
          viewport: page.viewportSize(),
          colorScheme: "light",
          deviceScaleFactor: 1,
          fullPage: true,
        });
      };
      await choose("DR-009");
      assert.equal(await role("good", "count").textContent(), "12");
      assert.equal(await role("bad", "count").textContent(), "0");
      assert.match(await role("good", "status").textContent(), /stale/);
      await screenshot("DR-009", "failed-refresh");
      await role("good", "retry").click();
      assert.match(await role("good", "as-of").textContent(), /09:05/);
      await page.locator("#state-picker").selectOption("queued");
      assert.match(
        await role("good", "status").textContent(),
        /not yet completed/,
      );
      assert.equal(
        await role("bad", "status").textContent(),
        await role("good", "status").textContent(),
        "Non-target queued state must remain invariant across the DR-009 pair",
      );

      await choose("DR-010");
      for (const quality of ["good", "bad"]) {
        await role(quality, "filter").fill("Seattle priority");
        await role(quality, "open").click();
        await role(quality, "close").click();
        if (quality === "bad")
          await role("bad", "selected")
            .filter({ hasText: "EP 1043" })
            .waitFor();
        assert.equal(
          await role(quality, "filter").inputValue(),
          quality === "good" ? "Seattle priority" : "",
        );
        assert.equal(
          await role(quality, "selected").textContent(),
          quality === "good" ? "EP 1042" : "EP 1043",
        );
        assert.equal(
          await role(quality, quality === "good" ? "open" : "filter").evaluate(
            (el) => el === el.ownerDocument.activeElement,
          ),
          true,
        );
      }
      await screenshot("DR-010", "returned");

      await choose("DR-011");
      assert.match(
        await role("good", "publish").textContent(),
        /12 selected lanes/,
      );
      assert.equal(await role("bad", "publish").textContent(), "Apply");
      await screenshot("DR-011");
      await role("good", "publish").click();
      assert.equal(await role("good", "dialog").isVisible(), true);
      await role("good", "cancel").click();
      assert.equal(
        await role("good", "result").textContent(),
        "No changes published.",
      );
      await role("good", "publish").click();
      await role("good", "confirm").click();
      assert.match(
        await role("good", "result").textContent(),
        /Published for 12 selected lanes/,
      );

      await choose("DR-012");
      for (const quality of ["good", "bad"])
        await page.locator(`#${quality} button[type="submit"]`).click();
      assert.equal(await role("good", "proposal").inputValue(), "7.5");
      assert.equal(await role("bad", "proposal").inputValue(), "");
      for (const quality of ["good", "bad"]) {
        assert.equal(
          await role(quality, "proposal").getAttribute("aria-invalid"),
          "true",
        );
        assert.equal(
          await role(quality, "error").textContent(),
          "Entered value is outside the allowed range.",
        );
        assert.equal(
          await role(quality, "help").textContent(),
          "Allowed range: 0–6%",
        );
      }
      assert.equal(
        await role("bad", "proposal").evaluate(
          (el) => el === el.ownerDocument.activeElement,
        ),
        true,
        "The most recently rejected variant retains focus on its proposal field",
      );
      await screenshot("DR-012", "rejected");
      const captureDr012Panel = async (quality, viewport) => {
        const file = `dr-012-rejected-${quality}-${viewport}.png`;
        await page.locator(`#${quality} .sample`).screenshot({
          path: path.join(evidenceDirectory, file),
        });
        captures.push({
          id: "DR-012",
          state: `rejected-${quality}-${viewport}`,
          file,
          viewport: page.viewportSize(),
          colorScheme: "light",
          deviceScaleFactor: 1,
          fullPage: false,
        });
      };
      for (const quality of ["good", "bad"])
        await captureDr012Panel(quality, "desktop");

      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .locator("#good .sample, #bad .sample")
        .evaluateAll((samples) => {
          for (const sample of samples) sample.dataset.enlarged = "true";
        });
      for (const quality of ["good", "bad"])
        await role(quality, "error").evaluate((node) => {
          node.textContent =
            "This proposal cannot be reviewed until the entered reduction is within the allowed range for these 12 lanes.";
        });
      const dr012MobileWidth = await page
        .locator("html")
        .evaluate((element) => ({
          content: element.scrollWidth,
          viewport: element.ownerDocument.defaultView.innerWidth,
        }));
      assert.ok(
        dr012MobileWidth.content <= dr012MobileWidth.viewport,
        `DR-012 mobile evidence must not add page-level horizontal overflow: ${JSON.stringify(dr012MobileWidth)}`,
      );
      for (const quality of ["good", "bad"]) {
        assert.equal(await role(quality, "error").isVisible(), true);
        assert.equal(
          await page.locator(`#${quality} button[type="submit"]`).isVisible(),
          true,
        );
        await captureDr012Panel(quality, "mobile");
      }
      await page.setViewportSize({ width: 1200, height: 1000 });
      await page
        .locator("#good .sample, #bad .sample")
        .evaluateAll((samples) => {
          for (const sample of samples) sample.dataset.enlarged = "false";
        });
      for (const quality of ["good", "bad"])
        await role(quality, "error").evaluate((node) => {
          node.textContent = "Entered value is outside the allowed range.";
        });
      for (const quality of ["good", "bad"]) {
        await role(quality, "proposal").fill("6");
        await page.locator(`#${quality} button[type="submit"]`).click();
        assert.equal(await role(quality, "dialog").isVisible(), true);
        assert.match(
          await role(quality, "review").textContent(),
          /5% to 6% for 12 selected lanes/,
        );
        await role(quality, "cancel").click();
        assert.equal(await role(quality, "approved").textContent(), "5%");
        assert.equal(await role(quality, "proposal").inputValue(), "6");
        await page.locator(`#${quality} button[type="submit"]`).click();
        await role(quality, "confirm").click();
        assert.equal(await role(quality, "approved").textContent(), "6%");
        assert.equal(await role(quality, "undo").isVisible(), true);
        await role(quality, "undo").click();
        assert.equal(await role(quality, "approved").textContent(), "5%");
      }

      await choose("DR-013");
      const integratedPriorityRules = JSON.parse(
        await readFile(
          path.join(exampleDirectory, "priority-rules.json"),
          "utf8",
        ),
      );
      for (const quality of ["good", "bad"]) {
        const measured = await page.evaluate(
          inspectPage,
          integratedPriorityRules.map((rule) => ({
            ...rule,
            selector: rule.selector
              .split(",")
              .map((selector) => "#" + quality + " " + selector.trim())
              .join(", "),
          })),
        );
        assert.deepEqual(
          measured.findings.map((finding) => finding.rule).sort(),
          quality === "good"
            ? []
            : [
                "priority-response-surface",
                "priority-response-type",
                "priority-total-surface",
                "priority-total-type",
              ],
          "The integrated canonical page must satisfy the same native priority contract",
        );
        assert.ok(
          measured.metrics.evaluations.every(
            (entry) => entry.status === "checked",
          ),
        );
      }
      assert.equal(
        await page.locator("#good .volume strong").textContent(),
        await page.locator("#bad .volume strong").textContent(),
      );
      await screenshot("DR-013");
      // Composition remains a human-review example, not a hierarchy score.
      await role("good", "respond").click();
      assert.match(await role("good", "result").textContent(), /EP 1042/);

      await choose("DR-014");
      await page.locator("#reset").click();
      await page.keyboard.press("Tab");
      assert.equal(
        await role("good", "trigger").evaluate(
          (el) => el === el.ownerDocument.activeElement,
        ),
        true,
      );
      await page.keyboard.press("Enter");
      assert.equal(await role("good", "evidence").isVisible(), true);
      await screenshot("DR-014", "keyboard-open");
      await page.keyboard.press("Escape");
      assert.equal(await role("good", "evidence").isVisible(), false);
      await page.keyboard.press("Tab");
      assert.equal(
        await page
          .locator("#sources a")
          .first()
          .evaluate((el) => el === el.ownerDocument.activeElement),
        true,
        "The bad pointer-only trigger is absent from real Tab traversal",
      );
      await role("bad", "trigger").hover();
      assert.equal(await role("bad", "evidence").isVisible(), true);

      await choose("DR-015");
      await page.locator("#large-text").check();
      const clipping = await page.locator(".service").evaluateAll((elements) =>
        elements.map((el) => ({
          clipped:
            el.ownerDocument.defaultView.getComputedStyle(el).overflowX ===
              "hidden" && el.scrollWidth > el.clientWidth + 1,
          text: el.textContent.trim(),
        })),
      );
      assert.deepEqual(
        clipping.map((item) => item.clipped),
        [false, false, true, true],
      );
      assert.deepEqual(
        clipping.slice(0, 2).map((item) => item.text),
        clipping.slice(2).map((item) => item.text),
      );
      await screenshot("DR-015", "enlarged");
      await page.setViewportSize({ width: 390, height: 844 });
      await screenshot("DR-015", "mobile-enlarged");
      const mobileWidth = await page.locator("html").evaluate((el) => ({
        content: el.scrollWidth,
        viewport: el.ownerDocument.defaultView.innerWidth,
      }));
      assert.ok(
        mobileWidth.content <= mobileWidth.viewport,
        `Text adaptation must not add page-level horizontal overflow: ${JSON.stringify(mobileWidth)}`,
      );
      await page.setViewportSize({ width: 1200, height: 1000 });

      await choose("DR-016");
      assert.deepEqual(
        await page.locator("#good .swatches li").allTextContents(),
        await page.locator("#bad .swatches li").allTextContents(),
      );
      await screenshot("DR-016");
      assert.deepEqual(pageErrors, []);
      await writeFile(
        path.join(evidenceDirectory, "captures.json"),
        JSON.stringify(
          {
            browser: browser.version(),
            source: "generated canonical rule pages",
            captures,
          },
          null,
          2,
        ),
      );
    } finally {
      await browser.close();
    }
    // One task-guidance scenario: advisory counterexamples pass a label boundary,
    // while clipping and inconsistent scale declarations produce specific findings.
    env.VIEWRULE_CONFIG_DIR = path.join(project, "guide-global");
    const pricingRules = JSON.parse(
      await readFile(path.join(exampleDirectory, "pricing-rules.json"), "utf8"),
    );
    const encodingRules = JSON.parse(
      await readFile(
        path.join(exampleDirectory, "encodings-rules.json"),
        "utf8",
      ),
    );
    const guideConfig = {
      version: 1,
      baseURL,
      enforceOnStop: false,
      sourcePaths: ["src"],
      accessibility: false,
      pages: [
        ...[
          "compact",
          "sparse",
          "overloaded",
          "clipped",
          "table",
          "trends",
          "detail",
        ].map((mode) => ({
          name: mode,
          path: `/examples/pricing.html?mode=${mode}`,
          ready: "#pricing[data-ready]",
        })),
        {
          name: "encodings",
          path: "/examples/encodings.html",
          ready: "#encodings[data-ready]",
        },
      ],
      viewports: [{ name: "desktop", width: 1200, height: 1000 }],
    };
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(guideConfig),
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify([
        ...pricingRules.map((r) => ({
          ...r,
          pages: [
            "compact",
            "sparse",
            "overloaded",
            "clipped",
            "table",
            "trends",
            "detail",
          ],
        })),
        ...encodingRules.map((r) => ({ ...r, pages: ["encodings"] })),
      ]),
    );
    const exampleCheck = await cli(["check"]);
    assert.equal(
      exampleCheck.code,
      1,
      exampleCheck.stderr || exampleCheck.stdout,
    );
    const exampleReport = JSON.parse(
      await readFile(JSON.parse(exampleCheck.stdout).report, "utf8"),
    );
    for (const example of exampleReport.pages) {
      const findings = example.findings.filter(
        (f) => f.severity === "error" || f.severity === "warning",
      );
      if (example.name === "clipped") {
        assert.equal(findings.length, 3);
        assert.ok(findings.every((f) => f.rule === "pricing-labels"));
      } else if (example.name === "encodings") {
        assert.equal(findings.length, 2);
        assert.ok(
          findings.every(
            (f) =>
              f.rule === "encoding-shared-domain" &&
              f.expected["attr:data-max"] === "80",
          ),
        );
        assert.deepEqual(
          findings.map((f) => f.actual["attr:data-max"]).sort(),
          ["20", "40"],
        );
      } else
        assert.deepEqual(
          findings,
          [],
          `${example.name} should pass the scoped label check`,
        );
    }
    const guideBrowser = await chromium.launch({
      executablePath:
        process.env.VIEWRULE_BROWSER_PATH ||
        process.env.UI_REVIEW_BROWSER_PATH ||
        undefined,
    });
    try {
      const page = await guideBrowser.newPage({
        viewport: { width: 1200, height: 1000 },
      });
      await page.goto(`${baseURL}/examples/pricing.html?mode=compact`);
      const expand = page.locator('[data-proposal="A"] .expand button');
      await expand.focus();
      await page.keyboard.press("Enter");
      assert.equal(await expand.getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator("#factors-A").isVisible(), true);
      assert.equal(await page.locator(".pricing-identity:visible").count(), 3);
      await page.locator('[data-proposal="B"] .expand button').click();
      assert.equal(await page.locator("#factors-A").isVisible(), true);
      assert.equal(await page.locator("#factors-B").isVisible(), true);
      await page.locator('[data-proposal="B"] .expand button').click();
      await page.locator('[data-proposal="A"] .queue-action button').click();
      await page.locator("#mode").selectOption("sparse");
      assert.equal(await page.locator("#detail").isVisible(), false);
      await page.locator('[data-proposal="A"] .expand button').click();
      assert.equal(
        await page.locator("#detail .queue-action").textContent(),
        "Queued for review",
      );
      await page.locator("#back button").click();
      assert.equal(
        await page
          .locator('[data-proposal="A"] .expand button')
          .evaluate((el) => el === globalThis.document.activeElement),
        true,
      );
      await page.locator("#mode").selectOption("table");
      assert.equal(await page.locator("#comparison tbody tr").count(), 3);
      await page.getByRole("button", { name: "Inspect proposal B" }).click();
      assert.match(
        await page.locator("#detail-title").textContent(),
        /Proposal B/,
      );
      assert.equal(await page.locator("#comparison").isVisible(), true);
      assert.match(
        await page.locator("#comparison").textContent(),
        /−\$20 to \+\$100/,
      );
      await page.locator("#task").selectOption("trend");
      await page.locator("#mode").selectOption("trends");
      assert.equal(await page.locator(".trend:visible").count(), 3);
      assert.equal(await page.locator(".diagnostic-notes[open]").count(), 0);
      assert.equal(
        await page.locator('[data-proposal="A"] .trend-values').textContent(),
        "90, 110, 100, 140, 130, 155, 160",
      );
      await page.locator("#mode").selectOption("compact");
      assert.equal(
        await page.locator('[data-proposal="A"] .trend').isVisible(),
        false,
      );
      await page.locator("#task").selectOption("audit");
      await page.locator("#mode").selectOption("detail");
      await page
        .locator("#audit-note")
        .fill("Investigate the capacity restriction before review.");
      await page.locator("#mode").selectOption("table");
      await page.locator("#mode").selectOption("detail");
      assert.match(
        await page.locator("#audit-note").inputValue(),
        /capacity restriction/,
      );
      const shared = new URL(page.url());
      assert.equal(shared.searchParams.get("task"), "audit");
      assert.equal(shared.searchParams.get("open"), "B");
      assert.equal(shared.href.includes("capacity"), false);
      await page.locator("#reset button").click();
      assert.equal(await page.locator("#mode").inputValue(), "compact");
      assert.equal(await page.locator("#task").inputValue(), "routine");
      await page.locator("#task").selectOption("audit");
      await page.locator("#mode").selectOption("detail");
      assert.equal(await page.locator("#audit-note").inputValue(), "");
      const exampleManifest = JSON.parse(
        await readFile(
          path.join(
            exampleDirectory,
            "../../plugins/claude-code/guide/v1/examples.json",
          ),
          "utf8",
        ),
      );
      for (const [file, metadata] of Object.entries(exampleManifest.pages)) {
        await page.goto(`${baseURL}/examples/${file}`);
        await page.locator("[data-ready]").waitFor();
        for (const anchor of metadata.anchors)
          assert.equal(
            await page.locator(`#${anchor}`).count(),
            1,
            `${file}#${anchor}`,
          );
      }
    } finally {
      await guideBrowser.close();
    }
    // The migrated essay detector uses generic rules through the installed CLI.
    env.VIEWRULE_CONFIG_DIR = path.join(project, "reading-global");
    const readingRules = [
      {
        id: "reading-measure",
        type: "reading-column",
        selector:
          ".chapter, .heading, .copy, .copy > p, .visuals, .notes, .footer",
        container: "main",
        maxWidth: 640,
        tolerance: 2,
      },
      {
        id: "reading-order",
        type: "vertical-order",
        selector: ".chapter",
        groups: [
          { selector: ".heading", optional: false },
          { selector: ".copy", optional: false },
          { selector: ".visuals", optional: true },
        ],
        tolerance: 2,
      },
      {
        id: "paragraph-order",
        type: "vertical-order",
        selector: ".copy",
        groups: [{ selector: ":scope > p", optional: false }],
        tolerance: 2,
        optional: true,
      },
      {
        id: "prose-alignment",
        type: "style",
        selector: ".copy p",
        property: "text-align",
        allowed: ["left"],
        optional: true,
      },
      {
        id: "prose-columns",
        type: "style",
        selector: ".copy",
        property: "column-count",
        allowed: ["1", "auto"],
        optional: true,
      },
    ].map((rule) => ({
      severity: "error",
      reason: "Preserve the scoped reading contract.",
      designRules: ["DR-006", "DR-007"],
      ...rule,
    }));
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(readingRules),
    );
    const cases = {
      wide: "reading-measure",
      "off-center": "reading-measure",
      narrow: "reading-measure",
      "visual-first": "reading-order",
      "dom-order": "reading-order",
      missing: "reading-order",
      "hidden-paragraph": "paragraph-order",
      "paragraph-order": "paragraph-order",
      right: "prose-alignment",
      columns: "prose-columns",
    };
    const readingConfig = {
      ...config(baseURL),
      accessibility: false,
      enforceOnStop: false,
      pages: [
        { name: "good", path: "/reading/good", ready: "main" },
        {
          name: "hidden-optional",
          path: "/reading/hidden-optional",
          ready: "main",
          viewports: ["desktop"],
        },
        ...Object.keys(cases).map((name) => ({
          name,
          path: `/reading/${name}`,
          ready: "main",
          viewports: ["desktop"],
        })),
        {
          name: "print",
          path: "/reading/good",
          ready: "main",
          media: "print",
          viewports: ["desktop"],
        },
        {
          name: "enlarged",
          path: "/reading/good",
          ready: "main",
          textScale: 2,
          viewports: ["desktop"],
        },
        {
          name: "print-broken",
          path: "/reading/print-broken",
          ready: "main",
          media: "print",
          viewports: ["desktop"],
        },
      ],
      viewports: [
        { name: "desktop", width: 1440, height: 900 },
        { name: "mobile", width: 320, height: 480 },
        { name: "4k", width: 3840, height: 2160 },
      ],
    };
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(readingConfig),
    );
    const reading = await cli(["check"]);
    assert.equal(reading.code, 1, reading.stderr || reading.stdout);
    const readingReport = JSON.parse(
      await readFile(JSON.parse(reading.stdout).report, "utf8"),
    );
    assert.equal(
      readingReport.pages.length,
      readingConfig.pages.length + 2,
      "Page viewport scopes must be respected",
    );
    for (const page of readingReport.pages) {
      const expected =
        page.name === "print-broken" ? "reading-measure" : cases[page.name];
      if (!expected)
        assert.deepEqual(
          page.findings,
          [],
          `${page.name}/${page.viewport.name} should preserve reading layout`,
        );
      else
        assert.ok(
          page.findings.some(
            (f) =>
              f.rule === expected &&
              f.designRules.includes("DR-006") &&
              f.actual !== undefined &&
              f.expected !== undefined,
          ),
          `${page.name} must expose ${expected} with cited measurements`,
        );
      assert.equal(page.details.complete, true);
    }
    // Changing the declared measure alone fails; matching document and CSS succeeds.
    readingConfig.pages = [
      { name: "contract-change", path: "/reading/good", ready: "main" },
      { name: "matching-change", path: "/reading/wide", ready: "main" },
    ];
    readingConfig.viewports = [{ name: "desktop", width: 1440, height: 900 }];
    readingRules[0].maxWidth = 720;
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(readingConfig),
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(readingRules),
    );
    const revisedReading = await cli(["check"]);
    assert.equal(
      revisedReading.code,
      1,
      revisedReading.stderr || revisedReading.stdout,
    );
    const revisedReport = JSON.parse(
      await readFile(JSON.parse(revisedReading.stdout).report, "utf8"),
    );
    assert.ok(
      revisedReport.pages[0].findings.some(
        (f) => f.rule === "reading-measure" && f.expected.width === 720,
      ),
    );
    assert.deepEqual(revisedReport.pages[1].findings, []);

    // Exercise approved-review deltas through the shipped CLI, including repeated
    // elements, checkpoint scope, a source adapter, and lost evidence.
    await writeFile(
      source,
      `<!doctype html><html lang="en"><title>Changes</title>
      <main><div class="item" id="a"></div><div class="item" id="b"></div>
      <div class="item" id="c"></div><div class="item duplicate"></div>
      <div class="item duplicate"></div></main>
      <style>.item { width:18px; height:30px; background:#165b41 } #c { width:30px }</style></html>`,
    );
    const checkpointPath = path.join(project, ".ui-review/changes.mjs");
    const checkpointSetup =
      'export default async ({ page }) => { await page.locator("main").waitFor(); };';
    await writeFile(checkpointPath, checkpointSetup);
    const diagnosticsPath = path.join(project, "src/diagnostics.json");
    const diagnostic = {
      rule: "token",
      file: "src/page.html",
      line: 1,
      severity: "warning",
      message: "Use <theme> tokens",
    };
    await writeFile(diagnosticsPath, JSON.stringify([diagnostic]));
    const changeConfig = {
      ...config(baseURL),
      accessibility: false,
      pages: [
        {
          name: "changes | review",
          path: "/",
          ready: "main",
          checkpoints: [
            { name: "open", setup: ".ui-review/changes.mjs" },
            { name: "closed", setup: ".ui-review/changes.mjs" },
          ],
        },
      ],
      sourceChecks:
        /** @type {import("../src/types.js").SourceCheckProvider[]} */ ([
          {
            id: "tokens",
            authority: "advisory",
            command: [
              process.execPath,
              "-e",
              "const output = require('node:fs').readFileSync('src/diagnostics.json', 'utf8'); process.stdout.write(output); process.exitCode = !output.trim() || JSON.parse(output).length ? 1 : 0;",
            ],
          },
        ]),
    };
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(changeConfig),
    );
    await writeFile(path.join(globalDir, "rules.json"), "[]");
    const changeRules = [
      {
        id: "change-size",
        type: "min-size",
        selector: ".item",
        minWidth: 24,
        minHeight: 24,
        severity: "warning",
        reason: "Fixture controls retain measurable bounds.",
        designRules: ["DR-007"],
      },
    ];
    await writeFile(rulesPath, JSON.stringify(changeRules));
    const documentPath = path.join(project, "DESIGN.md");
    await writeFile(documentPath, "# Controls\nKeep controls visible.\n");
    const beforeChanges = await cli(["check"]);
    assert.equal(
      beforeChanges.code,
      0,
      beforeChanges.stderr || beforeChanges.stdout,
    );
    const beforeChangesOutput = JSON.parse(beforeChanges.stdout);
    const beforeChangesReport = JSON.parse(
      await readFile(beforeChangesOutput.report, "utf8"),
    );
    assert.equal(beforeChangesReport.summary.warnings, 9);
    const changesApproval = await cli([
      "feedback",
      "--report",
      beforeChangesOutput.report,
      "--decision",
      "approve",
      "--note",
      "Fixture human approval preserves warnings; it does not waive them.",
    ]);
    assert.equal(changesApproval.code, 0, changesApproval.stderr);

    const unchangedCapture = await cli(["check"]);
    assert.equal(unchangedCapture.code, 0, unchangedCapture.stderr);
    const unchangedReport = JSON.parse(
      await readFile(JSON.parse(unchangedCapture.stdout).report, "utf8"),
    );
    assert.ok(
      unchangedReport.changes.evidence.every(
        (e) => e.status === "unchanged" && e.regions.length === 0,
      ),
    );

    await writeFile(
      source,
      (await readFile(source, "utf8")).replace(
        "</style>",
        "#a, .duplicate:first-of-type { width:30px } #b { width:19px } #c { width:18px } .duplicate:nth-of-type(4) { width:30px }</style>",
      ),
    );
    await writeFile(
      diagnosticsPath,
      JSON.stringify([
        {
          ...diagnostic,
          message: "Still use <theme> tokens",
          severity: "error",
        },
      ]),
    );
    await writeFile(
      documentPath,
      "# Controls\nKeep controls visible and labelled.\n",
    );
    const afterChanges = await cli(["check"]);
    assert.equal(
      afterChanges.code,
      0,
      afterChanges.stderr || afterChanges.stdout,
    );
    const afterChangesOutput = JSON.parse(afterChanges.stdout);
    const afterChangesReport = JSON.parse(
      await readFile(afterChangesOutput.report, "utf8"),
    );
    const delta = afterChangesReport.changes;
    assert.equal(delta.baselineId, beforeChangesReport.id);
    assert.ok(
      delta.evidence.every((e) => e.status === "changed" && e.regionCount > 0),
    );
    const crop = delta.evidence[0].regions[0];
    assert.ok(crop.changedPixels >= 64);
    assert.ok(
      crop.width < 1280 && crop.height < 900,
      "Localized changes must not produce a whole-page crop",
    );
    const evidenceOutput = path.resolve(
      import.meta.dirname,
      "../dist/review-evidence",
    );
    await mkdir(evidenceOutput, { recursive: true });
    await cp(
      path.dirname(afterChangesOutput.report),
      path.join(evidenceOutput, "changed-regions"),
      { recursive: true },
    );
    const cropBytes = await readFile(
      path.join(path.dirname(afterChangesOutput.report), crop.after),
    );
    assert.equal(cropBytes.readUInt32BE(16), crop.width);
    assert.equal(cropBytes.readUInt32BE(20), crop.height);

    assert.equal(delta.newFindings.length, 2);
    assert.equal(delta.persistentFindings.length, 5);
    assert.equal(delta.resolvedFindings.length, 4);
    assert.deepEqual(delta.notComparedFindings, []);
    assert.deepEqual(
      delta.newFindings.map((entry) => entry.finding.element),
      ["#c", "#c"],
    );
    assert.ok(
      delta.persistentFindings.some(
        (entry) =>
          entry.finding.element === "#b" && entry.finding.actual.width === 19,
      ),
    );
    assert.ok(
      delta.persistentFindings.some(
        (entry) => entry.finding.sourceCheck?.authority === "advisory",
      ),
    );
    assert.equal(delta.contract.documentChanges[0].path, "DESIGN.md");
    const changesHtml = await readFile(afterChangesOutput.html, "utf8");
    assert.match(changesHtml, /4 resolved/);
    assert.match(changesHtml, /Image evidence since approval/);
    assert.ok(changesHtml.includes(crop.after));
    assert.match(changesHtml, /reference\/capture-1.png/);
    assert.match(changesHtml, /Keep controls visible and labelled/);
    assert.match(changesHtml, /Still use &lt;theme&gt; tokens/);
    assert.doesNotMatch(changesHtml, /<theme>/);

    // A failed checkpoint cannot resolve its approved findings; other inspected
    // states still compare. The approved document delta survives an intervening run.
    await writeFile(
      checkpointPath,
      'export default async ({ checkpoint }) => { if (checkpoint.name === "closed") throw new Error("Fixture state unavailable"); };',
    );
    const unavailable = await cli(["check"]);
    assert.equal(unavailable.code, 1, unavailable.stderr);
    const unavailableReport = JSON.parse(
      await readFile(JSON.parse(unavailable.stdout).report, "utf8"),
    );
    assert.equal(unavailableReport.changes.baselineId, beforeChangesReport.id);
    assert.equal(
      unavailableReport.changes.evidence.find((e) => e.checkpoint === "closed")
        .status,
      "not-compared",
    );
    assert.equal(unavailableReport.changes.notComparedFindings.length, 4);
    assert.ok(
      unavailableReport.changes.notComparedFindings.every(
        (entry) => entry.checkpoint === "closed",
      ),
    );
    assert.equal(unavailableReport.changes.resolvedFindings.length, 2);
    assert.ok(
      unavailableReport.changes.newlyUnassessed.some(
        (entry) =>
          entry.designRule === "DR-007" && entry.checkpoint === "closed",
      ),
    );
    assert.deepEqual(unavailableReport.contract.documentChanges, []);
    assert.equal(
      unavailableReport.changes.contract.documentChanges[0].path,
      "DESIGN.md",
    );

    await writeFile(checkpointPath, checkpointSetup);
    changeConfig.pages[0].checkpoints.pop();
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(changeConfig),
    );
    await writeFile(rulesPath, "[]");
    const removed = await cli(["check"]);
    assert.equal(removed.code, 0, removed.stderr || removed.stdout);
    const removedReport = JSON.parse(
      await readFile(JSON.parse(removed.stdout).report, "utf8"),
    );
    assert.deepEqual(removedReport.changes.resolvedFindings, []);
    assert.equal(removedReport.changes.notComparedFindings.length, 8);
    assert.equal(removedReport.changes.contract.changes[0].kind, "removed");
    assert.match(
      await readFile(JSON.parse(removed.stdout).html, "utf8"),
      /Previous findings not compared/,
    );
    // Missing provider evidence must invalidate a prior pass. Recovery requires
    // explicit clean JSON; exit 1 with valid findings was exercised above.
    changeConfig.sourceChecks[0].authority = "blocking";
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(changeConfig),
    );
    await writeFile(diagnosticsPath, "");
    const emptyProvider = await cli(["check"]);
    assert.equal(emptyProvider.code, 2, emptyProvider.stdout);
    assert.match(
      emptyProvider.stderr,
      /provider tokens returned no JSON \(exit 1\)/,
    );
    const interrupted = JSON.parse(
      await readFile(path.join(project, ".ui-review/latest.json"), "utf8"),
    );
    assert.equal(interrupted.status, "running");
    assert.equal(interrupted.reportFile, JSON.parse(removed.stdout).report);
    assert.equal((await verify()).status, "fail");

    await writeFile(diagnosticsPath, "[]");
    await writeFile(
      source,
      (await readFile(source, "utf8")).replace(
        "</style>",
        "main { height: 1200px }</style>",
      ),
    );
    const cleanProvider = await cli(["check"]);
    assert.equal(cleanProvider.code, 0, cleanProvider.stderr);
    const cleanProviderReport = JSON.parse(
      await readFile(JSON.parse(cleanProvider.stdout).report, "utf8"),
    );
    assert.deepEqual(cleanProviderReport.sourceChecks[0].findings, []);
    assert.match(
      cleanProviderReport.changes.evidence.find((e) => e.checkpoint === "open")
        .reason,
      /dimensions differ/,
    );
    assert.deepEqual(await verify(), { status: "pass" });

    // A pinned real Impeccable source scan has different exit codes from generic providers.
    const impeccablePackage = JSON.parse(
      await readFile(
        createRequire(
          path.join(JSON.parse(setup.stdout).engine, "package.json"),
        ).resolve("impeccable/package.json"),
        "utf8",
      ),
    );
    assert.equal(impeccablePackage.version, "4.1.0");
    await mkdir(path.join(project, "dist"), { recursive: true });
    const providerSource = path.join(project, "dist/provider.css");
    await writeFile(
      providerSource,
      "body { font-family: Inter, sans-serif; }\n",
    );
    /** @type {import("../src/types.js").SourceCheckProvider} */
    const impeccableProvider = {
      id: "impeccable",
      format: "impeccable",
      version: impeccablePackage.version,
      authority: "advisory",
      targets: ["dist/provider.css"],
      noConfig: true,
      severityMap: { warning: "error" },
    };
    changeConfig.sourceChecks = [impeccableProvider];
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(changeConfig),
    );
    const advisoryScan = await cli(["check"]);
    assert.equal(advisoryScan.code, 0, advisoryScan.stderr);
    const advisoryReport = JSON.parse(
      await readFile(JSON.parse(advisoryScan.stdout).report, "utf8"),
    );
    const realProvider = advisoryReport.sourceChecks[0];
    assert.equal(realProvider.execution.code, 2);
    assert.equal(
      JSON.parse(realProvider.execution.stdout)[0].antipattern,
      "overused-font",
    );
    assert.equal(realProvider.provider.version, "4.1.0");
    await writeFile(
      path.join(evidenceOutput, "impeccable-source.json"),
      JSON.stringify(realProvider, null, 2) + "\n",
    );
    assert.equal(
      realProvider.findings[0].rule,
      "source:impeccable:overused-font",
    );
    assert.match(realProvider.findings[0].selector, /provider\.css:1$/);
    assert.equal(
      advisoryReport.summary.errors,
      0,
      "Advisory authority does not block even with an error mapping",
    );
    impeccableProvider.authority = "blocking";
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(changeConfig),
    );
    const rejectedSource = await cli(["check"]);
    assert.equal(rejectedSource.code, 1, rejectedSource.stderr);
    assert.equal((await verify()).status, "fail");
    const rejectedLint = await cli(["lint"]);
    assert.equal(rejectedLint.code, 1, rejectedLint.stderr);
    assert.equal(JSON.parse(rejectedLint.stdout).errors, 1);
    await writeFile(providerSource, "body { font-family: Georgia, serif; }\n");
    const priorState = await readFile(
      path.join(project, ".ui-review/latest.json"),
      "utf8",
    );
    const acceptedLint = await cli(["lint"]);
    assert.equal(acceptedLint.code, 0, acceptedLint.stderr);
    assert.deepEqual(JSON.parse(acceptedLint.stdout).findings, []);
    assert.equal(
      await readFile(path.join(project, ".ui-review/latest.json"), "utf8"),
      priorState,
      "Source-only passes never replace rendered review state",
    );
    assert.equal((await verify()).status, "fail");
    const acceptedSource = await cli(["check"]);
    assert.equal(acceptedSource.code, 0, acceptedSource.stderr);
    const acceptedSourceReport = JSON.parse(
      await readFile(JSON.parse(acceptedSource.stdout).report, "utf8"),
    );
    assert.equal(acceptedSourceReport.sourceChecks[0].execution.code, 0);
    assert.deepEqual(acceptedSourceReport.sourceChecks[0].findings, []);
    assert.deepEqual(await verify(), { status: "pass" });
    await writeFile(
      providerSource,
      "body { font-family: Georgia, serif; }\n/* changed generated source */\n",
    );
    assert.equal(
      (await verify()).status,
      "fail",
      "Explicit detector targets remain tracked outside normal source scope",
    );
    impeccableProvider.noConfig = false;
    // Impeccable resolves context from each target, including fallback documents
    // outside sourcePaths and ignored by Git. A changed contract must stale a pass.
    const detectorDesign = path.join(project, "dist/docs/DESIGN.md");
    await mkdir(path.dirname(detectorDesign), { recursive: true });
    const fontContract = (font) =>
      `---\ntypography:\n  body:\n    fontFamily: ${font}\n---\n`;
    await writeFile(detectorDesign, fontContract("Georgia"));
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(changeConfig),
    );
    const contextualSource = await cli(["check"]);
    assert.equal(contextualSource.code, 0, contextualSource.stderr);
    assert.deepEqual(await verify(), { status: "pass" });
    await writeFile(detectorDesign, fontContract("Palatino"));
    const changedDesignLint = await cli(["lint"]);
    assert.equal(changedDesignLint.code, 1, changedDesignLint.stderr);
    assert.ok(
      JSON.parse(changedDesignLint.stdout).findings.some(
        (finding) => finding.rule === "source:impeccable:design-system-font",
      ),
    );
    assert.equal(
      (await verify()).status,
      "fail",
      "A changed fallback design document cannot reuse the earlier passing review",
    );
    await writeFile(detectorDesign, fontContract("Georgia"));
    assert.deepEqual(await verify(), { status: "pass" });
    const nearerDesign = path.join(project, "dist/DESIGN.md");
    await writeFile(nearerDesign, fontContract("Palatino"));
    assert.equal(
      (await verify()).status,
      "fail",
      "Creating a nearer design document invalidates the old context",
    );
    await rm(nearerDesign);
    assert.deepEqual(await verify(), { status: "pass" });
    await mkdir(path.join(project, ".impeccable"), { recursive: true });
    await writeFile(
      path.join(project, ".impeccable/config.local.json"),
      '{"detector":{"ignoreRules":["overused-font"]}}\n',
    );
    assert.equal(
      (await verify()).status,
      "fail",
      "Ignored local Impeccable settings invalidate rendered checks",
    );
    await rm(providerSource);
    const failedLint = await cli(["lint"]);
    assert.equal(failedLint.code, 2, failedLint.stdout);
    const failedSource = await cli(["check"]);
    assert.equal(failedSource.code, 2, failedSource.stdout);
    assert.match(failedSource.stderr, /provider impeccable failed with exit 1/);
    assert.equal((await verify()).status, "fail");

    // One rejected/passing chart boundary pair through the installed CLI.
    await writeFile(
      source,
      `<!doctype html><html><body><main>
      <svg width="280" height="100" style="overflow:hidden" aria-label="Clipped values">
        <text id="clipped-value" x="8" y="30" text-anchor="end">$12,345,678.90</text>
      </svg>
      <svg width="280" height="100" style="overflow:hidden" aria-label="Contained values">
        <text id="contained-value" x="8" y="30">$12,345,678.90</text>
      </svg>
    </main></body></html>`,
    );
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify({
        ...readingConfig,
        pages: [{ name: "chart-bounds", path: "/", ready: "svg text" }],
        viewports: [{ name: "desktop", width: 800, height: 600 }],
      }),
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify([
        {
          id: "chart-label-bounds",
          type: "within-bounds",
          selector: "svg text",
          container: "svg",
          tolerance: 1,
          severity: "error",
          reason: "Chart values must remain inside their visible SVG viewport.",
        },
      ]),
    );
    const chartBounds = await cli(["check"]);
    assert.equal(chartBounds.code, 1, chartBounds.stderr || chartBounds.stdout);
    const boundsReport = JSON.parse(
      await readFile(JSON.parse(chartBounds.stdout).report, "utf8"),
    );
    assert.equal(boundsReport.summary.errors, 1);
    const boundsFinding = boundsReport.pages[0].findings[0];
    assert.equal(boundsFinding.rule, "chart-label-bounds");
    assert.equal(boundsFinding.element, "#clipped-value");
    assert.ok(boundsFinding.actual.left > 40);
    assert.equal(boundsFinding.expected.maximumExcess, 1);
    assert.deepEqual(boundsFinding.designRules, ["DR-006", "DR-007"]);
    assert.equal(boundsReport.pages[0].details.complete, true);
    // Repeated components retain relationships under either grid or flex CSS.
    // Cross-page continuity observes the actual SVG, not just its identity label.
    const componentRules = [
      {
        id: "item-elements",
        type: "required-elements",
        selector: ".entry",
        required: [".heading > svg", ".heading > h2", ".description"],
      },
      {
        id: "icon-title",
        type: "relative-position",
        selector: ".heading",
        from: "svg",
        to: "h2",
        relation: "left-of",
        minGap: 8,
        maxGap: 16,
        tolerance: 1,
      },
      {
        id: "heading-copy",
        type: "relative-position",
        selector: ".entry",
        from: ".heading",
        to: ".description",
        relation: "above",
        minGap: 4,
        maxGap: 16,
        tolerance: 1,
      },
      {
        id: "copy-width",
        type: "reading-column",
        selector: ".description",
        container: ".entry",
        maxWidth: 760,
        tolerance: 2,
      },
      {
        id: "copy-size",
        type: "min-font-size",
        selector: ".description",
        min: 16,
      },
      {
        id: "enlarged-copy-size",
        type: "min-font-size",
        selector: ".description",
        min: 32,
        pages: ["enlarged-components"],
      },
      {
        id: "symbol-continuity",
        type: "consistent",
        selector: ".icon",
        keyAttribute: "data-entity",
        properties: ["stroke"],
        attributes: ["viewBox"],
        compareSVG: true,
        acrossPages: true,
        designRules: ["DR-005"],
      },
      {
        id: "local-symbols",
        type: "consistent",
        selector: ".icon",
        keyAttribute: "data-entity",
        properties: [],
        attributes: [],
        compareSVG: true,
        designRules: ["DR-005"],
      },
    ].map((rule) => ({
      severity: "error",
      reason: "Keep each item readable and its identity stable.",
      ...rule,
    }));
    const componentConfig = {
      ...config(baseURL),
      accessibility: false,
      enforceOnStop: false,
      pages: [
        ...["grid", "flex", "broken", "detail", "detail-drift"].map((name) => ({
          name,
          path: `/components/${name}`,
          ready: "main",
        })),
        {
          name: "enlarged-components",
          path: "/components/flex",
          ready: "main",
          textScale: 2,
        },
      ],
    };
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(componentConfig),
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(componentRules),
    );
    const components = await cli(["check"]);
    assert.equal(components.code, 1, components.stderr || components.stdout);
    const componentReport = JSON.parse(
      await readFile(JSON.parse(components.stdout).report, "utf8"),
    );
    for (const page of componentReport.pages) {
      assert.equal(page.details.complete, true);
      assert.ok(
        !page.findings.some((finding) => finding.rule === "local-symbols"),
        "Cross-page comparison remains opt-in",
      );
      if (!["broken", "detail-drift"].includes(page.name))
        assert.deepEqual(page.findings, [], page.name);
    }
    const componentFindings = componentReport.pages.find(
      (page) => page.name === "broken",
    ).findings;
    for (const id of [
      "item-elements",
      "icon-title",
      "heading-copy",
      "copy-width",
      "copy-size",
    ])
      assert.ok(
        componentFindings.some(
          (f) =>
            f.rule === id &&
            f.designRules.length &&
            f.actual !== undefined &&
            f.expected !== undefined,
        ),
        `${id} needs a cited measured failure`,
      );
    assert.ok(
      componentFindings.some(
        (f) => f.rule === "icon-title" && f.actual.crossOverlap <= 0,
      ),
    );
    assert.ok(
      componentFindings.some(
        (f) =>
          f.rule === "heading-copy" &&
          f.actual.gap === 72 &&
          f.expected.maxGap === 16,
      ),
    );
    assert.ok(
      componentFindings.some(
        (f) =>
          f.rule === "item-elements" &&
          f.actual.selected === 1 &&
          f.actual.visible === 0,
      ),
    );
    const drift = componentReport.pages.find(
      (page) => page.name === "detail-drift",
    ).findings;
    assert.equal(drift.length, 1);
    assert.equal(drift[0].rule, "symbol-continuity");
    assert.deepEqual(drift[0].designRules, ["DR-005"]);
    assert.equal(
      drift[0].actual["attr:viewBox"],
      drift[0].expected["attr:viewBox"],
    );
    assert.notEqual(
      drift[0].actual["svg:content"],
      drift[0].expected["svg:content"],
    );
    t.diagnostic(
      "component relationships: grid and flex pass; stacked/hidden icons, excess spacing, narrowed/shrunken copy and cross-page SVG drift fail with measured evidence",
    );
    t.diagnostic(
      "broken → compact → sidebar (same contract) → stretched → finite → missing annotations: expected rules, measurements, and DR citations verified",
    );
    // One two-scope installed workflow verifies real execution, not mock evidence.
    const incrementalProject = path.join(project, "incremental-app");
    for (const directory of [".ui-review", "src/a", "src/b", "src/shared"])
      await mkdir(path.join(incrementalProject, directory), {
        recursive: true,
      });
    await writeFile(path.join(globalDir, "rules.json"), "[]");
    const incrementalHTML = (title, encoding = "same") =>
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><link rel="stylesheet" href="/incremental/shared/tokens.css"></head><body><main><h1>${title}</h1><p class="mark" data-encoding="${encoding}">Scope observation</p></main></body></html>`;
    const sharedCSS = "main { padding: 16px; }";
    const designText =
      "# Design intent\nKeep the task heading visible and shared encodings consistent.\n";
    await writeFile(path.join(incrementalProject, "DESIGN.md"), designText);
    await writeFile(
      path.join(incrementalProject, "src/shared/tokens.css"),
      sharedCSS,
    );
    for (const name of ["a", "b"]) {
      await writeFile(
        path.join(incrementalProject, `src/${name}/index.html`),
        incrementalHTML(name),
      );
      await writeFile(
        path.join(incrementalProject, `src/${name}/DESIGN.md`),
        designText,
      );
    }
    const incrementalSetup =
      'export default async ({page}) => { await page.locator("main").waitFor(); };\n';
    const incrementalSetupFile = path.join(
      incrementalProject,
      "src/b/setup.mjs",
    );
    await writeFile(incrementalSetupFile, incrementalSetup);
    const incrementalStorageFile = path.join(
      incrementalProject,
      "src/a/storage.json",
    );
    const incrementalStorage = JSON.stringify({ cookies: [], origins: [] });
    await writeFile(incrementalStorageFile, incrementalStorage);
    const incrementalConfig = {
      ...config(baseURL),
      accessibility: false,
      storageState: "src/a/storage.json",
      pages: [
        {
          name: "a",
          path: "/incremental/a/index.html",
          ready: "main",
          checkpoints: [{ name: "ready", setup: "src/b/setup.mjs" }],
        },
        { name: "b", path: "/incremental/b/index.html", ready: "main" },
      ],
      projectDocuments: ["DESIGN.md", "src/*/DESIGN.md"],
      sourceChecks: ["a", "b"].map((name) => ({
        id: name,
        format: "impeccable",
        targets: [`src/${name}`],
        noConfig: true,
        authority: "advisory",
      })),
      reviewScopes: [
        { name: "shared", sourcePaths: ["src/shared/**"] },
        ...["a", "b"].map((name) => ({
          name,
          sourcePaths: [`src/${name}/**`],
          dependsOn: ["shared"],
          pages: [name],
          sourceChecks: [name],
          requiredDocuments: [`src/${name}/DESIGN.md`],
        })),
      ],
      evidenceReuse: {
        environmentKey: "synthetic-local-app-v1",
        maxAgeMs: 3600000,
      },
    };
    const incrementalConfigFile = path.join(
      incrementalProject,
      ".ui-review/config.json",
    );
    /** @type {(value?: unknown) => Promise<void>} */
    const writeIncrementalConfig = (value = incrementalConfig) =>
      writeFile(incrementalConfigFile, JSON.stringify(value));
    await writeIncrementalConfig();
    await writeFile(
      path.join(incrementalProject, ".ui-review/rules.json"),
      JSON.stringify([
        {
          id: "z-scope-heading",
          type: "required-elements",
          selector: "main",
          required: ["h1"],
          severity: "error",
          reason: "Identify the current task",
        },
        {
          id: "shared-encoding",
          type: "consistent",
          selector: ".mark",
          keyAttribute: "class",
          properties: [],
          attributes: ["data-encoding"],
          acrossPages: true,
          severity: "error",
          reason: "Shared identities preserve encoding",
          designRules: ["DR-005"],
        },
      ]),
    );
    const scopeCLI = (...args) =>
      cli([...args, "--project", incrementalProject]);
    const scopePlan = async () => {
      const result = await scopeCLI("plan", "--incremental");
      assert.equal(result.code, 0, result.stderr);
      return JSON.parse(result.stdout);
    };
    const workloads = [];
    const scopeCheck = async (label, mode = "--incremental", expected = 0) => {
      const started = performance.now();
      const result = await scopeCLI("check", mode);
      const elapsedMs = Math.round(performance.now() - started);
      assert.equal(result.code, expected, result.stderr || result.stdout);
      const reportFile = JSON.parse(result.stdout).report;
      const report = JSON.parse(await readFile(reportFile, "utf8"));
      workloads.push({
        label,
        elapsedMs,
        status: report.status,
        execution: report.execution,
      });
      return { report, reportFile };
    };
    const fullScopeRun = await scopeCheck("full", "--full");
    assert.deepEqual(fullScopeRun.report.execution.browser, {
      required: 2,
      executed: 2,
      reused: 0,
    });
    assert.deepEqual(fullScopeRun.report.execution.sourceChecks, {
      required: 2,
      executed: 2,
      reused: 0,
    });
    assert.deepEqual(await verify({ cwd: incrementalProject }), {
      status: "pass",
    });
    const scopeLatest = path.join(incrementalProject, ".ui-review/latest.json");
    const beforePlan = await readFile(scopeLatest, "utf8");
    const runsBeforePlan = await readdir(
      path.join(incrementalProject, ".ui-review/runs"),
    );
    // Deliberately unsorted rule IDs must not make planning disagree with check.
    const unchangedScopePlan = await scopePlan();
    assert.equal(unchangedScopePlan.browser.captureCount, 0);
    assert.equal(await readFile(scopeLatest, "utf8"), beforePlan);
    assert.deepEqual(
      await readdir(path.join(incrementalProject, ".ui-review/runs")),
      runsBeforePlan,
    );
    const reusedScopeRun = await scopeCheck("unchanged");
    assert.deepEqual(reusedScopeRun.report.execution.browser, {
      required: 2,
      executed: 0,
      reused: 2,
    });
    assert.deepEqual(reusedScopeRun.report.execution.sourceChecks, {
      required: 2,
      executed: 0,
      reused: 2,
    });
    assert.deepEqual(
      unchangedScopePlan.reviewScopes.map(({ name, fingerprint }) => ({
        name,
        fingerprint,
      })),
      reusedScopeRun.report.execution.scopes.map(({ name, fingerprint }) => ({
        name,
        fingerprint,
      })),
      "Plan and check share canonical rule ordering and scope fingerprints",
    );
    assert.equal(
      unchangedScopePlan.browser.captureCount,
      reusedScopeRun.report.execution.browser.executed,
    );
    assert.equal(
      unchangedScopePlan.sourceChecks.filter(
        (provider) => provider.action === "run",
      ).length,
      reusedScopeRun.report.execution.sourceChecks.executed,
    );
    for (const page of reusedScopeRun.report.pages) {
      assert.equal(page.evidence.runId, fullScopeRun.report.id);
      assert.equal(
        page.evidence.createdAt,
        fullScopeRun.report.pages.find((entry) => entry.name === page.name)
          .evidence.createdAt,
      );
      assert.deepEqual(page.findings, []);
    }
    const reusedHTML = await readFile(
      path.join(path.dirname(reusedScopeRun.reportFile), "index.html"),
      "utf8",
    );
    assert.match(reusedHTML, /Reused capture/);
    assert.ok(reusedHTML.includes(fullScopeRun.report.id));
    // Runtime bindings outrank incidental source ownership: authentication is
    // global, and a checkpoint belongs to the states that actually execute it.
    await writeFile(incrementalStorageFile, `${incrementalStorage}\n`);
    const authPlan = await scopePlan();
    assert.equal(authPlan.browser.captureCount, 2);
    assert.ok(authPlan.globalInputs.includes("src/a/storage.json"));
    assert.ok(
      authPlan.sourceChecks.every((provider) => provider.action === "run"),
    );
    assert.equal((await verify({ cwd: incrementalProject })).status, "fail");
    await writeFile(incrementalStorageFile, incrementalStorage);
    await writeFile(incrementalSetupFile, `${incrementalSetup}\n`);
    const setupPlan = await scopePlan();
    assert.equal(
      setupPlan.browser.states.find((state) => state.page === "a").action,
      "run",
    );
    await writeFile(incrementalSetupFile, incrementalSetup);
    assert.equal((await scopePlan()).browser.captureCount, 0);
    await writeFile(
      path.join(incrementalProject, "src/a/new.css"),
      "h1 { font-weight: bold; }",
    );
    const addedPlan = await scopePlan();
    assert.equal(
      addedPlan.browser.captureCount,
      1,
      "A new glob match only invalidates its owners",
    );
    assert.equal(
      addedPlan.browser.states.find((state) => state.page === "b").action,
      "reuse",
    );
    await rm(path.join(incrementalProject, "src/a/new.css"));
    await writeFile(
      path.join(incrementalProject, "src/a/index.html"),
      incrementalHTML("a changed"),
    );
    await writeFile(
      path.join(incrementalProject, "src/a/DESIGN.md"),
      `${designText}\nKeep the amended heading visible.\n`,
    );
    assert.equal((await scopePlan()).browser.captureCount, 1);
    await writeFile(
      path.join(incrementalProject, "src/shared/tokens.css"),
      `${sharedCSS}\nmain { margin: 8px; }`,
    );
    assert.equal(
      (await scopePlan()).browser.captureCount,
      2,
      "Shared dependencies fan out",
    );
    await writeFile(
      path.join(incrementalProject, "src/shared/tokens.css"),
      sharedCSS,
    );
    await writeFile(
      path.join(incrementalProject, "src/unowned.js"),
      "// unknown owner\n",
    );
    assert.equal(
      (await scopePlan()).browser.captureCount,
      2,
      "Unowned inputs invalidate every scope",
    );
    await rm(path.join(incrementalProject, "src/unowned.js"));
    await writeIncrementalConfig({
      ...incrementalConfig,
      evidenceReuse: {
        ...incrementalConfig.evidenceReuse,
        environmentKey: "changed-data",
      },
    });
    assert.equal((await scopePlan()).browser.captureCount, 2);
    await writeIncrementalConfig({
      ...incrementalConfig,
      reviewScopes: incrementalConfig.reviewScopes.filter(
        (scope) => scope.name !== "b",
      ),
    });
    const removedScope = await scopePlan();
    assert.equal(removedScope.browser.captureCount, 2);
    assert.match(
      removedScope.browser.states.find((state) => state.page === "b").reason,
      /Unassigned/,
    );
    await writeIncrementalConfig({
      ...incrementalConfig,
      reviewScopes: [
        { ...incrementalConfig.reviewScopes[0], dependsOn: ["a"] },
        ...incrementalConfig.reviewScopes.slice(1),
      ],
    });
    assert.equal(
      (await scopeCLI("plan")).code,
      2,
      "Dependency cycles must be rejected before execution",
    );
    await writeIncrementalConfig({
      ...incrementalConfig,
      evidenceReuse: undefined,
    });
    assert.ok(
      (await scopePlan()).reviewScopes.every(
        (scope) => scope.status === "unknown",
      ),
    );
    await writeIncrementalConfig({
      ...incrementalConfig,
      sourceChecks: [
        ...incrementalConfig.sourceChecks,
        {
          id: "opaque",
          command: [process.execPath, "-e", "process.stdout.write('[]')"],
          authority: "advisory",
        },
      ],
      reviewScopes: incrementalConfig.reviewScopes.map((scope) =>
        scope.name === "a"
          ? { ...scope, sourceChecks: ["a", "opaque"] }
          : scope,
      ),
    });
    assert.equal(
      (await scopePlan()).reviewScopes.find((scope) => scope.name === "a")
        .status,
      "unknown",
    );
    await writeIncrementalConfig();
    const savedDesign = await readFile(
      path.join(incrementalProject, "src/b/DESIGN.md"),
      "utf8",
    );
    await rm(path.join(incrementalProject, "src/b/DESIGN.md"));
    const missingScopeDocument = await scopeCLI("plan");
    assert.equal(missingScopeDocument.code, 2);
    assert.match(
      missingScopeDocument.stderr,
      /missing required project document/,
    );
    await writeFile(
      path.join(incrementalProject, "src/b/DESIGN.md"),
      savedDesign,
    );
    const localScopeRun = await scopeCheck("local-change");
    assert.deepEqual(localScopeRun.report.execution.browser, {
      required: 2,
      executed: 1,
      reused: 1,
    });
    assert.deepEqual(localScopeRun.report.execution.sourceChecks, {
      required: 2,
      executed: 1,
      reused: 1,
    });
    assert.equal(
      localScopeRun.report.pages.find((page) => page.name === "b").evidence
        .runId,
      fullScopeRun.report.id,
    );
    assert.deepEqual(await verify({ cwd: incrementalProject }), {
      status: "pass",
    });
    await writeFile(
      path.join(incrementalProject, "src/a/index.html"),
      incrementalHTML("a changed", "different"),
    );
    const crossScopeFailure = await scopeCheck(
      "cross-page-regression",
      "--incremental",
      1,
    );
    const reusedFailure = crossScopeFailure.report.pages.find(
      (page) => page.name === "b",
    );
    assert.equal(reusedFailure.evidence.kind, "reused");
    assert.ok(
      reusedFailure.findings.some(
        (finding) => finding.rule === "shared-encoding",
      ),
      "Cross-page rules must reevaluate reused observations against changed pages",
    );
    assert.equal((await verify({ cwd: incrementalProject })).status, "fail");
    await writeFile(
      path.join(incrementalProject, "src/a/index.html"),
      incrementalHTML("a changed"),
    );
    const recoveredScopeRun = await scopeCheck("recover-after-failure");
    assert.equal(
      recoveredScopeRun.report.execution.browser.executed,
      2,
      "A failed previous run is not reused",
    );
    const corruptedPage = recoveredScopeRun.report.pages.find(
      (page) => page.name === "b",
    );
    await writeFile(
      path.join(
        path.dirname(recoveredScopeRun.reportFile),
        corruptedPage.screenshot,
      ),
      "corrupt evidence",
    );
    assert.equal((await verify({ cwd: incrementalProject })).status, "fail");
    assert.equal(
      (await scopePlan()).browser.captureCount,
      1,
      "Damaged evidence invalidates its owning scope",
    );
    const restoredEvidence = await scopeCheck("recover-missing-evidence");
    assert.deepEqual(restoredEvidence.report.execution.browser, {
      required: 2,
      executed: 1,
      reused: 1,
    });
    assert.ok(
      restoredEvidence.report.pages.every((page) => !page.findings.length),
    );
    // Damaged comparison history must not prevent a new complete review.
    await writeFile(restoredEvidence.reportFile, "{invalid report");
    assert.equal((await verify({ cwd: incrementalProject })).status, "fail");
    assert.equal((await scopePlan()).browser.captureCount, 2);
    const repairedReport = await scopeCheck("recover-invalid-report");
    assert.equal(repairedReport.report.execution.browser.executed, 2);
    assert.equal(repairedReport.report.execution.sourceChecks.executed, 2);
    assert.deepEqual(await verify({ cwd: incrementalProject }), {
      status: "pass",
    });
    // Both destinations and all relative imports are declared inputs. Only the
    // checkpoint link changes; identical module bytes must not preserve a pass.
    const linkedSetup =
      'import { encoding } from "./helper.mjs";\nexport default async ({ page }) => { await page.locator(".mark").evaluate((element, value) => element.setAttribute("data-encoding", value), encoding); };\n';
    for (const name of ["a", "b"]) {
      const directory = path.join(incrementalProject, "checkpoints", name);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, "setup.mjs"), linkedSetup);
      await writeFile(
        path.join(directory, "helper.mjs"),
        `export const encoding = "${name === "a" ? "same" : "different"}";\n`,
      );
    }
    const checkpointLink = path.join(incrementalProject, "checkpoint.mjs");
    await symlink("checkpoints/a/setup.mjs", checkpointLink);
    await writeIncrementalConfig({
      ...incrementalConfig,
      pages: incrementalConfig.pages.map((page) =>
        page.name === "a"
          ? {
              ...page,
              checkpoints: [{ name: "ready", setup: "checkpoint.mjs" }],
            }
          : page,
      ),
      reviewScopes: incrementalConfig.reviewScopes.map((scope) =>
        scope.name === "a"
          ? { ...scope, sourcePaths: ["src/a/**", "checkpoints/**"] }
          : scope,
      ),
    });
    const linkedRun = await scopeCheck("checkpoint-link", "--full");
    const linkedPlan = await scopePlan();
    assert.equal(linkedPlan.browser.captureCount, 0);
    assert.deepEqual(await verify({ cwd: incrementalProject }), {
      status: "pass",
    });
    const linkedInputs = linkedPlan.reviewScopes.find(
      (scope) => scope.name === "a",
    ).inputs;
    for (const file of [
      "checkpoint.mjs",
      "checkpoints/a/setup.mjs",
      "checkpoints/a/helper.mjs",
      "checkpoints/b/setup.mjs",
      "checkpoints/b/helper.mjs",
    ])
      assert.ok(linkedInputs.includes(file), `Declared input missing: ${file}`);
    await rm(checkpointLink);
    await symlink("checkpoints/b/setup.mjs", checkpointLink);
    assert.equal(await readFile(checkpointLink, "utf8"), linkedSetup);
    assert.equal((await verify({ cwd: incrementalProject })).status, "fail");
    const retargetedPlan = await scopePlan();
    assert.equal(retargetedPlan.browser.captureCount, 1);
    assert.equal(
      retargetedPlan.browser.states.find((state) => state.page === "b").action,
      "reuse",
    );
    const retargetedRun = await scopeCheck(
      "retargeted-checkpoint",
      "--incremental",
      1,
    );
    assert.notEqual(
      retargetedRun.report.fingerprint,
      linkedRun.report.fingerprint,
    );
    assert.deepEqual(retargetedRun.report.execution.browser, {
      required: 2,
      executed: 1,
      reused: 1,
    });
    assert.ok(
      retargetedRun.report.pages
        .find((page) => page.name === "b")
        .findings.some((finding) => finding.rule === "shared-encoding"),
      "Retargeting runs the different relative import and detects its rendered failure",
    );
    const linkedB = linkedRun.report.pages.find((page) => page.name === "b");
    const retargetedB = retargetedRun.report.pages.find(
      (page) => page.name === "b",
    );
    assert.equal(
      retargetedRun.report.pages.find((page) => page.name === "a").evidence
        .kind,
      "fresh",
    );
    assert.equal(retargetedB.evidence.kind, "reused");
    assert.equal(retargetedB.evidence.runId, linkedRun.report.id);
    assert.deepEqual(
      await readFile(
        path.join(path.dirname(linkedRun.reportFile), linkedB.screenshot),
      ),
      await readFile(
        path.join(
          path.dirname(retargetedRun.reportFile),
          retargetedB.screenshot,
        ),
      ),
      "Copied artifacts keep byte-only checksum semantics",
    );
    assert.equal((await verify({ cwd: incrementalProject })).status, "fail");
    // Real elapsed time, without editing a passing report to manufacture expiry.
    await writeIncrementalConfig({
      ...incrementalConfig,
      evidenceReuse: { ...incrementalConfig.evidenceReuse, maxAgeMs: 5000 },
    });
    const forcedFull = await scopeCheck("forced-full", "--full");
    assert.equal(forcedFull.report.execution.browser.executed, 2);
    const lastCapture = Math.max(
      ...forcedFull.report.pages.map((page) =>
        Date.parse(page.evidence.createdAt),
      ),
      ...forcedFull.report.sourceChecks.map((provider) =>
        Date.parse(provider.evidence.createdAt),
      ),
    );
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, lastCapture + 5100 - Date.now())),
    );
    const expiredPlan = await scopePlan();
    assert.equal(expiredPlan.browser.captureCount, 2);
    assert.ok(
      expiredPlan.reviewScopes
        .filter((scope) => scope.name !== "shared")
        .every((scope) => /expired/.test(scope.reason)),
    );
    assert.match((await verify({ cwd: incrementalProject })).reason, /expired/);
    const workloadDirectory = path.join(repository, "dist/review-evidence");
    await mkdir(workloadDirectory, { recursive: true });
    await writeFile(
      path.join(workloadDirectory, "incremental-workload.json"),
      JSON.stringify(
        {
          description:
            "Synthetic two-page, two-provider installed CLI workflow. Observed elapsed times are not a generalized speedup or token/cost estimate.",
          node: process.version,
          browser: fullScopeRun.report.browserVersion,
          config: incrementalConfig,
          inputs: {
            a: incrementalHTML("a"),
            b: incrementalHTML("b"),
            sharedCSS,
            designText,
            checkpointSetup: incrementalSetup,
            storageState: incrementalStorage,
            symlinkCheckpoint: {
              setup: linkedSetup,
              targets: ["checkpoints/a/setup.mjs", "checkpoints/b/setup.mjs"],
              helperEncodings: { a: "same", b: "different" },
            },
          },
          workloads,
        },
        null,
        2,
      ),
    );
    t.diagnostic(
      `incremental workload: ${JSON.stringify(workloads.map(({ label, elapsedMs, execution }) => ({ label, elapsedMs, browser: execution.browser, sourceChecks: execution.sourceChecks })))}`,
    );
  },
);

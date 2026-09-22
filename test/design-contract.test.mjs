import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
  cp,
  symlink,
  realpath,
  lstat,
  rename,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

// An installed-CLI authoring workflow, not helper tests or a viewport matrix.
test(
  "Authored design contracts gate review without mutating audits or accepting stale evidence",
  { timeout: 180000 },
  async (t) => {
    assert.ok(
      process.env.VIEWRULE_TEST_ARCHIVE,
      "Run npm test to test the archive",
    );
    const root = await mkdtemp(path.join(tmpdir(), "viewrule-contract-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const installation = path.join(root, "installed");
    await promisify(execFile)(
      "npm",
      [
        "install",
        "--prefix",
        installation,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        process.env.VIEWRULE_TEST_ARCHIVE,
      ],
      { timeout: 120000 },
    );
    const engine = path.join(installation, "node_modules/viewrule");
    const repository = path.resolve(import.meta.dirname, "..");
    const project = path.join(root, "application");
    await mkdir(path.join(project, "src"), { recursive: true });
    await writeFile(
      path.join(project, "src/page.html"),
      '<!doctype html><html lang="en"><title>Contract fixture</title><main><p>Compare the current facilities.</p></main></html>',
    );
    const server = createServer(async (req, res) => {
      const pathname = new URL(req.url, "http://localhost").pathname;
      if (pathname.startsWith("/viewrule/")) {
        if (
          !/^\/viewrule\/rules\/(?:index\.json|dr-\d{3}\/(?:index\.md)?)$/.test(
            pathname,
          )
        ) {
          res.writeHead(404);
          return res.end();
        }
        const file = path.join(
          repository,
          "dist/site",
          pathname.slice("/viewrule/".length),
          ...(pathname.endsWith("/") ? ["index.html"] : []),
        );
        try {
          const bytes = await readFile(file);
          res.setHeader(
            "Content-Type",
            file.endsWith(".md")
              ? "text/markdown; charset=utf-8"
              : file.endsWith(".json")
                ? "application/json"
                : "text/html",
          );
          return res.end(bytes);
        } catch {
          res.writeHead(404);
          return res.end();
        }
      }
      res.setHeader("Content-Type", "text/html");
      res.end(await readFile(path.join(project, "src/page.html")));
    });
    await new Promise((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve(undefined)),
    );
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseURL = `http://127.0.0.1:${address.port}`;
    /** @type {NodeJS.ProcessEnv} */
    const env = {
      ...process.env,
      VIEWRULE_CONFIG_DIR: path.join(root, "global"),
      VIEWRULE_BASE_URL: baseURL,
    };
    const cli = (args, input = "") =>
      new Promise((resolve, reject) => {
        const child = execFile(
          process.execPath,
          [
            path.join(engine, "bin/viewrule.mjs"),
            "--project",
            project,
            ...args,
          ],
          { cwd: project, env, timeout: 45000 },
          (error, stdout, stderr) => {
            if (error && typeof error.code !== "number") return reject(error);
            resolve({ code: error?.code ?? 0, stdout, stderr });
          },
        );
        child.stdin.end(input);
      });

    // Retrieve policy before project setup, with no usable browser or network URL.
    const guide = (...args) =>
      promisify(execFile)(
        process.execPath,
        [path.join(engine, "bin/viewrule.mjs"), "guide", ...args],
        {
          cwd: root,
          env: { ...env, VIEWRULE_BROWSER_PATH: path.join(root, "absent") },
        },
      );
    const ruleIndex = JSON.parse((await guide("rules")).stdout);
    assert.equal(ruleIndex.schemaVersion, 1);
    assert.equal(ruleIndex.rules.length, 16);
    const selected = ruleIndex.rules.find((rule) => rule.id === "DR-006");
    const rawRule = (await guide(selected.id)).stdout;
    assert.equal(
      rawRule,
      await readFile(path.join(engine, selected.source), "utf8"),
    );
    assert.equal(
      createHash("sha256").update(rawRule).digest("hex"),
      selected.sourceSHA256,
    );
    assert.equal(
      JSON.parse((await guide()).stdout).designRules.indexUrl,
      "https://lanej.io/viewrule/rules/index.json",
    );
    await assert.rejects(guide("DR-999"), { code: 2 });
    await assert.rejects(guide("DR-006", "extra"), { code: 2 });

    // The same catalog and full documents are directly retrievable below /viewrule/.
    const response = await fetch(`${baseURL}/viewrule/rules/index.json`);
    assert.equal(response.status, 200);
    const publishedIndex = await response.json();
    assert.equal(publishedIndex.policySHA256, ruleIndex.policySHA256);
    assert.deepEqual(
      publishedIndex.rules.map(
        ({ markdownSHA256: _hash, ...metadata }) => metadata,
      ),
      ruleIndex.rules,
    );
    for (const entry of publishedIndex.rules) {
      const document = await fetch(
        baseURL + new URL(entry.markdownUrl).pathname,
      );
      assert.equal(document.status, 200);
      assert.match(document.headers.get("content-type"), /text\/markdown/);
      const markdown = await document.text();
      assert.equal(
        createHash("sha256").update(markdown).digest("hex"),
        entry.markdownSHA256,
      );
      const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---\n\n/);
      assert.ok(frontmatter);
      assert.equal(JSON.parse(frontmatter[1]).sourceSHA256, entry.sourceSHA256);
      if (entry.id === selected.id)
        assert.equal(markdown.slice(frontmatter[0].length), rawRule);
      const html = await fetch(baseURL + new URL(entry.htmlUrl).pathname);
      assert.equal(html.status, 200);
      assert.match(
        await html.text(),
        /rel="alternate" type="text\/markdown" href="index\.md"/,
      );
    }

    // Isolate the plugin: no parent-repository rule reads and no implicit setup.
    const plugin = path.join(root, "isolated-plugin");
    await cp(path.join(repository, "plugins/claude-code"), plugin, {
      recursive: true,
    });
    const runtime = path.join(root, "plugin-runtime");
    const pluginEnv = { ...env, VIEWRULE_PLUGIN_DATA_DIR: runtime };
    const pluginGuide = (...args) =>
      promisify(execFile)(
        process.execPath,
        [path.join(plugin, "scripts/viewrule.mjs"), "guide", ...args],
        { cwd: root, env: pluginEnv },
      );
    await assert.rejects(pluginGuide("DR-006"), { code: 2 });
    await assert.rejects(readdir(runtime), { code: "ENOENT" });
    const pin = JSON.parse(
      await readFile(path.join(plugin, "engine.json"), "utf8"),
    );
    pin.version = JSON.parse(
      await readFile(path.join(engine, "package.json"), "utf8"),
    ).version;
    pin.sha256 = createHash("sha256")
      .update(await readFile(process.env.VIEWRULE_TEST_ARCHIVE))
      .digest("hex");
    await writeFile(path.join(plugin, "engine.json"), JSON.stringify(pin));
    const installed = path.join(runtime, `${pin.version}-${pin.sha256}`);
    await mkdir(path.join(installed, "node_modules"), { recursive: true });
    await symlink(engine, path.join(installed, "node_modules/viewrule"), "dir");
    await writeFile(
      path.join(installed, "installed.json"),
      JSON.stringify(pin),
    );
    assert.equal((await pluginGuide("DR-006")).stdout, rawRule);
    assert.deepEqual(
      JSON.parse((await pluginGuide("rules")).stdout),
      ruleIndex,
    );

    const init = await cli(["init"]);
    assert.equal(init.code, 0, init.stderr);
    const configPath = path.join(project, ".ui-review/config.json");
    const rulesPath = path.join(project, ".ui-review/rules.json");
    const designPath = path.join(project, "DESIGN.md");
    const initialConfig = await readFile(configPath, "utf8");
    const initialRules = await readFile(rulesPath, "utf8");
    assert.deepEqual(JSON.parse(initialConfig).projectDocuments, ["DESIGN.md"]);
    assert.equal(JSON.parse(initialConfig).enforceOnStop, false);
    assert.equal(
      Object.hasOwn(JSON.parse(initialConfig), "baseURL"),
      false,
      "New setup does not commit a machine-local development port",
    );
    const scaffold = await readFile(designPath, "utf8");
    assert.match(scaffold, /viewrule:design-template/);
    await assert.rejects(readFile(path.join(project, "STYLE.md")), {
      code: "ENOENT",
    });

    // A bad browser path proves the prerequisite is evaluated before launch.
    const browserPath = env.VIEWRULE_BROWSER_PATH;
    env.VIEWRULE_BROWSER_PATH = path.join(root, "unavailable-browser");
    const initialState = await readdir(path.join(project, ".ui-review"));
    for (const command of ["contract", "check"]) {
      const blocked = await cli([command]);
      assert.equal(blocked.code, 2, blocked.stderr);
      assert.match(blocked.stderr, /DESIGN\.md is still a template/);
    }
    assert.equal(await readFile(designPath, "utf8"), scaffold);
    assert.deepEqual(
      await readdir(path.join(project, ".ui-review")),
      initialState,
    );
    const guidance = await cli(["guidance"]);
    assert.equal(guidance.code, 0, guidance.stderr);
    assert.equal(
      JSON.parse(guidance.stdout).projectDocuments[0].content,
      scaffold,
    );

    await rm(designPath);
    const missing = await cli(["check"]);
    assert.equal(missing.code, 2, missing.stderr);
    assert.match(missing.stderr, /Cannot read project document DESIGN\.md/);
    await assert.rejects(readFile(designPath), { code: "ENOENT" });
    const lint = await cli(["lint", "--target", "src/page.html"]);
    assert.equal(lint.code, 0, lint.stderr);
    assert.equal(JSON.parse(lint.stdout).coverage, "source-only");
    assert.equal(JSON.parse(lint.stdout).renderedRequirements, "not-assessed");
    assert.deepEqual(
      await readdir(path.join(project, ".ui-review")),
      initialState,
    );

    await writeFile(designPath, "");
    const blank = await cli(["contract"]);
    assert.equal(blank.code, 2, blank.stderr);
    assert.match(blank.stderr, /no authored prose/);
    await writeFile(
      designPath,
      "---\nname: Example\n---\n# Design\n<!-- not authored -->\n",
    );
    const empty = await cli(["contract"]);
    assert.equal(empty.code, 2, empty.stderr);
    assert.match(empty.stderr, /no authored prose/);
    await writeFile(designPath, "# Design\n[TODO: Explain the task.]\n");
    const unfinished = await cli(["contract"]);
    assert.equal(unfinished.code, 2, unfinished.stderr);
    assert.match(unfinished.stderr, /still a template/);

    const authored =
      "---\nname: Facility workspace\ntokens:\n  custom: preserved\n---\n" +
      (await readFile(
        path.join(engine, "docs/design-contract-example.md"),
        "utf8",
      )) +
      "\n## Additional context\nAn open question is not an automatic approval.\n";
    await writeFile(designPath, authored);
    const contract = await cli(["contract"]);
    assert.equal(contract.code, 0, contract.stderr);
    assert.equal(
      JSON.parse(contract.stdout).policySHA256,
      ruleIndex.policySHA256,
    );
    assert.equal(
      JSON.parse(contract.stdout).projectDocuments[0].content,
      authored,
    );
    const runtimeURL = env.VIEWRULE_BASE_URL;
    delete env.VIEWRULE_BASE_URL;
    const missingRuntimeURL = await cli(["plan"]);
    assert.equal(missingRuntimeURL.code, 2);
    assert.match(missingRuntimeURL.stderr, /No application URL is available/);
    const explicitRuntimeURL = await cli(["plan", "--url", baseURL]);
    assert.equal(explicitRuntimeURL.code, 0, explicitRuntimeURL.stderr);
    assert.deepEqual(JSON.parse(explicitRuntimeURL.stdout).target, {
      baseURL: new URL(baseURL).href,
      source: "argument",
    });
    env.VIEWRULE_BASE_URL = runtimeURL;
    assert.equal((await cli(["init", "--documents"])).code, 2);
    assert.equal(await readFile(designPath, "utf8"), authored);
    assert.equal(await readFile(configPath, "utf8"), initialConfig);
    assert.equal(await readFile(rulesPath, "utf8"), initialRules);

    // References are checked independently of the prose prerequisite.
    const rule = {
      id: "readable-task",
      type: "min-font-size",
      selector: "main p",
      min: 14,
      severity: "error",
      reason: "The task description must remain readable.",
      designRules: ["DR-007"],
      sources: ["DESIGN.md#missing-requirement"],
    };
    await writeFile(rulesPath, JSON.stringify([rule]));
    const brokenReference = await cli(["contract"]);
    assert.equal(brokenReference.code, 2, brokenReference.stderr);
    assert.match(brokenReference.stderr, /Unknown source section/);
    rule.sources = ["DESIGN.md#comparison-001"];
    await writeFile(rulesPath, JSON.stringify([rule]));
    const config = {
      ...JSON.parse(initialConfig),
      sourcePaths: ["src"],
      sourceChecks: [],
      accessibility: false,
      enforceOnStop: true,
      viewports: [{ name: "desktop", width: 800, height: 600 }],
    };
    await writeFile(configPath, JSON.stringify(config));
    if (browserPath === undefined) delete env.VIEWRULE_BROWSER_PATH;
    else env.VIEWRULE_BROWSER_PATH = browserPath;
    const checked = await cli(["check"]);
    assert.equal(checked.code, 0, checked.stderr || checked.stdout);
    assert.equal(
      JSON.parse(checked.stdout).targetBaseURL,
      new URL(baseURL).href,
    );
    const before = JSON.parse(checked.stdout).contract;
    const latestPath = path.join(project, ".ui-review/latest.json");
    const latest = await readFile(latestPath, "utf8");
    const hookInput = JSON.stringify({ cwd: project });
    const fresh = await cli(["hook"], hookInput);
    assert.equal(fresh.code, 0, fresh.stderr);
    assert.deepEqual(JSON.parse(fresh.stdout), {});
    await writeFile(
      designPath,
      authored + "\nThe reporting period must remain visible.\n",
    );
    const changed = await cli(["contract"]);
    assert.equal(changed.code, 0, changed.stderr);
    const after = JSON.parse(changed.stdout);
    assert.notEqual(after.hash, before.hash);
    assert.deepEqual(
      after.documentChanges.map((change) => change.path),
      ["DESIGN.md"],
    );
    const stale = await cli(["hook"], hookInput);
    assert.equal(stale.code, 0, stale.stderr);
    assert.equal(JSON.parse(stale.stdout).decision, "block");
    assert.equal(await readFile(latestPath, "utf8"), latest);

    // An existing optional configuration is not silently migrated by an audit.
    const legacy = path.join(root, "legacy");
    await mkdir(path.join(legacy, ".ui-review"), { recursive: true });
    const legacyConfig = { ...config };
    delete legacyConfig.projectDocuments;
    const legacyConfigPath = path.join(legacy, ".ui-review/config.json");
    await writeFile(legacyConfigPath, JSON.stringify(legacyConfig));
    const legacyAudit = await cli(["contract", "--project", legacy]);
    assert.equal(legacyAudit.code, 0, legacyAudit.stderr);
    assert.deepEqual(JSON.parse(legacyAudit.stdout).projectDocuments, []);
    await assert.rejects(readFile(path.join(legacy, "DESIGN.md")), {
      code: "ENOENT",
    });
    assert.deepEqual(
      JSON.parse(await readFile(legacyConfigPath, "utf8")),
      legacyConfig,
    );

    // Adopting setup preserves an existing visual system and its optional companion.
    await writeFile(path.join(legacy, "DESIGN.md"), authored);
    const style =
      "# Visual system\nUse the application's canonical component tokens.\n";
    await writeFile(path.join(legacy, "STYLE.md"), style);
    await rm(legacyConfigPath);
    const adopt = await cli([
      "init",
      "--project",
      legacy,
      "--url",
      baseURL,
      "--documents",
    ]);
    assert.equal(adopt.code, 0, adopt.stderr);
    assert.equal(
      await readFile(path.join(legacy, "DESIGN.md"), "utf8"),
      authored,
    );
    assert.equal(await readFile(path.join(legacy, "STYLE.md"), "utf8"), style);
    assert.deepEqual(
      JSON.parse(await readFile(legacyConfigPath, "utf8")).projectDocuments,
      ["DESIGN.md", "STYLE.md"],
    );

    // Carry authored setup into a real linked worktree, then review from a child
    // directory through both installed entrypoints. Runtime evidence stays local.
    const git = (cwd, ...args) =>
      promisify(execFile)(
        "git",
        [
          "-c",
          "core.hooksPath=/dev/null",
          "-c",
          "commit.gpgsign=false",
          "-c",
          "user.name=Viewrule test",
          "-c",
          "user.email=viewrule@example.invalid",
          ...args,
        ],
        { cwd, env, timeout: 10000 },
      );
    const engineLauncher = path.join(engine, "bin/viewrule.mjs");
    const pluginLauncher = path.join(plugin, "scripts/viewrule.mjs");
    const worktreeCLI = (cwd, args, input = "", launcher = engineLauncher) =>
      new Promise((resolve, reject) => {
        const child = execFile(
          process.execPath,
          [launcher, ...args],
          { cwd, env: pluginEnv, timeout: 45000 },
          (error, stdout, stderr) => {
            if (error && typeof error.code !== "number") return reject(error);
            resolve({ code: error?.code ?? 0, stdout, stderr });
          },
        );
        child.stdin.end(input);
      });
    await git(project, "init", "-q");
    await git(project, "add", "src");
    await git(project, "commit", "-qm", "Application before setup");
    // Nest it physically below the configured checkout to catch discovery that
    // crosses a .git file boundary and accidentally adopts the main checkout.
    let linked = path.join(project, ".worktrees/feature checkout");
    await git(project, "worktree", "add", "--detach", linked);
    assert.ok((await lstat(path.join(linked, ".git"))).isFile());
    const missingSetup = await worktreeCLI(linked, ["plan"]);
    assert.equal(missingSetup.code, 2);
    assert.match(missingSetup.stderr, /worktree|committed/i);
    for (const launcher of [engineLauncher, pluginLauncher]) {
      const unconfigured = await worktreeCLI(
        linked,
        ["hook"],
        JSON.stringify({ cwd: linked }),
        launcher,
      );
      assert.deepEqual(JSON.parse(unconfigured.stdout), {});
    }
    await git(
      project,
      "add",
      ".ui-review/config.json",
      ".ui-review/rules.json",
      ".ui-review/.gitignore",
      "DESIGN.md",
    );
    await git(
      project,
      "commit",
      "-qm",
      "Version the application review contract",
    );
    const revision = (await git(project, "rev-parse", "HEAD")).stdout.trim();
    await git(linked, "checkout", "--detach", revision);
    let childDirectory = path.join(linked, "src");
    const plan = await worktreeCLI(childDirectory, ["plan"]);
    assert.equal(plan.code, 0, plan.stderr);
    assert.equal(JSON.parse(plan.stdout).project, await realpath(linked));
    assert.equal(JSON.parse(plan.stdout).sources.inventory, "git");
    assert.ok(
      JSON.parse(plan.stdout).sources.files.some(
        (file) => file.path === "src/page.html",
      ),
    );
    const explicit = await worktreeCLI(childDirectory, [
      "plan",
      "--project",
      ".",
    ]);
    assert.equal(explicit.code, 2, "An explicit project is an exact boundary");
    const ignored = await git(
      linked,
      "check-ignore",
      ".ui-review/latest.json",
      ".ui-review/runs/sample/report.json",
      ".ui-review/auth-local.json",
    );
    assert.equal(ignored.stdout.trim().split("\n").length, 3);
    await assert.rejects(
      git(
        linked,
        "check-ignore",
        ".ui-review/config.json",
        ".ui-review/rules.json",
      ),
      { code: 1 },
    );
    const mainState = await readFile(latestPath, "utf8");
    for (const launcher of [engineLauncher, pluginLauncher]) {
      const missingEvidence = await worktreeCLI(
        childDirectory,
        ["hook"],
        JSON.stringify({ cwd: childDirectory }),
        launcher,
      );
      assert.equal(JSON.parse(missingEvidence.stdout).decision, "block");
    }
    const reviewed = await worktreeCLI(
      childDirectory,
      ["check"],
      "",
      pluginLauncher,
    );
    assert.equal(reviewed.code, 0, reviewed.stderr || reviewed.stdout);
    assert.ok(
      JSON.parse(reviewed.stdout).report.startsWith(
        path.join(await realpath(linked), ".ui-review/runs") + path.sep,
      ),
    );
    assert.equal(await readFile(latestPath, "utf8"), mainState);
    for (const launcher of [engineLauncher, pluginLauncher]) {
      const freshEvidence = await worktreeCLI(
        childDirectory,
        ["hook"],
        JSON.stringify({ cwd: childDirectory }),
        launcher,
      );
      assert.deepEqual(JSON.parse(freshEvidence.stdout), {});
    }
    // The shared discovery module lives outside src/ but still changes the engine
    // used to interpret a report. Its installed bytes must participate in freshness.
    const resolverFile = path.join(
      engine,
      "plugins/claude-code/scripts/project.mjs",
    );
    const resolverSource = await readFile(resolverFile, "utf8");
    await writeFile(
      resolverFile,
      resolverSource + "\n// Changed engine module\n",
    );
    const changedEngine = await worktreeCLI(
      childDirectory,
      ["hook"],
      JSON.stringify({ cwd: childDirectory }),
    );
    assert.equal(JSON.parse(changedEngine.stdout).decision, "block");
    await writeFile(resolverFile, resolverSource);
    await writeFile(
      path.join(childDirectory, "page.html"),
      "<main>Changed worktree source</main>",
    );
    const staleWorktree = await worktreeCLI(
      childDirectory,
      ["hook"],
      JSON.stringify({ cwd: childDirectory }),
      pluginLauncher,
    );
    assert.equal(JSON.parse(staleWorktree.stdout).decision, "block");
    assert.equal(await readFile(latestPath, "utf8"), mainState);

    // Discovery follows the current checkout after a Git-supported move.
    const moved = path.join(root, "moved checkout");
    await git(project, "worktree", "move", linked, moved);
    linked = moved;
    childDirectory = path.join(linked, "src");
    const movedPlan = await worktreeCLI(childDirectory, ["plan"]);
    assert.equal(movedPlan.code, 0, movedPlan.stderr);
    assert.equal(JSON.parse(movedPlan.stdout).project, await realpath(linked));

    // The common symlink workaround must not overwrite another checkout's state.
    const linkedReview = path.join(linked, ".ui-review");
    await rename(linkedReview, linkedReview + ".saved");
    await symlink(path.join(project, ".ui-review"), linkedReview, "dir");
    const shared = await worktreeCLI(childDirectory, ["check"]);
    assert.equal(shared.code, 2);
    assert.match(shared.stderr, /\.ui-review.*outside the project/);
    for (const launcher of [engineLauncher, pluginLauncher]) {
      const sharedHook = await worktreeCLI(
        childDirectory,
        ["hook"],
        JSON.stringify({ cwd: childDirectory }),
        launcher,
      );
      assert.equal(JSON.parse(sharedHook.stdout).decision, "block");
      assert.match(
        JSON.parse(sharedHook.stdout).reason,
        /\.ui-review.*outside the project/,
      );
    }
    assert.equal(await readFile(latestPath, "utf8"), mainState);
    await rm(linkedReview);
    await rename(linkedReview + ".saved", linkedReview);
  },
);

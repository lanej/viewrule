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

    // Existing listeners and another checkout's preview must not prevent startup.
    const occupied = createServer((req, res) => res.end("Other application"));
    await new Promise((resolve, reject) => {
      occupied.once("error", (error) =>
        "code" in error && error.code === "EADDRINUSE"
          ? resolve(undefined)
          : reject(error),
      );
      occupied.listen(4173, "127.0.0.1", () => resolve(undefined));
    });
    t.after(() =>
      occupied.listening
        ? new Promise((resolve) => occupied.close(resolve))
        : undefined,
    );
    const startPreview = () =>
      new Promise((resolve, reject) => {
        let output = "";
        const child = execFile(
          process.execPath,
          [path.join(repository, "scripts/site.mjs"), "--serve"],
          { cwd: repository, timeout: 30000 },
          (error) => reject(error ?? new Error("Preview exited before ready")),
        );
        const closed = new Promise((done) => child.once("close", done));
        const stop = () => {
          child.kill();
          return closed;
        };
        t.after(stop);
        child.stdout.on("data", (chunk) => {
          output += chunk;
          const match = output.match(
            /Preview: (http:\/\/127\.0\.0\.1:\d+\/rules\/)/,
          );
          if (match) resolve({ url: match[1], stop });
        });
      });
    const firstPreview = await startPreview();
    const secondPreview = await startPreview();
    assert.notEqual(firstPreview.url, secondPreview.url);
    for (const preview of [firstPreview, secondPreview]) {
      assert.notEqual(new URL(preview.url).port, "4173");
      const response = await fetch(preview.url);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Viewrule/);
      await preview.stop();
    }

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
    for (const command of ["plan", "check"]) {
      const missingRuntimeURL = await cli([command]);
      assert.equal(missingRuntimeURL.code, 2);
      assert.match(missingRuntimeURL.stderr, /No application URL is available/);
    }
    const offlineContract = await cli(["contract"]);
    assert.equal(offlineContract.code, 0, offlineContract.stderr);
    const explicitRuntimeURL = await cli(["plan", "--url", baseURL]);
    assert.equal(explicitRuntimeURL.code, 0, explicitRuntimeURL.stderr);
    assert.deepEqual(JSON.parse(explicitRuntimeURL.stdout).target, {
      baseURL: new URL(baseURL).href,
      source: "argument",
    });
    env.VIEWRULE_BASE_URL = runtimeURL;
    const credentialURL = await cli([
      "plan",
      "--url",
      "http://fixture-user:fixture-secret@127.0.0.1/",
    ]);
    assert.equal(credentialURL.code, 2);
    assert.match(credentialURL.stderr, /embedded credentials/);
    assert.doesNotMatch(credentialURL.stderr, /fixture-secret/);
    const invalidURL = await cli(["plan", "--url", ""]);
    assert.equal(
      invalidURL.code,
      2,
      "An empty override cannot select another server",
    );
    assert.match(invalidURL.stderr, /Invalid application URL from argument/);

    // A legacy absolute route must not silently stay on the old worktree's port.
    await writeFile(
      configPath,
      JSON.stringify({
        ...JSON.parse(initialConfig),
        baseURL,
        pages: [{ name: "main", path: `${baseURL}/`, ready: "main" }],
      }),
    );
    const wrongOrigin = await cli([
      "plan",
      "--url",
      "http://other-worktree.invalid/",
    ]);
    assert.equal(wrongOrigin.code, 2);
    assert.match(wrongOrigin.stderr, /Page paths must stay on baseURL origin/);
    await writeFile(configPath, initialConfig);
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
      sourcePaths: ["./src/"],
      sourceChecks: [],
      accessibility: false,
      enforceOnStop: true,
      viewports: [{ name: "desktop", width: 800, height: 600 }],
      reviewScopes: [{ name: "main", sourcePaths: ["src"], pages: ["main"] }],
      evidenceReuse: { environmentKey: "contract-fixture", maxAgeMs: 3600000 },
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
    const firstReport = JSON.parse(
      await readFile(JSON.parse(checked.stdout).report, "utf8"),
    );
    assert.equal(firstReport.targetBaseURL, new URL(baseURL).href);
    assert.equal(Object.hasOwn(firstReport.contract.config, "baseURL"), false);
    const reusablePlan = await cli(["plan", "--incremental"]);
    assert.equal(reusablePlan.code, 0, reusablePlan.stderr);
    assert.equal(JSON.parse(reusablePlan.stdout).browser.reuseCount, 1);

    // A second live endpoint serves different rendered content with identical
    // local inputs. It must be measured, even when the previous run can be reused.
    const alternateServer = createServer((req, res) => {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html lang="en"><title>Other checkout</title><main><p style="font-size:8px">Different server</p></main></html>',
      );
    });
    await new Promise((resolve) =>
      alternateServer.listen(0, "127.0.0.1", () => resolve(undefined)),
    );
    t.after(() => new Promise((resolve) => alternateServer.close(resolve)));
    const alternateAddress = alternateServer.address();
    assert.ok(alternateAddress && typeof alternateAddress !== "string");
    const alternateURL = `http://127.0.0.1:${alternateAddress.port}/`;
    const changedTargetPlan = await cli([
      "plan",
      "--incremental",
      "--url",
      alternateURL,
    ]);
    assert.equal(changedTargetPlan.code, 0, changedTargetPlan.stderr);
    assert.equal(JSON.parse(changedTargetPlan.stdout).browser.reuseCount, 0);
    const changedTarget = await cli([
      "check",
      "--incremental",
      "--url",
      alternateURL,
    ]);
    assert.equal(
      changedTarget.code,
      1,
      changedTarget.stderr || changedTarget.stdout,
    );
    const changedTargetReport = JSON.parse(
      await readFile(JSON.parse(changedTarget.stdout).report, "utf8"),
    );
    assert.equal(changedTargetReport.targetBaseURL, alternateURL);
    assert.equal(changedTargetReport.execution.browser.reused, 0);
    assert.equal(changedTargetReport.pages[0].url, alternateURL);
    const wrongServerFinding = changedTargetReport.pages[0].findings.find(
      (finding) => finding.rule === rule.id,
    );
    assert.ok(wrongServerFinding);
    assert.equal(wrongServerFinding.actual, 8);
    assert.equal(wrongServerFinding.expected, 14);
    assert.deepEqual(wrongServerFinding.designRules, ["DR-007"]);
    assert.equal(changedTargetReport.contract.hash, before.hash);
    assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")), config);
    const recovered = await cli(["check"]);
    assert.equal(recovered.code, 0, recovered.stderr || recovered.stdout);
    const latestPath = path.join(project, ".ui-review/latest.json");
    const latest = await readFile(latestPath, "utf8");
    delete env.VIEWRULE_BASE_URL;
    const fresh = await cli(["verify"]);
    assert.equal(fresh.code, 0, fresh.stderr);
    assert.deepEqual(JSON.parse(fresh.stdout), { status: "pass" });
    env.VIEWRULE_BASE_URL = runtimeURL;
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
    const stale = await cli(["verify"]);
    assert.equal(stale.code, 1, stale.stderr);
    assert.equal(JSON.parse(stale.stdout).status, "fail");
    assert.equal(await readFile(latestPath, "utf8"), latest);

    // An existing optional configuration is not silently migrated by an audit.
    const legacy = path.join(root, "legacy");
    await mkdir(path.join(legacy, ".ui-review"), { recursive: true });
    const legacyConfig = { ...config };
    legacyConfig.baseURL = alternateURL;
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
    const environmentPlan = await cli(["plan", "--project", legacy]);
    assert.equal(environmentPlan.code, 0, environmentPlan.stderr);
    assert.deepEqual(JSON.parse(environmentPlan.stdout).target, {
      baseURL: new URL(baseURL).href,
      source: "environment",
    });
    delete env.VIEWRULE_BASE_URL;
    const configuredPlan = await cli(["plan", "--project", legacy]);
    assert.equal(configuredPlan.code, 0, configuredPlan.stderr);
    assert.deepEqual(JSON.parse(configuredPlan.stdout).target, {
      baseURL: alternateURL,
      source: "config",
    });
    env.VIEWRULE_BASE_URL = runtimeURL;

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
        [`--project=${linked}`, "hook"],
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
        ["verify"],
        JSON.stringify({ cwd: childDirectory }),
        launcher,
      );
      assert.equal(JSON.parse(missingEvidence.stdout).status, "fail");
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
        ["verify"],
        JSON.stringify({ cwd: childDirectory }),
        launcher,
      );
      assert.deepEqual(JSON.parse(freshEvidence.stdout), { status: "pass" });
    }
    // Git delivery checks are opt-in and scoped, even when invoked below the root.
    // A passing capture of an unstaged fix must never certify the broken index.
    const linkedLatest = path.join(linked, ".ui-review/latest.json");
    const linkedEvidence = await readFile(linkedLatest, "utf8");
    const frontendFile = path.join(linked, "src/page.html");
    const reviewedSource = await readFile(frontendFile, "utf8");
    await writeFile(path.join(linked, "backend.txt"), "Backend-only work\n");
    await git(linked, "add", "backend.txt");
    await rename(linkedLatest, linkedLatest + ".saved");
    const unrelatedCommit = await worktreeCLI(
      childDirectory,
      ["pre-commit"],
      "",
      pluginLauncher,
    );
    assert.equal(unrelatedCommit.code, 0, unrelatedCommit.stderr);
    assert.equal(
      JSON.parse(unrelatedCommit.stdout).status,
      "skip",
      "Backend-only commits do not need a UI report",
    );
    await rename(linkedLatest + ".saved", linkedLatest);
    await writeFile(frontendFile, "<main>Broken staged UI</main>");
    await git(linked, "add", "src/page.html");
    await writeFile(frontendFile, reviewedSource);
    const stagedBefore = (await git(linked, "diff", "--cached", "--binary"))
      .stdout;
    const partialCommit = await worktreeCLI(
      childDirectory,
      ["pre-commit"],
      "",
      pluginLauncher,
    );
    assert.equal(
      partialCommit.code,
      1,
      partialCommit.stderr || partialCommit.stdout,
    );
    assert.match(
      JSON.parse(partialCommit.stdout).projects[0].reason,
      /differ from the Git index: src\/page.html/,
    );
    assert.equal(
      (await git(linked, "diff", "--cached", "--binary")).stdout,
      stagedBefore,
      "Verification never changes the index",
    );
    assert.equal(await readFile(frontendFile, "utf8"), reviewedSource);
    assert.equal(await readFile(linkedLatest, "utf8"), linkedEvidence);
    // Commit the deliberately rejected fixture with the test repository's hooks disabled,
    // then stage the already reviewed fix to exercise a real changed, passing index.
    await git(linked, "commit", "-qm", "Rejected staged UI fixture");
    const rejectedRevision = (
      await git(linked, "rev-parse", "HEAD")
    ).stdout.trim();
    await git(linked, "add", "src/page.html");
    const readyCommit = await worktreeCLI(
      childDirectory,
      ["pre-commit"],
      "",
      pluginLauncher,
    );
    assert.equal(readyCommit.code, 0, readyCommit.stderr || readyCommit.stdout);
    assert.equal(JSON.parse(readyCommit.stdout).status, "pass");
    await git(linked, "commit", "-qm", "Reviewed UI fixture");
    const reviewedRevision = (
      await git(linked, "rev-parse", "HEAD")
    ).stdout.trim();
    const readyPush = await worktreeCLI(
      childDirectory,
      ["pre-push", "review-test", "unused"],
      `refs/heads/reviewed ${reviewedRevision} refs/heads/reviewed ${rejectedRevision}\n`,
      pluginLauncher,
    );
    assert.equal(readyPush.code, 0, readyPush.stderr || readyPush.stdout);
    assert.equal(JSON.parse(readyPush.stdout).status, "pass");
    const otherPush = await worktreeCLI(
      childDirectory,
      ["pre-push", "review-test", "unused"],
      `refs/heads/rejected ${rejectedRevision} refs/heads/rejected ${revision}\n`,
      pluginLauncher,
    );
    assert.equal(otherPush.code, 1, otherPush.stderr || otherPush.stdout);
    assert.match(
      JSON.parse(otherPush.stdout).projects[0].reason,
      /differ from refs\/heads\/rejected/,
    );
    // A first push of a backend-only branch uses the destination's known history.
    await git(
      linked,
      "remote",
      "add",
      "review-test",
      path.join(root, "unused-remote.git"),
    );
    await git(
      linked,
      "update-ref",
      "refs/remotes/review-test/main",
      reviewedRevision,
    );
    await writeFile(
      path.join(linked, "backend.txt"),
      "More backend-only work\n",
    );
    await git(linked, "add", "backend.txt");
    await git(linked, "commit", "-qm", "Backend-only branch");
    const backendRevision = (
      await git(linked, "rev-parse", "HEAD")
    ).stdout.trim();
    await rename(linkedLatest, linkedLatest + ".saved");
    const backendPush = await worktreeCLI(
      childDirectory,
      ["pre-push", "review-test", "unused"],
      `refs/heads/backend ${backendRevision} refs/heads/backend ${"0".repeat(40)}\n`,
      pluginLauncher,
    );
    assert.equal(backendPush.code, 0, backendPush.stderr || backendPush.stdout);
    assert.equal(JSON.parse(backendPush.stdout).status, "skip");
    await rename(linkedLatest + ".saved", linkedLatest);

    // Select a nested application from the checkout root. Its own staged inputs
    // require review while the root application's unrelated source stays skipped.
    const nested = path.join(linked, "apps/web");
    await mkdir(path.join(nested, ".ui-review"), { recursive: true });
    await cp(path.join(linked, "src"), path.join(nested, "src"), {
      recursive: true,
    });
    for (const file of [
      ".ui-review/config.json",
      ".ui-review/rules.json",
      ".ui-review/.gitignore",
      "DESIGN.md",
    ])
      await cp(path.join(linked, file), path.join(nested, file));
    await git(linked, "add", "apps/web");
    const unreviewedNested = await worktreeCLI(linked, [
      "pre-commit",
      "--project",
      "apps/web",
    ]);
    assert.equal(
      unreviewedNested.code,
      1,
      unreviewedNested.stderr || unreviewedNested.stdout,
    );
    const nestedReview = await worktreeCLI(
      linked,
      ["check", "--project", "apps/web"],
      "",
      pluginLauncher,
    );
    assert.equal(
      nestedReview.code,
      0,
      nestedReview.stderr || nestedReview.stdout,
    );
    const nestedCommit = await worktreeCLI(
      linked,
      ["pre-commit", "--project", ".", "--project", "apps/web"],
      "",
      pluginLauncher,
    );
    assert.equal(
      nestedCommit.code,
      0,
      nestedCommit.stderr || nestedCommit.stdout,
    );
    assert.deepEqual(
      JSON.parse(nestedCommit.stdout).projects.map((result) => result.status),
      ["skip", "pass"],
    );
    await git(linked, "commit", "-qm", "Reviewed nested application");

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
      ["verify"],
      JSON.stringify({ cwd: childDirectory }),
    );
    assert.equal(JSON.parse(changedEngine.stdout).status, "fail");
    await writeFile(resolverFile, resolverSource);
    await writeFile(
      path.join(childDirectory, "page.html"),
      "<main>Changed worktree source</main>",
    );
    const staleWorktree = await worktreeCLI(
      childDirectory,
      ["verify"],
      JSON.stringify({ cwd: childDirectory }),
      pluginLauncher,
    );
    assert.equal(JSON.parse(staleWorktree.stdout).status, "fail");
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
        ["verify"],
        JSON.stringify({ cwd: childDirectory }),
        launcher,
      );
      assert.equal(JSON.parse(sharedHook.stdout).status, "fail");
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

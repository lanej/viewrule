import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { config, rules, reviewHtml } from "./fixtures.mjs";

// One user workflow through the installed entrypoint; no helper/edge-case matrix.
test("Claude plugin installs Viewrule, cites violations, learns feedback, and accepts a repaired comparison", { timeout: 90000 }, async (t) => {
  const project = await mkdtemp(path.join(tmpdir(), "ui-review-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const globalDir = path.join(project, "global");
  await mkdir(globalDir);
  await mkdir(path.join(project, "src"));
  await mkdir(path.join(project, ".ui-review"));
  const source = path.join(project, "src/page.html");
  await writeFile(source, reviewHtml(true));
  assert.ok(process.env.VIEWRULE_TEST_ARCHIVE, "Run npm test to exercise the packed engine");
  const archive = await readFile(process.env.VIEWRULE_TEST_ARCHIVE);
  let corruptDownload = true;
  const server = createServer(async (req, res) => {
    if (req.url === "/engine.tgz") {
      res.setHeader("Content-Type", "application/octet-stream");
      return res.end(corruptDownload ? Buffer.from("corrupt download") : archive);
    }
    res.setHeader("Content-Type", "text/html");
    res.end(await readFile(source));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  // Copy only the marketplace's plugin source, just as Claude's cache does.
  const repository = path.resolve(import.meta.dirname, "..");
  const marketplace = JSON.parse(await readFile(path.join(repository, ".claude-plugin/marketplace.json")));
  const plugin = path.join(project, "plugin cache/viewrule");
  await cp(path.join(repository, marketplace.plugins[0].source), plugin, { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(plugin, ".claude-plugin/plugin.json")));
  assert.equal(manifest.name, marketplace.plugins[0].name);
  const pin = JSON.parse(await readFile(path.join(plugin, "engine.json")));
  pin.version = JSON.parse(await readFile(path.join(repository, "package.json"))).version;
  pin.url = `${baseURL}/engine.tgz`;
  pin.sha256 = createHash("sha256").update(archive).digest("hex");
  await writeFile(path.join(plugin, "engine.json"), JSON.stringify(pin));
  const runtime = path.join(project, "runtime data");
  const env = { ...process.env, VIEWRULE_CONFIG_DIR: globalDir,
    VIEWRULE_PLUGIN_DATA_DIR: runtime, CLAUDE_PLUGIN_ROOT: plugin };
  const run = (command, args, input = "") => new Promise((resolve, reject) => {
    const child = execFile(command, args, { cwd: project, env, timeout: 45000 }, (error, stdout, stderr) => {
      if (error && typeof error.code !== "number") return reject(error);
      resolve({ code: error?.code ?? 0, stdout, stderr });
    });
    child.stdin.end(input);
  });
  const cli = (args) => run(process.execPath, [path.join(plugin, "scripts/viewrule.mjs"), ...args]);
  const hookConfig = JSON.parse(await readFile(path.join(plugin, "hooks/hooks.json")));
  const hookCommand = hookConfig.hooks.Stop[0].hooks[0].command;
  const hook = async (extra = {}) => {
    const result = await run("/bin/sh", ["-c", hookCommand], JSON.stringify({ cwd: project, ...extra }));
    assert.equal(result.code, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  assert.deepEqual(await hook(), {}, "Unconfigured hook needs no engine");
  await writeFile(path.join(project, ".ui-review/config.json"), JSON.stringify({ enforceOnStop: true }));
  assert.match((await hook()).reason, /viewrule:setup/);
  assert.deepEqual(await hook({ stop_hook_active: true }), {}, "Continuation cannot loop on a missing engine");
  await rm(path.join(project, ".ui-review/config.json"));
  const rejected = await cli(["setup", "--skip-browser"]);
  assert.equal(rejected.code, 2);
  assert.match(rejected.stderr, /checksum mismatch/);
  assert.deepEqual(await readdir(runtime), [], "Rejected download leaves no partial install");
  corruptDownload = false;
  const setup = await cli(["setup", "--skip-browser"]);
  assert.equal(setup.code, 0, setup.stderr);
  assert.equal((await cli(["--version"])).stdout.trim(), pin.version);
  const docs = await cli(["docs"]);
  assert.equal(docs.code, 0, docs.stderr);
  assert.match(await readFile(JSON.parse(docs.stdout).policy, "utf8"), /DR-007/);
  const init = await cli(["init", "--url", baseURL]);
  assert.equal(init.code, 0, init.stderr);
  assert.equal(JSON.parse(await readFile(path.join(project, ".ui-review/config.json"))).enforceOnStop, false);
  assert.deepEqual(await hook(), {}, "Setup does not enable enforcement");
  const cfg = {
    ...config(baseURL),
    viewports: [{ name: "desktop", width: 1280, height: 800 }, { name: "4k", width: 3840, height: 2160 }],
    requiredDesignRules: ["DR-001", "DR-003", "DR-006", "DR-007"],
  };
  const density = {
    id: "density", type: "region-density", region: "viewport",
    selector: "tbody", measure: "boxes", minCoverage: 0.1, maxVerticalGap: 1600,
    severity: "error", reason: "Use the comparison workspace.",
  };
  await writeFile(path.join(project, ".ui-review/config.json"), JSON.stringify(cfg));
  await writeFile(path.join(project, ".ui-review/rules.json"), JSON.stringify([...rules, density, {
    id: "comparison", type: "comparison-set", selector: "tbody tr",
    keyAttribute: "data-comparison", requiredKeys: ["carrier-1", "carrier-2"],
    minVisibleByViewport: { desktop: 8, "4k": 12 }, preserveFrom: "desktop", minFontSize: 14,
    severity: "error", reason: "Keep alternatives visible and use the larger screen for additional carriers.",
  }, {
    id: "period", type: "consistent", selector: "table", keyAttribute: "data-measure",
    properties: [], attributes: ["data-period"], designRules: ["DR-001"],
    severity: "error", reason: "Resizing must preserve the reporting period.",
  }]));

  const bad = await cli(["check"]);
  assert.equal(bad.code, 1, bad.stderr);
  const badOutput = JSON.parse(bad.stdout);
  const badReport = JSON.parse(await readFile(badOutput.report));
  const wide = badReport.pages.find((page) => page.viewport.name === "4k");
  assert.ok(wide, bad.stdout);
  assert.ok(wide.findings.some((finding) => finding.designRules.includes("DR-001")));
  assert.ok(wide.findings.some((finding) => finding.message.includes("lost previously visible") && finding.actual.includes("carrier-8")));
  const blocked = await hook();
  assert.equal(blocked.decision, "block");
  assert.match(blocked.reason, /DR-007/);

  const note = await cli(["feedback", "--report", badOutput.report,
    "--decision", "adjust", "--note", "Give the comparison more of the viewport."]);
  assert.equal(note.code, 0, note.stderr);
  const ruleFile = path.join(project, "density-rule.json");
  await writeFile(ruleFile, JSON.stringify({ ...density, minCoverage: 0.12 }));
  const learned = await cli(["learn", "--feedback", JSON.parse(note.stdout).id, "--rule", ruleFile]);
  assert.equal(learned.code, 0, learned.stderr);
  const savedRules = JSON.parse(await readFile(path.join(project, ".ui-review/rules.json")));
  assert.equal(savedRules.find((rule) => rule.id === "density").feedbackId, JSON.parse(note.stdout).id);

  await writeFile(source, reviewHtml(false));
  const good = await cli(["check"]);
  assert.equal(good.code, 0, good.stderr || good.stdout);
  assert.deepEqual(await hook(), {});
  const output = JSON.parse(good.stdout);
  const report = JSON.parse(await readFile(output.report));
  const details = report.pages.find((page) => page.viewport.name === "4k").details;
  assert.equal(details.complete, true);
  const last = details.tiles.at(-1);
  assert.deepEqual([last.x + last.width, last.y + last.height], [3840, 2160]);
  const png = await readFile(path.join(path.dirname(output.report), last.file));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1024, 800]);
  assert.match(await readFile(output.html, "utf8"), /capture-1-detail-/);
  assert.equal(report.pages[0].designCoverage.find((rule) => rule.id === "DR-002").status, "unassessed");
  assert.match(await readFile(path.join(path.dirname(output.report), "design-rules.html"), "utf8"), /id="DR-007"/);

  const approval = await cli(["feedback", "--report", output.report,
    "--decision", "approve", "--note", "Fixture human feedback: this comparison layout works."]);
  assert.equal(approval.code, 0, approval.stderr);
  const approved = JSON.parse(approval.stdout);
  assert.equal(await readFile(path.join(project, ".ui-review", approved.reference, "report.json"), "utf8"),
    await readFile(output.report, "utf8"));

  await writeFile(source, reviewHtml(true));
  assert.equal((await hook()).decision, "block", "Source changes invalidate the passing review");
});

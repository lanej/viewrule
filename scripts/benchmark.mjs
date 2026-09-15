import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { access, cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { validateConfig, validateRules } from "../src/config.mjs";

const root = path.resolve(import.meta.dirname, "..");
const corpus = path.join(root, "benchmarks/analytical");
const output = path.join(root, "dist/benchmark");
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const cases = await json(path.join(corpus, "cases.json"));
const rules = await json(path.join(corpus, "rules.json"));
const html = await readFile(path.join(corpus, "page.html"), "utf8");
const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "wide", width: 3840, height: 2160 },
];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

function execute(command, args, cwd, env = {}) {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd,
        env: { ...process.env, ...env },
        timeout: 120000,
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error && (error.killed || typeof error.code !== "number"))
          return reject(error);
        resolve({
          code: error?.code ?? 0,
          stdout,
          stderr,
          elapsedMs: Math.round(performance.now() - started),
        });
      },
    );
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (
    url.pathname !== "/" ||
    !cases.some((item) => item.id === url.searchParams.get("case"))
  ) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
});
await new Promise((resolve) =>
  server.listen(0, "127.0.0.1", () => resolve(undefined)),
);
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Benchmark server did not start");
const baseURL = `http://127.0.0.1:${address.port}`;
try {
  const projects = [];
  for (const item of cases) {
    const project = path.join(output, item.id);
    await mkdir(path.join(project, ".ui-review"), { recursive: true });
    await cp(
      path.join(corpus, "checkpoint.mjs"),
      path.join(project, "checkpoint.mjs"),
    );
    await writeFile(path.join(project, "page.html"), html);
    const config = {
      version: 1,
      baseURL,
      sourcePaths: ["page.html", "checkpoint.mjs"],
      enforceOnStop: false,
      accessibility: true,
      detailCapture: { width: 1024, height: 800, overlap: 100, maxTiles: 20 },
      viewports,
      pages: [
        {
          name: item.id,
          path: `/?case=${item.id}`,
          ready: "#comparison tbody tr",
          ...(item.id === "after-filter"
            ? { checkpoints: [{ name: "filtered", setup: "checkpoint.mjs" }] }
            : {}),
        },
      ],
    };
    const scopedRules = structuredClone(rules);
    if (item.id === "finite-control") {
      scopedRules.find((rule) => rule.id === "alternatives").min = 4;
      scopedRules.find(
        (rule) => rule.id === "identities",
      ).minVisibleByViewport = { desktop: 4, wide: 4 };
    }
    validateConfig(config, project);
    validateRules(scopedRules);
    await writeFile(
      path.join(project, ".ui-review/config.json"),
      JSON.stringify(config, null, 2),
    );
    await writeFile(
      path.join(project, ".ui-review/rules.json"),
      JSON.stringify(scopedRules, null, 2),
    );
    projects.push({ item, project, config, rules: scopedRules });
  }
  if (process.argv.includes("--prepare")) {
    console.log(
      `Prepared and schema-validated ${projects.length} cases under dist/benchmark.`,
    );
  } else {
    const pkg = await json(path.join(root, "package.json"));
    const archive = path.join(root, "dist", `viewrule-${pkg.version}.tgz`);
    await access(archive); // npm test supplies the exact archive that passed the installed workflow.
    const browserPath =
      process.env.VIEWRULE_BROWSER_PATH || chromium.executablePath();
    await access(browserPath);
    const browser = await chromium.launch({ executablePath: browserPath });
    const browserVersion = browser.version();
    await browser.close();
    const require = createRequire(import.meta.url);
    const platform = { win32: "windows", darwin: "darwin", linux: "linux" }[
      process.platform
    ];
    const enginePackagePath = require.resolve(
      `@impeccable/cli-${platform}-${process.arch}/package.json`,
    );
    const enginePackage = await json(enginePackagePath);
    const engine = path.join(
      path.dirname(enginePackagePath),
      "bin",
      process.platform === "win32" ? "impeccable.exe" : "impeccable",
    );
    const engineVersion = await execute(engine, ["--version"], output);
    if (engineVersion.code !== 0) throw new Error(engineVersion.stderr);
    const runtime = path.join(output, "runtime");
    await mkdir(runtime, { recursive: true });
    const install = await execute(
      process.platform === "win32" ? "npm.cmd" : "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--prefix",
        runtime,
        archive,
      ],
      root,
    );
    if (install.code !== 0) throw new Error(install.stderr);
    const cli = path.join(runtime, "node_modules/viewrule/bin/viewrule.mjs");
    const globalDir = path.join(output, "global");
    await mkdir(globalDir, { recursive: true });
    const results = {
      version: 1,
      createdAt: new Date().toISOString(),
      scope:
        "Deterministic detectors; authored Viewrule contract versus Impeccable defaults. Not an agent-quality comparison.",
      provenance: {
        commit: (
          await execute("git", ["rev-parse", "HEAD"], root)
        ).stdout.trim(),
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        browserVersion,
        browserSHA256: sha256(await readFile(browserPath)),
        viewrule: {
          version: pkg.version,
          archiveSHA256: sha256(await readFile(archive)),
        },
        impeccable: {
          packageVersion: (
            await json(require.resolve("impeccable/package.json"))
          ).version,
          enginePackageVersion: enginePackage.version,
          reportedVersion: engineVersion.stdout.trim(),
          binarySHA256: sha256(await readFile(engine)),
        },
        inputs: {
          html: sha256(html),
          cases: sha256(await readFile(path.join(corpus, "cases.json"))),
          rules: sha256(await readFile(path.join(corpus, "rules.json"))),
          checkpoint: sha256(
            await readFile(path.join(corpus, "checkpoint.mjs")),
          ),
        },
        viewports,
        configuration:
          "Impeccable detect --no-config --json --viewport WxH URL; no rules suppressed. Same Chromium executable for both tools.",
      },
      runs: [],
      agentTrial: {
        status: "not-run",
        reason:
          "No isolated model/harness trial was executed. No claims about agent review or repair success.",
      },
    };
    for (const { item, project, config, rules: scopedRules } of projects) {
      const measured = await execute(
        process.execPath,
        [cli, "check", "--project", project],
        root,
        { VIEWRULE_CONFIG_DIR: globalDir, VIEWRULE_BROWSER_PATH: browserPath },
      );
      if (![0, 1].includes(measured.code))
        throw new Error(measured.stderr || measured.stdout);
      const report = await json(JSON.parse(measured.stdout).report);
      if (
        report.pages.some((page) =>
          page.findings.some((finding) =>
            [
              "browser-error",
              "review-error",
              "source-changed",
              "detail-coverage",
            ].includes(finding.rule),
          ),
        )
      )
        throw new Error(`Incomplete Viewrule capture for ${item.id}`);
      for (const page of report.pages) {
        const url = new URL(config.pages[0].path, baseURL);
        if (item.id === "after-filter")
          url.searchParams.set("checkpoint", "filtered");
        const args = [
          "detect",
          "--no-config",
          "--json",
          "--viewport",
          `${page.viewport.width}x${page.viewport.height}`,
          url.href,
        ];
        const detected = await execute(engine, args, project, {
          IMPECCABLE_BROWSER: browserPath,
        });
        if (![0, 2].includes(detected.code))
          throw new Error(
            `Impeccable operational failure for ${item.id}: ${detected.stderr}`,
          );
        const findings = JSON.parse(detected.stdout);
        if (!Array.isArray(findings))
          throw new Error("Unexpected Impeccable result schema");
        const expected = item.expectAt.includes(page.viewport.name);
        const seedFindings = page.findings.filter((finding) =>
          item.viewrule.includes(finding.rule),
        );
        if (
          Boolean(seedFindings.length) !== expected ||
          (!item.seed && page.findings.length)
        )
          throw new Error(
            `Fixture expectation mismatch: ${item.id}/${page.viewport.name}: ${JSON.stringify(page.findings)}`,
          );
        const entry = {
          case: item.id,
          viewport: page.viewport.name,
          checkpoint: page.checkpoint ?? "initial",
          seedPresent: expected,
          ruleConfigSHA256: sha256(JSON.stringify(scopedRules)),
          viewrule: {
            exitCode: measured.code,
            runElapsedMs: measured.elapsedMs,
            seedFindings: seedFindings.length,
            findings: page.findings,
            report: path.relative(output, JSON.parse(measured.stdout).report),
          },
          impeccable: {
            exitCode: detected.code,
            elapsedMs: detected.elapsedMs,
            findings: findings.map((finding) => ({
              ...finding,
              file: String(finding.file ?? "").replaceAll(
                baseURL,
                "http://benchmark.local",
              ),
            })),
            stderr: detected.stderr,
            candidateFindings: findings.filter((finding) =>
              item.impeccableCandidates.includes(finding.antipattern),
            ).length,
            adjudication:
              "unreviewed: candidate rule families are not a detection score",
          },
        };
        results.runs.push(entry);
        console.log(
          `${item.id}/${page.viewport.name}: seed=${expected}; Viewrule seed findings=${seedFindings.length}; Impeccable diagnostics=${findings.length}`,
        );
        await writeFile(
          path.join(output, "results.json"),
          JSON.stringify(results, null, 2) + "\n",
        );
      }
    }
    console.log(
      "Benchmark complete. Review dist/benchmark/results.json and raw reports before scoring unrelated findings.",
    );
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

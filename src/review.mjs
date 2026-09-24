import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile, realpath, copyFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { readJSON } from "./config.mjs";
import { readContract } from "./contract.mjs";
import { fingerprint, writeJSON, feedbackEntries } from "./state.mjs";
import { inspectPage } from "./checks.mjs";
import { inspectComposition } from "./composition.mjs";
import { compositionTypes } from "./composition-schema.mjs";
import {
  renderReport,
  renderDesignPolicy,
  renderProjectDocuments,
} from "./report.mjs";
import { captureDetails } from "./capture.mjs";
import { readDesignPolicy, evaluateDesign } from "./design.mjs";
import { defaultPreferences } from "./presets.mjs";
import { runCheckpoint } from "./checkpoints.mjs";
import { runSourceChecks, sourceSummary } from "./source-checks.mjs";
import { classifyChanges } from "./changes.mjs";
import { compareEvidence } from "./evidence-changes.mjs";
import { reviewStates, ruleApplies } from "./scopes.mjs";
import {
  executionPlan,
  executionSummary,
  configuredStateKey,
  reusePage,
  reuseProvider,
  captureManifest,
  evidenceAgeProblem,
} from "./incremental.mjs";
import { engineVersion, fileDigest } from "./fingerprints.mjs";
import { runtimeConfig } from "./runtime-url.mjs";

/** @param {string} project @param {string} globalDir @param {boolean} [incremental] @param {string} [explicitURL] */
export async function runReview(
  project,
  globalDir,
  incremental = false,
  explicitURL,
) {
  project = await realpath(project);
  const contract = await readContract(project, globalDir);
  const { config: contractConfig, rules } = contract;
  const { config, target } = runtimeConfig(contractConfig, explicitURL);
  const before = await fingerprint(
    project,
    config,
    globalDir,
    contract.projectDocuments,
  );
  const currentEngineVersion = await engineVersion();
  const plan = config.reviewScopes?.length
    ? await executionPlan(
        project,
        globalDir,
        { ...contract, config },
        incremental,
      )
    : null;
  const id =
    new Date().toISOString().replace(/[:.]/g, "-") +
    "-" +
    randomUUID().slice(0, 8);
  const dir = path.join(project, ".ui-review/runs", id);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeJSON(path.join(project, ".ui-review/latest.json"), {
    status: "running",
    engineVersion: currentEngineVersion,
    fingerprint: before,
    ...(contract.previousReportFile
      ? { reportFile: contract.previousReportFile }
      : {}),
  });
  /** @type {import("./types.js").ReviewReport} */
  const report = {
    version: 1,
    id,
    project,
    createdAt: new Date().toISOString(),
    targetBaseURL: target.baseURL,
    engineVersion: currentEngineVersion,
    fingerprint: before,
    contract,
    status: "fail",
    summary: { errors: 0, warnings: 0 },
    pages: [],
    sourceChecks: [],
    designPolicy: await readDesignPolicy(),
  };
  if (plan) report.execution = executionSummary(plan);
  for (const provider of config.sourceChecks ?? []) {
    if (provider.enabled === false) continue;
    const unit = plan?.units.find(
      (entry) => entry.kind === "provider" && entry.key === provider.id,
    );
    if (unit?.action === "reuse")
      report.sourceChecks.push(reuseProvider(plan, provider.id));
    else {
      const [result] = await runSourceChecks(project, [provider]);
      if (plan)
        result.evidence = {
          kind: "fresh",
          runId: id,
          createdAt: new Date().toISOString(),
        };
      report.sourceChecks.push(result);
    }
  }
  let browser;
  try {
    if (
      !plan ||
      plan.units.some((unit) => unit.kind === "page" && unit.action === "run")
    )
      browser = await chromium.launch({
        executablePath:
          plan?.executable ??
          (process.env.VIEWRULE_BROWSER_PATH ||
            process.env.UI_REVIEW_BROWSER_PATH ||
            undefined),
      });
    report.browserVersion =
      browser?.version() ?? plan?.cache.report?.browserVersion;
    for (const { page: pageConfig, viewport, checkpoint } of reviewStates(
      config,
    )) {
      const key = configuredStateKey({
        page: pageConfig,
        viewport,
        checkpoint,
      });
      if (
        plan?.units.some(
          (unit) =>
            unit.kind === "page" && unit.key === key && unit.action === "reuse",
        )
      ) {
        report.pages.push(
          await reusePage(plan, key, dir, report.pages.length + 1),
        );
        continue;
      }
      const url = new URL(pageConfig.path, config.baseURL).href;
      /** @type {import("./types.js").PageResult} */
      const result = {
        name: pageConfig.name,
        ...(checkpoint
          ? {
              checkpoint: checkpoint.name,
              checkpointSetup: checkpoint.setup,
            }
          : {}),
        url,
        viewport,
        findings: [],
        screenshot: null,
      };
      report.pages.push(result);
      let context;
      try {
        context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
          colorScheme: "light",
          storageState: config.storageState
            ? path.resolve(project, config.storageState)
            : undefined,
        });
        const page = await context.newPage();
        if (pageConfig.media)
          await page.emulateMedia({ media: pageConfig.media });
        page.setDefaultTimeout(config.timeoutMs ?? 15000);
        const response = await page.goto(url, { waitUntil: "load" });
        if (response && !response.ok())
          throw new Error(`HTTP ${response.status()}`);
        if (new URL(page.url()).origin !== new URL(url).origin)
          throw new Error(
            "Navigation left the configured origin; check authentication.",
          );
        await page
          .locator(pageConfig.ready)
          .first()
          .waitFor({ state: "visible" });
        if (checkpoint) await runCheckpoint(project, checkpoint, page, context);
        await page.evaluate(() => document.fonts.ready);
        if (pageConfig.textScale)
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${scale * 100}%`;
          }, pageConfig.textScale);
        await page.addStyleTag({
          content:
            "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        result.screenshot = `capture-${report.pages.length}.png`;
        await page.screenshot({
          path: path.join(dir, result.screenshot),
          fullPage: true,
          animations: "disabled",
        });
        result.details = await captureDetails(
          page,
          dir,
          `capture-${report.pages.length}`,
          config.detailCapture,
        );
        if (!result.details.complete)
          result.findings.push({
            rule: "detail-coverage",
            severity: "error",
            message: `Captured ${result.details.capturedTiles} of ${result.details.expectedTiles} detail tiles.`,
            reason:
              "Full-scale visual evidence is incomplete. Narrow the page state or increase detailCapture.maxTiles.",
          });
        const active = rules.filter((r) =>
          ruleApplies(r, pageConfig.name, viewport.name),
        );
        const inspection = await page.evaluate(inspectPage,
          active.filter((rule) => !compositionTypes.includes(rule.type)));
        const compositionRules = active.filter((rule) => compositionTypes.includes(rule.type));
        const composition = compositionRules.length
          ? await page.evaluate(inspectComposition, compositionRules)
          : { findings: [], metrics: [], evaluations: [] };
        result.findings.push(...inspection.findings, ...composition.findings);
        result.metrics = {
          ...inspection.metrics,
          composition: composition.metrics,
          evaluatedRules: inspection.metrics.evaluatedRules + compositionRules.length,
          evaluations: [...inspection.metrics.evaluations, ...composition.evaluations],
        };
        result.coverage = {
          layoutRules: active.map((r) => r.id),
          accessibility: config.accessibility,
        };
        if (config.accessibility) {
          const axe = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          for (const violation of axe.violations)
            for (const node of violation.nodes)
              result.findings.push({
                rule: `axe:${violation.id}`,
                severity: "error",
                selector: node.target.join(" "),
                message: violation.help,
                reason: node.failureSummary,
                actual: violation.impact,
                expected: "no automatically detectable violation",
              });
          result.accessibilityNeedsReview = axe.incomplete.map((v) => ({
            id: v.id,
            help: v.help,
            targets: v.nodes.map((n) => n.target),
          }));
        }
      } catch (err) {
        result.findings.push({
          rule: "review-error",
          severity: "error",
          selector: pageConfig.ready,
          message: err.message,
          reason: checkpoint
            ? `The ${checkpoint.name} checkpoint must complete before its state can be reviewed.`
            : "The page must render and be inspectable before a review can pass.",
        });
      } finally {
        await context?.close();
        if (plan)
          result.evidence = {
            kind: "fresh",
            runId: id,
            createdAt: new Date().toISOString(),
            browserVersion: report.browserVersion,
          };
      }
    }
  } catch (err) {
    report.pages.push({
      name: "Browser setup",
      url: config.baseURL,
      viewport: config.viewports[0],
      findings: [
        {
          rule: "browser-error",
          severity: "error",
          message: err.message,
          reason:
            "Check the browser error above. If the executable is missing, run viewrule install-browser. If browser launch is denied, use an environment with permission to launch Chromium and rerun the review.",
        },
      ],
    });
  } finally {
    await browser?.close();
  }
  const after = await fingerprint(project, config, globalDir);
  const afterContract = plan ? await readContract(project, globalDir) : null;
  if (
    before !== after ||
    (afterContract && afterContract.hash !== contract.hash)
  )
    report.pages[0].findings.push({
      rule: "source-changed",
      severity: "error",
      message:
        "Source, rules, project documents, or checkpoint setup changed during capture. Rerun the review.",
    });
  if (plan) {
    report.measurements = await captureManifest(report, plan, dir);
    report.execution.browser.executed = report.pages.filter(
      (page) => page.evidence?.kind === "fresh",
    ).length;
    report.execution.browser.reused = report.pages.filter(
      (page) => page.evidence?.kind === "reused",
    ).length;
    // An incomplete loop or lost artifact can never be aggregated into a pass.
    if (
      report.execution.browser.executed + report.execution.browser.reused !==
      report.execution.browser.required
    )
      report.pages[0].findings.push({
        rule: "review-coverage",
        severity: "error",
        message: "Not all required browser obligations were assessed.",
      });
  }
  evaluateDesign(report, rules, config);
  const sources = new Map(rules.map((rule) => [rule.id, rule.sources]));
  for (const page of report.pages)
    for (const f of page.findings) {
      if (sources.has(f.rule) && sources.get(f.rule))
        f.sources = sources.get(f.rule);
      report.summary[f.severity === "error" ? "errors" : "warnings"]++;
    }
  const sourceCounts = sourceSummary(report.sourceChecks ?? []);
  report.summary.errors += sourceCounts.errors;
  report.summary.warnings += sourceCounts.warnings;
  report.status = report.summary.errors ? "fail" : "pass";
  const feedback = await feedbackEntries(path.join(project, ".ui-review"));
  const approved = feedback.findLast(
    (e) => e.decision === "approve" && e.reference,
  );
  let reference;
  if (approved) {
    const refDir = path.join(project, ".ui-review", approved.reference);
    const refReport = await readJSON(path.join(refDir, "report.json"));
    reference = { report: refReport, note: approved.note };
    await mkdir(path.join(dir, "reference"));
    for (const p of refReport.pages)
      if (p.screenshot) {
        if (!/^capture-\d+\.png$/.test(p.screenshot))
          throw new Error("Invalid reference screenshot path");
        try {
          await copyFile(
            path.join(refDir, p.screenshot),
            path.join(dir, "reference", p.screenshot),
          );
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          p.screenshot = null;
        }
      }
  }
  const evidenceChanges = await compareEvidence(report, reference?.report, dir);
  const expired = plan && evidenceAgeProblem(report, config);
  if (expired) {
    report.pages[0].findings.push({
      rule: "evidence-expired",
      severity: "error",
      message: expired,
    });
    report.summary.errors++;
    report.status = "fail";
  }
  report.changes = classifyChanges(report, reference?.report);
  report.changes.evidence = evidenceChanges;
  const preferences = [
    ...(await defaultPreferences()),
    ...(await readJSON(path.join(globalDir, "preferences.json"), [])),
    ...(await feedbackEntries(globalDir)),
    ...feedback,
  ];
  const reportFile = path.join(dir, "report.json");
  await writeJSON(reportFile, report);
  await writeFile(
    path.join(dir, "design-rules.html"),
    renderDesignPolicy(report.designPolicy),
  );
  await writeFile(
    path.join(dir, "project-documents.html"),
    renderProjectDocuments(contract.projectDocuments),
  );
  await writeFile(
    path.join(dir, "index.html"),
    renderReport(report, preferences, reference),
  );
  await writeJSON(path.join(project, ".ui-review/latest.json"), {
    status: report.status,
    engineVersion: currentEngineVersion,
    fingerprint: before,
    reportFile,
    ...(plan ? { reportSHA256: await fileDigest(reportFile) } : {}),
    blockingFindings: [
      ...report.pages.flatMap((page) =>
        page.findings
          .filter((f) => f.severity === "error")
          .map(
            (f) =>
              `${f.designRules?.join(", ") || f.rule} · ${page.name}${page.checkpoint ? `/${page.checkpoint}` : ""}/${page.viewport.name}: ${f.message}`,
          ),
      ),
      ...(report.sourceChecks ?? []).flatMap((providerResult) =>
        providerResult.findings
          .filter(
            (finding) =>
              finding.sourceCheck?.authority === "blocking" &&
              finding.severity === "error",
          )
          .map((finding) => `${finding.rule}: ${finding.message}`),
      ),
    ].slice(0, 5),
  });
  return { report, reportFile };
}

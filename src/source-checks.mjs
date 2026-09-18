import { spawn } from "node:child_process";
import path from "node:path";
import { installedImpeccable } from "./impeccable.mjs";

function projectPath(project, value, label) {
  if (path.isAbsolute(value) || value.split(/[\\/]/).includes(".."))
    throw new Error(`${label} must stay inside the project`);
  const resolved = path.resolve(project, value);
  if (
    resolved !== path.resolve(project) &&
    !resolved.startsWith(path.resolve(project) + path.sep)
  )
    throw new Error(`${label} must stay inside the project`);
  return resolved;
}

function collect(command, args, options) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code, signal) =>
      resolve({
        code: code ?? 1,
        stdout,
        stderr: signal
          ? `${stderr}\nSource check terminated (${signal}).`
          : stderr,
        elapsedMs: Math.round(performance.now() - started),
      }),
    );
  });
}

function normalizeFinding(provider, raw, severityMap) {
  const sourceSeverity = String(raw.severity ?? "warning");
  return {
    rule: `source:${provider.id}:${raw.rule ?? "finding"}`,
    severity: severityMap[sourceSeverity] ?? "warning",
    message: String(raw.message ?? "Source check finding"),
    reason: raw.reason ? String(raw.reason) : undefined,
    selector: raw.file
      ? `${raw.file}${raw.line ? `:${raw.line}${raw.column ? `:${raw.column}` : ""}` : ""}`
      : undefined,
    actual: raw.actual,
    expected: raw.expected,
    suggestion: raw.suggestion ? String(raw.suggestion) : undefined,
    evidenceKind: "source-check",
    sourceCheck: {
      provider: provider.id,
      version: provider.version ?? null,
      authority: provider.authority,
      originalSeverity: sourceSeverity,
      rule: raw.rule ? String(raw.rule) : null,
    },
  };
}

function impeccableFinding(raw) {
  if (
    !raw ||
    typeof raw.antipattern !== "string" ||
    typeof raw.description !== "string"
  )
    throw new Error(
      "Impeccable returned a finding without antipattern/description",
    );
  return {
    rule: raw.antipattern,
    severity: raw.severity,
    message: raw.name || raw.antipattern,
    reason: raw.description,
    file: raw.file,
    line: raw.line,
    column: raw.column,
    actual: raw.snippet,
  };
}

/** Run configured source-check adapters. Providers are commands that emit JSON to stdout:
 * either an array of findings or { findings: [...] }. Exit 0 and 1 are accepted so
 * linters may use exit 1 to signal findings; empty/malformed output and provider
 * failures are errors. Clean scans must explicitly emit [] or { findings: [] }.
 * @param {string} project
 * @param {import("./types.js").SourceCheckProvider[] | undefined} providers */
export async function runSourceChecks(project, providers) {
  /** @type {(import("./types.js").SourceCheckResult)[]} */
  const results = [];
  for (const provider of providers ?? []) {
    if (provider.enabled === false) continue;
    const cwd = provider.cwd
      ? projectPath(project, provider.cwd, "Source-check cwd")
      : project;
    const bundled = provider.format === "impeccable" && !provider.command;
    const installed = bundled ? await installedImpeccable() : null;
    if (installed && provider.version && provider.version !== installed.version)
      throw new Error(
        `Source-check provider ${provider.id} requests Impeccable ${provider.version}, but Viewrule bundles ${installed.version}.`,
      );
    const invocation = bundled
      ? [
          installed.binary,
          "detect",
          "--json",
          ...(provider.noConfig ? ["--no-config"] : []),
          ...provider.targets.map((target) => {
            projectPath(cwd, target, "Impeccable target");
            return `.${path.sep}${target}`;
          }),
        ]
      : provider.command;
    const actualProvider = installed
      ? { ...provider, version: installed.version }
      : provider;
    const [command, ...args] = invocation;
    const execution = await collect(command, args, {
      cwd,
      env: { ...process.env, VIEWRULE_SOURCE_CHECK: provider.id },
      stdio: ["ignore", "pipe", "pipe"],
      ...(bundled ? { timeout: 30000, killSignal: "SIGKILL" } : {}),
    });
    const impeccable = provider.format === "impeccable";
    if (!(impeccable ? [0, 2] : [0, 1]).includes(execution.code))
      throw new Error(
        `Source-check provider ${provider.id} failed with exit ${execution.code}: ${execution.stderr.trim()}`,
      );
    if (!execution.stdout.trim())
      throw new Error(
        `Source-check provider ${provider.id} returned no JSON (exit ${execution.code}). Emit [] or { findings: [] } for a clean scan.`,
      );
    let parsed;
    try {
      parsed = JSON.parse(execution.stdout);
    } catch (error) {
      throw new Error(
        `Source-check provider ${provider.id} returned invalid JSON`,
        {
          cause: error,
        },
      );
    }
    const findings = Array.isArray(parsed)
      ? parsed
      : !impeccable && parsed?.findings;
    if (!Array.isArray(findings))
      throw new Error(
        `Source-check provider ${provider.id} must return an array or { findings: [] }`,
      );
    results.push({
      provider: {
        id: provider.id,
        version: actualProvider.version ?? null,
        ...(installed
          ? {
              engineVersion: installed.engineVersion,
              binarySHA256: installed.binarySHA256,
              targets: provider.targets,
              noConfig: provider.noConfig ?? false,
            }
          : {}),
        authority: provider.authority,
        command: invocation,
        cwd: provider.cwd ?? ".",
        format: provider.format ?? "viewrule",
      },
      execution,
      findings: findings.map((finding) =>
        normalizeFinding(
          actualProvider,
          impeccable ? impeccableFinding(finding) : finding,
          provider.severityMap ?? {},
        ),
      ),
    });
  }
  return results;
}

/** Same authority rules for source-only and rendered checks. */
export function sourceSummary(results) {
  const summary = { errors: 0, warnings: 0 };
  for (const result of results)
    for (const finding of result.findings)
      summary[
        finding.sourceCheck?.authority === "blocking" &&
        finding.severity === "error"
          ? "errors"
          : "warnings"
      ]++;
  return summary;
}

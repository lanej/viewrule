import { spawn } from "node:child_process";
import path from "node:path";

function projectPath(project, value, label) {
  if (path.isAbsolute(value) || value.split(/[\\/]/).includes(".."))
    throw new Error(`${label} must stay inside the project`);
  const resolved = path.resolve(project, value);
  if (!resolved.startsWith(path.resolve(project) + path.sep))
    throw new Error(`${label} must stay inside the project`);
  return resolved;
}

function collect(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
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

/** Run configured source-check adapters. Providers are commands that emit JSON to stdout:
 * either an array of findings or { findings: [...] }. Exit 0 and 1 are accepted so
 * linters may use exit 1 to signal findings; empty/malformed output and provider
 * failures are errors. Clean scans must explicitly emit [] or { findings: [] }.
 * @param {string} project
 * @param {import("./types.js").SourceCheckProvider[] | undefined} providers */
export async function runSourceChecks(project, providers) {
  const results = [];
  for (const provider of providers ?? []) {
    if (provider.enabled === false) continue;
    const cwd = provider.cwd
      ? projectPath(project, provider.cwd, "Source-check cwd")
      : project;
    const [command, ...args] = provider.command;
    const execution = await collect(command, args, {
      cwd,
      env: { ...process.env, VIEWRULE_SOURCE_CHECK: provider.id },
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (![0, 1].includes(execution.code))
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
    const findings = Array.isArray(parsed) ? parsed : parsed.findings;
    if (!Array.isArray(findings))
      throw new Error(
        `Source-check provider ${provider.id} must return an array or { findings: [] }`,
      );
    results.push({
      provider: {
        id: provider.id,
        version: provider.version ?? null,
        authority: provider.authority,
        command: provider.command,
      },
      findings: findings.map((finding) =>
        normalizeFinding(provider, finding, provider.severityMap ?? {}),
      ),
    });
  }
  return results;
}

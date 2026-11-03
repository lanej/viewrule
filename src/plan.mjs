import { executionPlan, configuredStateKey } from "./incremental.mjs";
import { readDesignPolicy } from "./design.mjs";
import { realpath } from "node:fs/promises";
import { loadProject } from "./config.mjs";
import { resolveSourceScope } from "./source-scope.mjs";
import {
  pathSelection,
  matches,
  reviewStates,
  ruleApplies,
} from "./scopes.mjs";
import { runtimeConfig } from "./runtime-url.mjs";

/** Read-only resolved obligations, not evidence, approval, or an incremental pass.
 * @param {string} project @param {string} globalDir @param {boolean} [incremental] @param {string} [explicitURL] */
export async function readPlan(
  project,
  globalDir,
  incremental = false,
  explicitURL,
) {
  project = await realpath(project);
  const {
    config: contractConfig,
    rules,
    projectDocuments,
  } = await loadProject(project, globalDir);
  const { config, target } = runtimeConfig(contractConfig, explicitURL);
  const sources = await resolveSourceScope(project, config);
  const plan = config.reviewScopes?.length
    ? await executionPlan(
        project,
        globalDir,
        {
          config,
          rules,
          projectDocuments,
          policySHA256: (await readDesignPolicy()).sha256,
        },
        incremental,
        sources,
      )
    : null;
  const documents = pathSelection(
    config.projectDocuments ?? ["DESIGN.md", "STYLE.md"],
  );
  const states = [...reviewStates(config)].map(
    ({ page, viewport, checkpoint }) => ({
      reason: page.viewports
        ? "Configured page and matching viewport selection."
        : "Configured page and all configured viewports.",
      ...((unit) =>
        unit
          ? { action: unit.action, reason: unit.reason, scopes: unit.scopes }
          : {})(
        plan?.units.find(
          (unit) =>
            unit.kind === "page" &&
            unit.key === configuredStateKey({ page, viewport, checkpoint }),
        ),
      ),
      page: page.name,
      path: page.path,
      viewport: viewport.name,
      checkpoint: checkpoint?.name ?? null,
      setup: checkpoint?.setup ?? null,
      rules: rules
        .filter((rule) => ruleApplies(rule, page.name, viewport.name))
        .map((rule) => rule.id)
        .sort(),
      accessibility: config.accessibility,
      selectionReason: page.viewports
        ? "Configured page and matching viewport selection."
        : "Configured page and all configured viewports.",
    }),
  );
  return {
    version: 1,
    project,
    target,
    execution: plan?.mode ?? "full",
    ...(plan
      ? {
          reviewScopes: plan.scopes,
          globalInputs: plan.globalInputs,
          globalDocuments: plan.globalDocuments,
        }
      : {}),
    evidence: "not-assessed",
    sources: {
      selection: pathSelection(config.sourcePaths),
      inventory: sources.inventory,
      unmatched: sources.unmatched,
      files: sources.files,
    },
    documents: projectDocuments.map((document) => ({
      path: document.path,
      role: document.role,
      sha256: document.sha256,
      reasons: documents.include
        .filter((pattern) => matches(document.path, pattern))
        .map((pattern) => `projectDocuments:${pattern}`),
    })),
    sourceChecks: sources.providers.map((provider) => ({
      ...provider,
      ...((unit) =>
        unit
          ? { action: unit.action, reason: unit.reason, scopes: unit.scopes }
          : {})(
        plan?.units.find(
          (unit) => unit.kind === "provider" && unit.key === provider.id,
        ),
      ),
    })),
    browser: {
      states,
      captureCount: states.filter((state) => state.action !== "reuse").length,
      requiredCount: states.length,
      reuseCount: states.filter((state) => state.action === "reuse").length,
    },
    notes: [
      "No browser or source provider was run; no review state was written.",
      plan
        ? "All obligations remain required. Unassigned obligations run; unowned inputs invalidate every scope. Reuse is conditional evidence, not a new capture or approval."
        : "No reviewScopes configured: all browser states run, including with --incremental.",
      "Freshness also includes configuration, rules, preferences, engine, design policy, and bundled-provider context candidates.",
    ],
  };
}

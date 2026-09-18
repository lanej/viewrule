import { realpath } from "node:fs/promises";
import { loadProject } from "./config.mjs";
import { resolveSourceScope } from "./source-scope.mjs";
import {
  pathSelection,
  matches,
  reviewStates,
  ruleApplies,
} from "./scopes.mjs";

/** Read-only resolved obligations, not evidence, approval, or an incremental pass.
 * @param {string} project @param {string} globalDir */
export async function readPlan(project, globalDir) {
  project = await realpath(project);
  const { config, rules, projectDocuments } = await loadProject(
    project,
    globalDir,
  );
  const sources = await resolveSourceScope(project, config);
  const documents = pathSelection(
    config.projectDocuments ?? ["DESIGN.md", "STYLE.md"],
  );
  const states = [...reviewStates(config)].map(
    ({ page, viewport, checkpoint }) => ({
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
      reason: page.viewports
        ? "Configured page and matching viewport selection."
        : "Configured page and all configured viewports.",
    }),
  );
  return {
    version: 1,
    project,
    execution: "full",
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
    sourceChecks: sources.providers,
    browser: { states, captureCount: states.length },
    notes: [
      "No browser or source provider was run; no review state was written.",
      "All configured browser states remain required. Source globs do not infer page dependencies or enable incremental execution.",
      "Freshness also includes configuration, rules, preferences, engine, design policy, and bundled-provider context candidates.",
    ],
  };
}

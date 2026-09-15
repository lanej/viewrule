import { Ajv } from "ajv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { designRuleIds } from "./policy-ids.mjs";
import { checkpointPath } from "./checkpoints.mjs";
import {
  readProjectDocuments,
  validateDocumentSources,
} from "./project-documents.mjs";

const text = { type: "string", minLength: 1 };
const names = { type: "array", minItems: 1, uniqueItems: true, items: text };
const positive = { type: "integer", minimum: 1 };
const designIds = {
  type: "array",
  uniqueItems: true,
  items: { enum: [...designRuleIds] },
};
const object = (properties, required) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});
const checkpointSchema = object({ name: text, setup: text }, ["name", "setup"]);
const sourceCheckSchema = object(
  {
    id: text,
    command: names,
    authority: { enum: ["advisory", "blocking"] },
    enabled: { type: "boolean" },
    version: text,
    cwd: text,
    severityMap: {
      type: "object",
      additionalProperties: { enum: ["error", "warning"] },
    },
  },
  ["id", "command", "authority"],
);
/** @type {import("ajv").Schema} */
export const configSchema = object(
  {
    version: { const: 1 },
    baseURL: text,
    enforceOnStop: { type: "boolean" },
    sourcePaths: names,
    accessibility: { type: "boolean" },
    projectDocuments: {
      type: "array",
      uniqueItems: true,
      maxItems: 32,
      items: text,
    },
    requiredDesignRules: designIds,
    sourceChecks: {
      type: "array",
      uniqueItems: true,
      items: sourceCheckSchema,
    },
    storageState: text,
    timeoutMs: { type: "integer", minimum: 1000, maximum: 120000 },
    detailCapture: object(
      {
        width: { type: "integer", minimum: 256, maximum: 1280 },
        height: { type: "integer", minimum: 256, maximum: 1280 },
        overlap: { type: "integer", minimum: 0, maximum: 128 },
        maxTiles: { type: "integer", minimum: 1, maximum: 256 },
      },
      ["width", "height", "overlap", "maxTiles"],
    ),
    pages: {
      type: "array",
      minItems: 1,
      items: object(
        {
          name: text,
          path: text,
          ready: text,
          media: { enum: ["screen", "print"] },
          textScale: { type: "number", minimum: 1, maximum: 4 },
          viewports: names,
          checkpoints: { type: "array", minItems: 1, items: checkpointSchema },
        },
        ["name", "path", "ready"],
      ),
    },
    viewports: {
      type: "array",
      minItems: 1,
      items: object({ name: text, width: positive, height: positive }, [
        "name",
        "width",
        "height",
      ]),
    },
  },
  [
    "version",
    "baseURL",
    "pages",
    "viewports",
    "sourcePaths",
    "enforceOnStop",
    "accessibility",
  ],
);
const common = {
  id: text,
  selector: text,
  severity: { enum: ["error", "warning"] },
  reason: text,
  pages: names,
  viewports: names,
  optional: { type: "boolean" },
  feedbackId: text,
  designRules: { ...designIds, minItems: 1 },
  sources: names,
};
const types = {
  "within-bounds": {
    container: text,
    tolerance: { type: "number", minimum: 0, maximum: 4 },
  },
  "required-elements": { required: names },
  "relative-position": {
    from: text,
    to: text,
    relation: { enum: ["left-of", "above"] },
    minGap: { type: "number", minimum: 0 },
    maxGap: { type: "number", minimum: 0 },
    tolerance: { type: "number", minimum: 0, maximum: 4 },
  },
  "reading-column": {
    container: text,
    maxWidth: { type: "number", exclusiveMinimum: 0 },
    tolerance: { type: "number", minimum: 0, maximum: 4 },
  },
  "vertical-order": {
    groups: {
      type: "array",
      minItems: 1,
      items: object({ selector: text, optional: { type: "boolean" } }, [
        "selector",
        "optional",
      ]),
    },
    tolerance: { type: "number", minimum: 0, maximum: 4 },
  },
  align: {
    edge: { enum: ["left", "right", "top", "bottom"] },
    tolerance: { type: "number", minimum: 0 },
  },
  "no-overlap": {},
  "no-clip": {},
  "visible-count": { min: positive },
  "max-height": { max: { type: "number", exclusiveMinimum: 0 } },
  "min-size": {
    minWidth: { type: "number", exclusiveMinimum: 0 },
    minHeight: { type: "number", exclusiveMinimum: 0 },
  },
  "min-font-size": { min: { type: "number", exclusiveMinimum: 0 } },
  "max-text-gap": { items: text, max: { type: "number", minimum: 0 } },
  "repeated-metric": {
    items: text,
    keyAttribute: text,
    requiredKeys: names,
    maxOccurrences: positive,
  },
  "evidence-proximity": {
    evidence: text,
    decision: text,
    maxDistance: { type: "number", minimum: 0 },
  },
  "mark-contrast": {
    substrate: text,
    minRatio: { type: "number", minimum: 1, maximum: 21 },
  },
  style: { property: text, allowed: names },
  attribute: { attribute: text, allowed: names },
  consistent: {
    keyAttribute: text,
    properties: { type: "array", uniqueItems: true, items: text },
    attributes: { type: "array", uniqueItems: true, items: text },
  },
  "comparison-set": {
    keyAttribute: text,
    requiredKeys: { type: "array", uniqueItems: true, items: text },
    minVisibleByViewport: {
      type: "object",
      minProperties: 1,
      additionalProperties: positive,
    },
    preserveFrom: text,
    minFontSize: { type: "number", exclusiveMinimum: 0 },
  },
  context: { required: names },
  "region-density": {
    region: text,
    measure: { enum: ["boxes", "text"] },
    minCoverage: { type: "number", minimum: 0, maximum: 1 },
    maxVerticalGap: { type: "number", minimum: 0 },
  },
};
const optionalFields = {
  consistent: {
    acrossPages: { type: "boolean" },
    compareSVG: { type: "boolean" },
  },
};
export const ruleSchema = {
  oneOf: Object.entries(types).map(([type, extra]) =>
    object(
      { ...common, type: { const: type }, ...extra, ...optionalFields[type] },
      ["id", "type", "selector", "severity", "reason", ...Object.keys(extra)],
    ),
  ),
};
const ajv = new Ajv({ allErrors: true });
/** @type {import("ajv").ValidateFunction<import("./types.js").ProjectConfig>} */
const checkConfig = ajv.compile(configSchema);
/** @type {import("ajv").ValidateFunction<import("./types.js").Rule[]>} */
const checkRules = ajv.compile({ type: "array", items: ruleSchema });
function unique(values, label) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}
export function validateConfig(config, project) {
  if (!checkConfig(config))
    throw new Error(`Invalid config: ${ajv.errorsText(checkConfig.errors)}`);
  const url = new URL(config.baseURL);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("baseURL must be HTTP(S) without embedded credentials");
  unique(
    config.pages.map((p) => p.name),
    "page name",
  );
  unique(
    config.viewports.map((v) => v.name),
    "viewport name",
  );
  unique(
    (config.sourceChecks ?? []).map((provider) => provider.id),
    "source-check provider ID",
  );
  for (const p of config.pages) {
    if (new URL(p.path, url).origin !== url.origin)
      throw new Error("Page paths must stay on baseURL origin");
    for (const name of p.viewports ?? [])
      if (!config.viewports.some((v) => v.name === name))
        throw new Error(`Page ${p.name}: unknown viewport ${name}`);
    unique(
      (p.checkpoints ?? []).map((c) => c.name),
      `checkpoint name on page ${p.name}`,
    );
    if (project)
      for (const checkpoint of p.checkpoints ?? [])
        checkpointPath(project, checkpoint.setup);
  }
  for (const p of config.sourcePaths)
    if (path.isAbsolute(p) || p.split(/[\\/]/).includes(".."))
      throw new Error("sourcePaths must stay inside the project");
  for (const provider of config.sourceChecks ?? [])
    if (
      provider.cwd &&
      (path.isAbsolute(provider.cwd) ||
        provider.cwd.split(/[\\/]/).includes(".."))
    )
      throw new Error("Source-check cwd must stay inside the project");
  return config;
}
export function validateRules(rules) {
  if (!checkRules(rules))
    throw new Error(`Invalid rules: ${ajv.errorsText(checkRules.errors)}`);
  unique(
    rules.map((r) => r.id),
    "rule ID",
  );
  for (const rule of rules)
    if (
      rule.type === "consistent" &&
      !rule.properties.length &&
      !rule.attributes.length &&
      !rule.compareSVG
    )
      throw new Error(
        `Rule ${rule.id}: choose a property, attribute, or SVG content to compare`,
      );
    else if (rule.type === "relative-position" && rule.minGap > rule.maxGap)
      throw new Error(`Rule ${rule.id}: minGap must not exceed maxGap`);
    else if (rule.type === "attribute" && !rule.designRules)
      throw new Error(
        `Rule ${rule.id}: attribute checks must cite designRules`,
      );
  return rules;
}
/** @param {import("./types.js").Rule[]} global @param {import("./types.js").Rule[]} local */
export function mergeRules(global, local) {
  validateRules(global);
  validateRules(local);
  return [...new Map([...global, ...local].map((r) => [r.id, r])).values()];
}
export async function readJSON(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT" && fallback !== undefined) return fallback;
    throw err;
  }
}
export async function loadProject(project, globalDir) {
  const config = validateConfig(
    await readJSON(path.join(project, ".ui-review/config.json")),
    project,
  );
  const local = await readJSON(path.join(project, ".ui-review/rules.json"), []);
  const rules = mergeRules(
    await readJSON(path.join(globalDir, "rules.json"), []),
    local,
  );
  validateRuleScopes(local, config);
  const projectDocuments = await readProjectDocuments(
    project,
    config.projectDocuments,
  );
  const active = rules.filter((rule) =>
    config.pages.some(
      (page) =>
        (!rule.pages || rule.pages.includes(page.name)) &&
        config.viewports.some(
          (viewport) =>
            (!page.viewports || page.viewports.includes(viewport.name)) &&
            (!rule.viewports || rule.viewports.includes(viewport.name)),
        ),
    ),
  );
  validateDocumentSources(active, projectDocuments);
  return { config, rules, projectDocuments };
}
/** @param {import("./types.js").Rule[]} rules @param {import("./types.js").ProjectConfig} config */
export function validateRuleScopes(rules, config) {
  for (const r of rules) {
    for (const n of r.pages ?? [])
      if (!config.pages.some((p) => p.name === n))
        throw new Error(`Rule ${r.id}: unknown page ${n}`);
    for (const n of r.viewports ?? [])
      if (!config.viewports.some((v) => v.name === n))
        throw new Error(`Rule ${r.id}: unknown viewport ${n}`);
    if (r.type === "comparison-set") {
      const active = config.viewports.filter(
        (v) => !r.viewports || r.viewports.includes(v.name),
      );
      if (!active.some((v) => v.name === r.preserveFrom))
        throw new Error(
          `Rule ${r.id}: preserveFrom must name an active viewport`,
        );
      for (const name of Object.keys(r.minVisibleByViewport))
        if (!active.some((v) => v.name === name))
          throw new Error(
            `Rule ${r.id}: count targets an inactive viewport ${name}`,
          );
      for (const v of active)
        if (!r.minVisibleByViewport[v.name])
          throw new Error(`Rule ${r.id}: missing visible count for ${v.name}`);
    }
  }
}

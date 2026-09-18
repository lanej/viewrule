import {
  pathSelection,
  selected,
  validateNames,
  localPattern,
  hasMagic,
} from "./scopes.mjs";

/** Explicit dependency declarations; never infer imports or rendered ownership.
 * @param {import("./types.js").ProjectConfig} config
 * @param {import("./types.js").ProjectDocument[]} [documents] */
export function validateReviewScopes(config, documents) {
  const scopes = config.reviewScopes ?? [];
  const names = scopes.map((scope) => scope.name);
  if (new Set(names).size !== names.length)
    throw new Error("Duplicate review scope name");
  for (const scope of scopes) {
    pathSelection(scope.sourcePaths);
    validateNames(
      scope.pages,
      config.pages.map((page) => page.name),
      `Review scope ${scope.name} pages`,
    );
    validateNames(
      scope.viewports,
      config.viewports.map((viewport) => viewport.name),
      `Review scope ${scope.name} viewports`,
    );
    if (scope.viewports && !scope.pages)
      throw new Error(`Review scope ${scope.name}: viewports require pages`);
    for (const name of scope.sourceChecks ?? [])
      if (
        !config.sourceChecks?.some(
          (provider) => provider.id === name && provider.enabled !== false,
        )
      )
        throw new Error(
          `Review scope ${scope.name}: unknown or disabled source provider ${name}`,
        );
    for (const dependency of scope.dependsOn ?? [])
      if (!names.includes(dependency))
        throw new Error(
          `Review scope ${scope.name}: unknown dependency ${dependency}`,
        );
    if (scope.documents) {
      const selection = pathSelection(scope.documents);
      if (documents)
        validateNames(
          selection,
          documents.map((document) => document.path),
          `Review scope ${scope.name} documents`,
        );
    }
    for (const value of scope.requiredDocuments ?? []) {
      const file = localPattern(value);
      if (hasMagic(file))
        throw new Error(
          `Review scope ${scope.name}: requiredDocuments must be exact paths`,
        );
      if (documents && !documents.some((document) => document.path === file))
        throw new Error(
          `Review scope ${scope.name}: missing required project document ${file}; load it through projectDocuments`,
        );
    }
  }
  // Validate even input-only scopes: their cycles would otherwise be latent.
  for (const scope of scopes) dependencyNames(scope.name, scopes);
}

/** @param {string} name @param {import("./types.js").ReviewScope[]} scopes */
export function dependencyNames(name, scopes) {
  const result = new Set();
  function visit(current, ancestors) {
    if (ancestors.includes(current))
      throw new Error(
        `Cyclic review scope dependency: ${[...ancestors, current].join(" -> ")}`,
      );
    if (result.has(current)) return;
    const scope = scopes.find((entry) => entry.name === current);
    if (!scope) throw new Error(`Unknown review scope dependency ${current}`);
    for (const dependency of scope.dependsOn ?? [])
      visit(dependency, [...ancestors, current]);
    result.add(current);
  }
  visit(name, []);
  return [...result].sort();
}

/** @param {import("./types.js").ReviewScope} scope @param {string} page @param {string} viewport */
export function ownsState(scope, page, viewport) {
  return (
    Boolean(scope.pages) &&
    selected(page, scope.pages) &&
    selected(viewport, scope.viewports)
  );
}

/** @param {import("./types.js").ReviewScope} scope @param {string} file */
export function ownsDocument(scope, file) {
  return (
    (scope.requiredDocuments ?? []).map(localPattern).includes(file) ||
    (Boolean(scope.documents) && selected(file, pathSelection(scope.documents)))
  );
}

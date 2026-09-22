/** Resolve machine-local application connectivity without making it a required
 * part of the committed review contract.
 * @param {import("./types.js").ProjectConfig} config
 * @param {string | undefined} explicitURL */
export function resolveReviewURL(config, explicitURL) {
  const candidates = [
    ["argument", explicitURL],
    ["environment", process.env.VIEWRULE_BASE_URL],
    ["config", config.baseURL],
  ];
  const selected = candidates.find(
    ([, value]) => typeof value === "string" && value.trim(),
  );
  if (!selected)
    throw new Error(
      "No application URL is available. Start the application and pass --url <actual-url>, set VIEWRULE_BASE_URL, or keep baseURL in .ui-review/config.json for legacy/static setups.",
    );
  const [source, raw] = selected;
  let url;
  try {
    url = new URL(raw.trim());
  } catch (error) {
    throw new Error(`Invalid application URL from ${source}: ${raw}`, {
      cause: error,
    });
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error(
      `Application URL must use http or https, not ${url.protocol}`,
    );
  return { baseURL: url.href, source };
}

/** Apply a resolved runtime URL without mutating the committed config snapshot.
 * @param {import("./types.js").ProjectConfig} config
 * @param {string | undefined} explicitURL */
export function runtimeConfig(config, explicitURL) {
  const target = resolveReviewURL(config, explicitURL);
  return { config: { ...config, baseURL: target.baseURL }, target };
}

import { readFile } from "node:fs/promises";
import { validateRules } from "./config.mjs";

export const presetNames = ["baseline", "analytical"];
const read = async (name) => JSON.parse(await readFile(new URL(`../presets/${name}.json`, import.meta.url), "utf8"));
export const defaultPreferences = () => read("preferences");

export async function presetRules(name = "baseline") {
  if (!presetNames.includes(name)) throw new Error(`Unknown preset ${name}; choose ${presetNames.join(" or ")}`);
  return validateRules([
    ...await read("baseline"),
    ...(name === "analytical" ? await read("analytical") : []),
  ]);
}

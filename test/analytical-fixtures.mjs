import { readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import Mustache from "mustache";

const template = readFileSync(
  new URL("./templates/analytical.html", import.meta.url),
  "utf8",
);
export const analyticalCSS = readFileSync(
  new URL("./react/analytical.css", import.meta.url),
  "utf8",
);
export const analyticalScript = buildSync({
  entryPoints: [new URL("./react/Comparison.jsx", import.meta.url).pathname],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
}).outputFiles[0].text;

// React is a fixture-only dependency. Both accepted layouts use the same contract.
export function analyticalHtml(state = "compact", annotations = "present") {
  if (!["broken", "compact", "sidebar", "stretched", "finite"].includes(state))
    throw new Error(`Unknown fixture ${state}`);
  return Mustache.render(template, { state, annotations });
}

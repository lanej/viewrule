import { readFileSync } from "node:fs";
import Mustache from "mustache";

const template = readFileSync(
  new URL("./templates/analytical.html", import.meta.url),
  "utf8",
);
export const analyticalScript = readFileSync(
  new URL("./templates/analytical.mjs", import.meta.url),
  "utf8",
);

// Deterministic examples of the shipped opinion, never fabricated human approvals.
export function analyticalHtml(state = "compact") {
  if (!["broken", "compact", "stretched", "finite"].includes(state))
    throw new Error(`Unknown fixture ${state}`);
  const rows = Array.from(
    { length: state === "finite" ? 4 : 12 },
    (_, index) => ({
      number: index + 1,
      cost: (5 + index / 10).toFixed(2),
      onTime: (98 - index / 10).toFixed(1),
    }),
  );
  return Mustache.render(template, { state, rows });
}

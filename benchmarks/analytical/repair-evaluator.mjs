// Held-out requirement checks: never imported into an agent's repair workspace.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const names = [
  "Aster",
  "Beacon",
  "Cedar",
  "Delta",
  "Elm",
  "Flint",
  "Grove",
  "Harbor",
  "Iris",
  "Juniper",
  "Kestrel",
  "Laurel",
];
const viewports = [
  { width: 1280, height: 900 },
  { width: 3840, height: 2160 },
];

/** Evaluate one frozen task using an already-launched browser. This does not run an agent. */
export async function evaluateRepair(
  browser,
  directory,
  count,
  evidenceDirectory,
) {
  const server = createServer(async (req, res) => {
    if (new URL(req.url, "http://localhost").pathname !== "/")
      return res.writeHead(404).end();
    try {
      res.setHeader("Content-Type", "text/html");
      res.end(await readFile(path.join(directory, "index.html")));
    } catch {
      res.writeHead(500).end("Task source unavailable");
    }
  });
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(undefined)),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Evaluator server failed");
  const url = `http://127.0.0.1:${address.port}`;
  if (evidenceDirectory) await mkdir(evidenceDirectory, { recursive: true });
  const observations = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        colorScheme: "light",
      });
      try {
        await context.route("**/*", (route) =>
          new URL(route.request().url()).origin === url
            ? route.continue()
            : route.abort(),
        );
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        await page.goto(url);
        await page.locator("#comparison tbody tr").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        for (const state of ["initial", "filtered"]) {
          if (state === "filtered") await page.locator("#apply-filter").click();
          const observed = await page.evaluate(() => {
            const visible = (el) => {
              if (
                !el ||
                !el.checkVisibility({
                  checkOpacity: true,
                  checkVisibilityCSS: true,
                })
              )
                return false;
              const r = el.getBoundingClientRect();
              return (
                r.width > 0 &&
                r.height > 0 &&
                r.left >= 0 &&
                r.top >= 0 &&
                r.right <= innerWidth &&
                r.bottom <= innerHeight
              );
            };
            const textBounds = (el) => {
              const range = document.createRange();
              range.selectNodeContents(el);
              return range.getBoundingClientRect();
            };
            const rows = [
              ...document.querySelectorAll("#comparison tbody tr"),
            ].map((row) => {
              const cells = [...row.querySelectorAll("td")];
              const label = row.querySelector(".service-label") || cells[0],
                values = cells.slice(1);
              const bounds = values.map(textBounds);
              return {
                key: row.getAttribute("data-key"),
                cells: [...row.querySelectorAll("td")].map((cell) =>
                  cell.textContent.trim(),
                ),
                visible: visible(row),
                rendered: row.checkVisibility({
                  checkOpacity: true,
                  checkVisibilityCSS: true,
                }),
                labelVisible: visible(label),
                clipped:
                  !label ||
                  label.scrollWidth > label.clientWidth + 1 ||
                  textBounds(label).width >
                    label.getBoundingClientRect().width + 1,
                minFont: Math.min(
                  ...[label, ...values]
                    .filter(Boolean)
                    .map((el) => parseFloat(getComputedStyle(el).fontSize)),
                ),
                maxGap: Math.max(
                  0,
                  ...bounds.slice(1).map((r, i) => r.left - bounds[i].right),
                ),
              };
            });
            const period = document.querySelector(".period");
            return {
              rows,
              state: document.body.dataset.state,
              period: period?.textContent.trim(),
              periodVisible: visible(period),
            };
          });
          const failures = [];
          const expected = names.slice(0, count).map((name, i) => ({
            key: `carrier-${i + 1}`,
            cells: [
              `${name} Ground / ${i % 2 ? "Economy" : "Priority"}`,
              `$${(7 + i * 0.23).toFixed(2)}`,
              `${2 + (i % 3)}`,
              `${(98 - i * 0.1).toFixed(1)}%`,
            ],
          }));
          if (
            JSON.stringify(
              observed.rows
                .map(({ key, cells }) => ({ key, cells }))
                .sort((a, b) => String(a.key).localeCompare(String(b.key))),
            ) !==
            JSON.stringify(
              expected.sort((a, b) =>
                String(a.key).localeCompare(String(b.key)),
              ),
            )
          )
            failures.push("preserved-data-and-identities");
          const visible = observed.rows.filter((row) => row.visible);
          const rendered = observed.rows.filter((row) => row.rendered);
          if (visible.length < Math.min(8, count))
            failures.push("initial-alternatives");
          if (
            !observed.periodVisible ||
            !observed.period?.includes("15 September 2026") ||
            !observed.period?.includes("USD per parcel")
          )
            failures.push("reporting-context");
          if (
            rendered.some((row) => row.clipped) ||
            visible.some((row) => !row.labelVisible)
          )
            failures.push("complete-labels");
          if (rendered.some((row) => row.minFont < 16))
            failures.push("readable-type");
          if (rendered.some((row) => row.maxGap > 150))
            failures.push("related-values");
          if (observed.state !== state) failures.push("filter-behavior");
          const desktop = observations.find(
            (item) => item.viewport.width === 1280 && item.state === state,
          );
          if (
            desktop &&
            desktop.visibleKeys.some(
              (key) => !visible.some((row) => row.key === key),
            )
          )
            failures.push("cross-viewport-identities");
          const screenshot = evidenceDirectory
            ? `${viewport.width}-${state}.png`
            : null;
          if (screenshot)
            await page.screenshot({
              path: path.join(evidenceDirectory, screenshot),
              fullPage: true,
              animations: "disabled",
            });
          observations.push({
            viewport,
            state,
            failures,
            visibleKeys: visible.map((row) => row.key),
            observed,
            screenshot,
          });
        }
      } catch (error) {
        observations.push({
          viewport,
          state: "unavailable",
          failures: ["evaluation-unavailable"],
          reason: error.message,
          visibleKeys: [],
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  return {
    passed:
      observations.length === 4 &&
      observations.every((item) => item.failures.length === 0),
    observations,
  };
}

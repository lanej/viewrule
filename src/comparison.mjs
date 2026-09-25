import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rename,
  rm,
  realpath,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { Ajv } from "ajv";
import { PNG } from "pngjs";
import Mustache from "mustache";
import { compareContracts } from "./contract.mjs";

const text = { type: "string", minLength: 1, maxLength: 4000 };
const object = (properties, required) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});
/** @type {import("ajv").Schema} */
export const annotationsSchema = object(
  {
    version: { const: 1 },
    title: text,
    summary: text,
    callouts: {
      type: "array",
      maxItems: 32,
      items: object(
        { page: text, region: text, title: text, interpretation: text },
        ["page", "region", "title", "interpretation"],
      ),
    },
  },
  ["version", "title", "callouts"],
);
const ajv = new Ajv();
/** @type {import("ajv").ValidateFunction<import("./types.js").ComparisonAnnotations>} */
const validateAnnotations = ajv.compile(annotationsSchema);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stateKey = (p) =>
  JSON.stringify([
    p.name,
    p.checkpoint ?? null,
    p.viewport.name,
    p.viewport.width,
    p.viewport.height,
  ]);
const signature = (report, page) => {
  const config = report.contract?.config?.pages?.find(
    (p) => p.name === page.name,
  );
  if (!config) return null;
  return JSON.stringify([
    page.url,
    page.checkpointSetup ?? null,
    config?.ready,
    config?.media ?? "screen",
    config?.textScale ?? 1,
  ]);
};
const format = (number) =>
  number.toLocaleString("en-US", { maximumFractionDigits: 3 });

async function loadReport(file) {
  const location = await realpath(file);
  if ((await lstat(location)).size > 32 * 1024 * 1024)
    throw new Error("Report exceeds 32 MiB.");
  const bytes = await readFile(location);
  const report = JSON.parse(bytes.toString());
  if (
    report.version !== 1 ||
    typeof report.id !== "string" ||
    !Number.isFinite(Date.parse(report.createdAt)) ||
    !Array.isArray(report.pages) ||
    !report.pages.length ||
    report.pages.length > 256
  )
    throw new Error(
      "Expected a version 1 saved review with dated page evidence.",
    );
  const keys = new Set();
  for (const p of report.pages) {
    if (
      typeof p.name !== "string" ||
      typeof p.url !== "string" ||
      typeof p.viewport?.name !== "string" ||
      ![p.viewport.width, p.viewport.height].every(
        (v) => Number.isInteger(v) && v > 0,
      ) ||
      !Array.isArray(p.findings)
    )
      throw new Error("Invalid saved page identity, viewport, or findings.");
    const key = stateKey(p);
    if (keys.has(key))
      throw new Error(
        "Saved review has duplicate page/checkpoint/viewport identities.",
      );
    keys.add(key);
  }
  return {
    report,
    bytes,
    directory: path.dirname(location),
    sha256: sha256(bytes),
  };
}

function contractComparison(before, after) {
  const valid = (r) =>
    r.contract?.config &&
    Array.isArray(r.contract?.rules) &&
    typeof r.contract?.policySHA256 === "string";
  if (!valid(before) || !valid(after))
    return {
      comparable: false,
      reason: "A saved contract is unavailable.",
      changes: null,
    };
  const changes = compareContracts(after.contract, before.contract);
  const comparable =
    !changes.configurationChange &&
    !changes.policyChanged &&
    !changes.changes.length &&
    changes.documentComparison === "available" &&
    !changes.documentChanges.length;
  return {
    comparable,
    reason: comparable
      ? "Rules, configuration, policy, and saved design documents are unchanged."
      : "Rules, configuration, policy, or design documents changed or were not recorded.",
    changes,
  };
}

function gaps(before, after, a, b, contract) {
  const reasons = [];
  if (!a || !b)
    return ["Page, checkpoint, or viewport is absent from one review."];
  if (!contract.comparable) reasons.push(contract.reason);
  if (!before.engineVersion || before.engineVersion !== after.engineVersion)
    reasons.push("Engine versions differ or were not recorded.");
  if (!before.browserVersion || before.browserVersion !== after.browserVersion)
    reasons.push("Browser versions differ or were not recorded.");
  if (!signature(before, a) || signature(before, a) !== signature(after, b))
    reasons.push(
      "URL, readiness, media, text scale, or checkpoint setup differs.",
    );
  if (
    [a, b].some(
      (p) =>
        !p.coverage ||
        !p.details?.complete ||
        p.details.scale !== 1 ||
        !p.details.expectedTiles ||
        p.details.capturedTiles !== p.details.expectedTiles ||
        p.details.tiles?.length !== p.details.expectedTiles ||
        p.findings.some((f) =>
          [
            "review-error",
            "browser-error",
            "source-changed",
            "evidence-expired",
          ].includes(f.rule),
        ),
    )
  )
    reasons.push(
      "A capture is incomplete, failed, or lacks recorded coverage.",
    );
  if (
    [before, after].some((r) =>
      r.pages.some((p) => p.findings.some((f) => f.rule === "source-changed")),
    )
  )
    reasons.push("Source changed during a saved review.");
  if (
    b.evidence?.kind === "reused" &&
    (!Number.isFinite(Date.parse(b.evidence.createdAt)) ||
      Date.parse(b.evidence.createdAt) < Date.parse(before.createdAt))
  )
    reasons.push(
      "Reused after evidence predates the before review or has no valid capture date.",
    );
  return reasons;
}

// Reading is confined to the saved run, including real symlink destinations.
async function preserveRun(input, directory, side, manifest) {
  await mkdir(path.join(directory, side));
  await writeFile(path.join(directory, side, "report.json"), input.bytes);
  manifest.push({ file: `${side}/report.json`, sha256: input.sha256 });
  const copies = new Map();
  let total = 0;
  async function capture(file) {
    if (copies.has(file)) return copies.get(file);
    const result = {
      file: null,
      width: 0,
      height: 0,
      sha256: null,
      reason: "",
    };
    copies.set(file, result);
    try {
      if (
        typeof file !== "string" ||
        !/^capture-\d+(?:-detail-\d+)?\.png$/.test(file)
      )
        throw new Error("Capture is missing or has an invalid path.");
      const source = await realpath(path.join(input.directory, file));
      if (!source.startsWith(input.directory + path.sep))
        throw new Error("Capture symlink leaves the saved run.");
      const info = await lstat(source);
      if (
        !info.isFile() ||
        info.size > 32 * 1024 * 1024 ||
        total + info.size > 512 * 1024 * 1024
      )
        throw new Error("Capture exceeds the file or run size limit.");
      const bytes = await readFile(source);
      if (
        bytes.length < 24 ||
        !bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > 24000000
      )
        throw new Error(
          "Capture is not a supported PNG (limit: 24 million pixels).",
        );
      const png = PNG.sync.read(bytes);
      await writeFile(path.join(directory, side, file), bytes);
      total += bytes.length;
      Object.assign(result, {
        file: `${side}/${file}`,
        width: png.width,
        height: png.height,
        sha256: sha256(bytes),
      });
      manifest.push({ file: result.file, sha256: result.sha256 });
    } catch (error) {
      result.reason =
        error.code === "ENOENT" ? "Capture file is missing." : error.message;
    }
    return result;
  }
  const pages = new Map();
  for (const p of input.report.pages) {
    const overview = await capture(p.screenshot);
    const details = [];
    for (const tile of p.details?.tiles ?? [])
      details.push(await capture(tile.file));
    pages.set(stateKey(p), { overview, details });
  }
  return pages;
}

function regionBox(page, id, image) {
  if (
    image?.file &&
    (image.width !== page?.details?.width ||
      image.height !== page?.details?.height)
  )
    return {
      reason:
        "PNG dimensions do not match the recorded CSS capture dimensions.",
    };
  const regions = page?.captureRegions?.filter((r) => r.id === id) ?? [];
  const region = regions[0];
  if (regions.length !== 1 || !region?.box || !image?.file)
    return {
      reason:
        region?.reason || "Region geometry or original capture is unavailable.",
    };
  const { x, y, width, height } = region.box;
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > image.width + 1 ||
    y + height > image.height + 1
  )
    return {
      reason: "Region is outside its saved capture or has invalid geometry.",
    };
  return {
    ...region,
    style: `left:${(x / image.width) * 100}%;top:${(y / image.height) * 100}%;width:${(width / image.width) * 100}%;height:${(height / image.height) * 100}%`,
  };
}

function measurement(label, unit, a, b, comparable) {
  const available = Number.isFinite(a) && Number.isFinite(b) && comparable;
  return {
    label,
    unit,
    values: {
      before: Number.isFinite(a) ? a : null,
      after: Number.isFinite(b) ? b : null,
      delta: available ? b - a : null,
    },
    before: Number.isFinite(a) ? format(a) : "Unavailable",
    after: Number.isFinite(b) ? format(b) : "Unavailable",
    delta: available
      ? `${b - a > 0 ? "+" : ""}${format(b - a)}`
      : "Not compared",
  };
}

function compositionMeasurements(a, b, comparable) {
  const kinds = {
    "alignment-residual": ["maxResidual", "Maximum anchor residual", "CSS px"],
    "gap-variance": ["coefficientOfVariation", "Gap variation", "CV"],
    "peer-footprint": [
      "coefficientOfVariation",
      "Peer footprint variation",
      "CV",
    ],
    "chrome-allocation": ["ratio", "Chrome allocation", "ratio"],
  };
  const rows = [];
  const first = a?.metrics?.composition ?? [],
    last = b?.metrics?.composition ?? [];
  for (const id of new Set([...first, ...last].map((m) => m.rule))) {
    const aa = first.filter((m) => m.rule === id),
      bb = last.filter((m) => m.rule === id);
    const left = aa[0],
      right = bb[0],
      kind = kinds[(right || left).type];
    if (!kind) continue;
    const [field, label, unit] = kind;
    const usable = (entries) =>
      entries.length === 1 && entries[0].valid === true
        ? entries[0][field]
        : null;
    rows.push(
      measurement(
        `${id} · ${label}`,
        unit,
        usable(aa),
        usable(bb),
        comparable &&
          left?.element === right?.element &&
          left?.type === right?.type &&
          left?.measure === right?.measure,
      ),
    );
  }
  const oldGrowth = a?.metrics?.growth ?? [],
    newGrowth = b?.metrics?.growth ?? [];
  for (const id of new Set([...oldGrowth, ...newGrowth].map((m) => m.rule))) {
    const aa = oldGrowth.filter((m) => m.rule === id),
      bb = newGrowth.filter((m) => m.rule === id);
    const measured = (entries) =>
      entries.length === 1 &&
      entries[0].valid &&
      entries[0].comparison?.status === "measured";
    const left = aa[0],
      right = bb[0];
    const row = measurement(
      `${id} · Viewport-growth yield`,
      "ratio",
      measured(aa) ? left.comparison.yield : null,
      measured(bb) ? right.comparison.yield : null,
      comparable &&
        left?.comparison?.referenceViewport ===
          right?.comparison?.referenceViewport,
    );
    const status = (entries) =>
      entries.length === 1 &&
      entries[0].valid &&
      entries[0].comparison?.status !== "measured"
        ? entries[0].comparison?.status || "Unavailable"
        : "Unavailable";
    if (!measured(aa)) row.before = status(aa);
    if (!measured(bb)) row.after = status(bb);
    rows.push(row);
  }
  return rows;
}

/** Compare explicit saved runs; never write approval, latest state, or source evidence. */
export async function compareReviews(
  beforeFile,
  afterFile,
  output,
  annotationsFile,
  exportImages = false,
) {
  const [before, after] = await Promise.all([
    loadReport(beforeFile),
    loadReport(afterFile),
  ]);
  if (Date.parse(after.report.createdAt) < Date.parse(before.report.createdAt))
    throw new Error("After review predates before review.");
  const annotations = annotationsFile
    ? JSON.parse(await readFile(annotationsFile, "utf8"))
    : { version: 1, title: "Saved review comparison", callouts: [] };
  if (!validateAnnotations(annotations))
    throw new Error(
      `Invalid annotations: ${ajv.errorsText(validateAnnotations.errors)}`,
    );
  const annotationKeys = new Set();
  for (const callout of annotations.callouts) {
    const key = JSON.stringify([callout.page, callout.region]);
    if (annotationKeys.has(key))
      throw new Error("Duplicate annotation page/region.");
    annotationKeys.add(key);
    if (
      ![...before.report.pages, ...after.report.pages].some(
        (p) =>
          p.name === callout.page &&
          p.captureRegions?.some((r) => r.id === callout.region),
      )
    )
      throw new Error(
        `Annotation region was never recorded: ${callout.page}/${callout.region}`,
      );
  }
  output = path.resolve(output);
  output = path.join(
    await realpath(path.dirname(output)),
    path.basename(output),
  );
  if (
    [before, after].some(
      (input) =>
        output === input.directory ||
        output.startsWith(input.directory + path.sep),
    )
  )
    throw new Error("Comparison output must be outside both saved runs.");
  try {
    await lstat(output);
    throw new Error(
      "Comparison output already exists; choose a new directory.",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const temporary = await mkdtemp(
    path.join(path.dirname(output), ".viewrule-compare-"),
  );
  try {
    const artifacts = [];
    const oldImages = await preserveRun(before, temporary, "before", artifacts);
    const newImages = await preserveRun(after, temporary, "after", artifacts);
    const contract = contractComparison(before.report, after.report);
    const previous = new Map(before.report.pages.map((p) => [stateKey(p), p]));
    const current = new Map(after.report.pages.map((p) => [stateKey(p), p]));
    const states = [];
    for (const key of new Set([...previous.keys(), ...current.keys()])) {
      const a = previous.get(key),
        b = current.get(key),
        page = b || a;
      const old = oldImages.get(key),
        now = newImages.get(key);
      const reasons = gaps(before.report, after.report, a, b, contract);
      for (const [side, images] of [
        ["Before", old],
        ["After", now],
      ]) {
        if (!images?.overview.file)
          reasons.push(`${side}: ${images?.overview.reason || "No capture."}`);
        if (images?.details.some((d) => !d.file))
          reasons.push(`${side}: a detail capture is unavailable.`);
      }
      for (const [p, saved] of [
        [a, old],
        [b, now],
      ])
        if (
          saved?.overview.file &&
          (saved.overview.width !== p.details?.width ||
            saved.overview.height !== p.details?.height)
        )
          reasons.push(
            "PNG dimensions do not match the recorded CSS capture dimensions.",
          );
      const comparable = reasons.length === 0;
      const width = Math.max(
        old?.overview.width || 1,
        now?.overview.width || 1,
      );
      const height = Math.max(
        old?.overview.height || 1,
        now?.overview.height || 1,
      );
      const sideView = (p, saved, name) => ({
        name,
        image: saved?.overview.file,
        reason: saved?.overview.reason || "No capture.",
        width: saved?.overview.width || 0,
        height: saved?.overview.height || 0,
        scale: ((saved?.overview.width || width) / width) * 100,
        aspect: width / height,
        canvasWidth: width,
        overlays: [],
        findings: (p?.findings ?? []).map((f) => ({
          rule: f.rule,
          message: f.message,
          actual: JSON.stringify(f.actual),
          expected: JSON.stringify(f.expected),
        })),
      });
      const sides = [sideView(a, old, "Before"), sideView(b, now, "After")];
      const callouts = [];
      const ids = new Set(
        [...(a?.captureRegions ?? []), ...(b?.captureRegions ?? [])].map(
          (r) => r.id,
        ),
      );
      for (const id of ids) {
        const note = annotations.callouts.find(
          (n) => n.page === page.name && n.region === id,
        );
        const left = regionBox(a, id, old?.overview),
          right = regionBox(b, id, now?.overview);
        const number = callouts.length + 1;
        for (const [index, region] of [left, right].entries())
          if (region.box)
            sides[index].overlays.push({
              number,
              title: note?.title || id,
              style: region.style,
            });
        const regionComparable =
          comparable &&
          left.selector === right.selector &&
          Boolean(left.box && right.box);
        callouts.push({
          number,
          id,
          title: note?.title || id,
          interpretation:
            note?.interpretation || "No authored interpretation supplied.",
          reason: [
            left.reason && `Before: ${left.reason}`,
            right.reason && `After: ${right.reason}`,
            left.selector !== right.selector && "Region selectors differ.",
          ]
            .filter(Boolean)
            .join(" "),
          measurements: [
            measurement(
              "Width",
              "CSS px",
              left.box?.width,
              right.box?.width,
              regionComparable,
            ),
            measurement(
              "Height",
              "CSS px",
              left.box?.height,
              right.box?.height,
              regionComparable,
            ),
          ],
        });
      }
      states.push({
        number: states.length + 1,
        page: page.name,
        checkpoint: page.checkpoint ?? null,
        viewport: page.viewport,
        comparable,
        identicalImages: Boolean(
          old?.overview.sha256 && old.overview.sha256 === now?.overview.sha256,
        ),
        reasons,
        sides,
        callouts,
        measurements: compositionMeasurements(a, b, comparable),
      });
    }
    const result = {
      version: 1,
      title: annotations.title,
      summary: annotations.summary,
      before: {
        id: before.report.id,
        createdAt: before.report.createdAt,
        sha256: before.sha256,
      },
      after: {
        id: after.report.id,
        createdAt: after.report.createdAt,
        sha256: after.sha256,
      },
      contract,
      states,
      artifacts,
    };
    await writeFile(
      path.join(temporary, "annotations.json"),
      JSON.stringify(annotations, null, 2) + "\n",
    );
    await writeFile(
      path.join(temporary, "comparison.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    const template = await readFile(
      new URL("./templates/comparison.html", import.meta.url),
      "utf8",
    );
    await writeFile(
      path.join(temporary, "index.html"),
      Mustache.render(template, result),
    );
    if (exportImages) {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({
        executablePath:
          process.env.VIEWRULE_BROWSER_PATH ||
          process.env.UI_REVIEW_BROWSER_PATH ||
          undefined,
      });
      try {
        const page = await browser.newPage({
          viewport: { width: 1800, height: 1100 },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        await page.route("**/*", (route) =>
          route
            .request()
            .url()
            .startsWith(pathToFileURL(temporary + path.sep).href)
            ? route.continue()
            : route.abort(),
        );
        await page.goto(pathToFileURL(path.join(temporary, "index.html")).href);
        await page.evaluate(() =>
          Promise.all(Array.from(document.images, (img) => img.decode())),
        );
        for (const state of states)
          await page.locator(`#state-${state.number}`).screenshot({
            path: path.join(temporary, `comparison-${state.number}.png`),
            animations: "disabled",
          });
      } finally {
        await browser.close();
      }
    }
    // A preexisting destination is never replaced, including concurrent writers.
    await mkdir(output);
    try {
      const { readdir } = await import("node:fs/promises");
      for (const entry of await readdir(temporary))
        await rename(path.join(temporary, entry), path.join(output, entry));
    } catch (error) {
      await rm(output, { recursive: true, force: true });
      throw error;
    }
    return {
      html: path.join(output, "index.html"),
      comparison: path.join(output, "comparison.json"),
      states: states.length,
      notCompared: states.filter((s) => !s.comparable).length,
      images: exportImages
        ? states.map((s) => path.join(output, `comparison-${s.number}.png`))
        : [],
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

// Evidence navigation only. These thresholds never create or waive violations.
export const evidenceMethod = {
  version: 1,
  channelThreshold: 24,
  cellSize: 32,
  minimumCellPixels: 4,
  minimumRegionPixels: 64,
  maxRegions: 32,
  maxPixels: 24000000,
};

const key = (page) =>
  JSON.stringify([
    page.name,
    page.checkpoint ?? null,
    page.viewport.name,
    page.viewport.width,
    page.viewport.height,
  ]);
const settings = (report, page) => {
  const configured = report.contract?.config.pages.find(
    (p) => p.name === page.name,
  );
  return JSON.stringify([
    page.url,
    page.checkpointSetup ?? null,
    configured?.ready,
    configured?.media ?? "screen",
    configured?.textScale ?? 1,
  ]);
};

async function readCapture(directory, file) {
  if (!/^(reference\/)?capture-\d+\.png$/.test(file || ""))
    throw new Error("Capture is missing or has an invalid path.");
  const target = path.join(directory, file);
  if ((await stat(target)).size > 32 * 1024 * 1024)
    throw new Error("Encoded capture exceeds the 32 MiB comparison limit.");
  const bytes = await readFile(target);
  if (
    bytes.length < 24 ||
    bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > evidenceMethod.maxPixels
  )
    throw new Error("Capture exceeds the 24 million pixel comparison limit.");
  return PNG.sync.read(bytes);
}

function regions(before, after) {
  const { width, height } = before;
  const size = evidenceMethod.cellSize;
  const columns = Math.ceil(width / size),
    rows = Math.ceil(height / size);
  const cells = new Uint32Array(columns * rows);
  let changedPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      let changed = false;
      // Composite transparent pixels over white before comparing displayed color.
      for (let channel = 0; channel < 3; channel++) {
        const a =
          255 +
          ((before.data[offset + channel] - 255) * before.data[offset + 3]) /
            255;
        const b =
          255 +
          ((after.data[offset + channel] - 255) * after.data[offset + 3]) / 255;
        if (Math.abs(a - b) >= evidenceMethod.channelThreshold) changed = true;
      }
      if (changed) {
        changedPixels++;
        cells[Math.floor(y / size) * columns + Math.floor(x / size)]++;
      }
    }
  }
  const found = [];
  for (let start = 0; start < cells.length; start++) {
    if (cells[start] < evidenceMethod.minimumCellPixels) continue;
    const queue = [start];
    let pixels = cells[start];
    cells[start] = 0;
    let left = columns,
      top = rows,
      right = 0,
      bottom = 0;
    for (let index = 0; index < queue.length; index++) {
      const cell = queue[index],
        x = cell % columns,
        y = Math.floor(cell / columns);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        const next = ny * columns + nx;
        if (
          nx < 0 ||
          nx >= columns ||
          ny < 0 ||
          ny >= rows ||
          cells[next] < evidenceMethod.minimumCellPixels
        )
          continue;
        pixels += cells[next];
        cells[next] = 0;
        queue.push(next);
      }
    }
    if (pixels < evidenceMethod.minimumRegionPixels) continue;
    const x = Math.max(0, left * size - 8),
      y = Math.max(0, top * size - 8);
    found.push({
      x,
      y,
      width: Math.min(width, (right + 1) * size + 8) - x,
      height: Math.min(height, (bottom + 1) * size + 8) - y,
      changedPixels: pixels,
    });
  }
  return {
    changedPixels,
    regions: found.sort((a, b) => b.changedPixels - a.changedPixels),
  };
}

async function crop(source, bounds, file) {
  const output = new PNG({ width: bounds.width, height: bounds.height });
  for (let y = 0; y < bounds.height; y++) {
    const start = ((bounds.y + y) * source.width + bounds.x) * 4;
    source.data.copy(
      output.data,
      y * bounds.width * 4,
      start,
      start + bounds.width * 4,
    );
  }
  await writeFile(file, PNG.sync.write(output));
}

/** @param {import("./types.js").ReviewReport} report
 * @param {import("./types.js").ReviewReport | undefined} baseline
 * @param {string} directory
 * @returns {Promise<import("./types.js").EvidenceChange[]>} */
export async function compareEvidence(report, baseline, directory) {
  const previous = new Map(
    (baseline?.pages ?? []).map((page) => [key(page), page]),
  );
  const current = new Map(report.pages.map((page) => [key(page), page]));
  const results = [];
  for (const state of new Set([...current.keys(), ...previous.keys()])) {
    const page = current.get(state),
      approved = previous.get(state),
      display = page || approved;
    /** @type {import("./types.js").EvidenceChange} */
    const entry = {
      page: display.name,
      checkpoint: display.checkpoint ?? null,
      viewport: display.viewport,
      status: "not-compared",
      reason: "",
      regions: [],
      method: evidenceMethod,
    };
    results.push(entry);
    try {
      if (!baseline) throw new Error("No approved review baseline.");
      if (!page || !approved)
        throw new Error(
          "Page, checkpoint, or viewport is absent from one review.",
        );
      if (
        !report.browserVersion ||
        report.browserVersion !== baseline.browserVersion
      )
        throw new Error("Browser version differs or was not recorded.");
      if (settings(report, page) !== settings(baseline, approved))
        throw new Error(
          "Capture URL, readiness, media, text scale, or checkpoint setup differs.",
        );
      if (
        [page, approved].some(
          (p) =>
            !p.details?.complete ||
            p.details.scale !== 1 ||
            p.findings.some((f) =>
              ["review-error", "browser-error", "source-changed"].includes(
                f.rule,
              ),
            ),
        )
      )
        throw new Error(
          "Capture is incomplete or its state could not be verified.",
        );
      const [before, after] = await Promise.all([
        readCapture(
          directory,
          approved.screenshot ? `reference/${approved.screenshot}` : null,
        ),
        readCapture(directory, page.screenshot),
      ]);
      if (before.width !== after.width || before.height !== after.height)
        throw new Error(
          "Capture dimensions differ; no rescaling or pixel alignment was attempted.",
        );
      const diff = regions(before, after);
      Object.assign(entry, {
        status: diff.regions.length ? "changed" : "unchanged",
        reason: diff.regions.length
          ? "Inspect these changed regions; image changes are not violations."
          : "No changes exceeded the recorded noise thresholds.",
        width: after.width,
        height: after.height,
        changedPixels: diff.changedPixels,
        regionCount: diff.regions.length,
        omittedRegions: Math.max(
          0,
          diff.regions.length - evidenceMethod.maxRegions,
        ),
      });
      for (const [index, bounds] of diff.regions
        .slice(0, evidenceMethod.maxRegions)
        .entries()) {
        const prefix = `change-${results.length}-${index + 1}`;
        const region = {
          ...bounds,
          before: `${prefix}-before.png`,
          after: `${prefix}-after.png`,
        };
        await crop(before, bounds, path.join(directory, region.before));
        await crop(after, bounds, path.join(directory, region.after));
        entry.regions.push(region);
      }
    } catch (error) {
      entry.status = "not-compared";
      entry.reason =
        error.code === "ENOENT" ? "A capture file is missing." : error.message;
      entry.regions = [];
    }
  }
  return results;
}

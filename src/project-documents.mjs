import { createHash } from "node:crypto";
import { isUtf8 } from "node:buffer";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

const defaults = ["DESIGN.md", "STYLE.md"];
const maxBytes = 1024 * 1024;

/** Project paths are explicit; never crawl links or inherit parent documents. */
function localPath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.includes("\0") ||
    /^[a-z][a-z0-9+.-]*:/i.test(normalized) ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").includes("..")
  )
    throw new Error(
      `Project document paths must stay inside the project: ${value}`,
    );
  return path.posix.normalize(normalized);
}

/** ATX headings outside front matter and code fences, with unique fragments.
 * This locates source lines; it does not render Markdown or parse design tokens.
 * @param {string} content */
function headings(content) {
  const result = [];
  const used = new Set();
  const lines = content.split(/\r?\n/);
  let frontmatter = lines[0]?.replace(/^\uFEFF/, "").trim() === "---";
  let fence = "";
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (frontmatter) {
      if (index > 0 && /^(---|\.\.\.)\s*$/.test(line)) frontmatter = false;
      continue;
    }
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = "";
      continue;
    }
    if (fence) continue;
    const match = line.match(/^ {0,3}#{1,6}[\t ]+(.+?)\s*$/);
    if (!match) continue;
    const title = match[1].replace(/[\t ]+#+$/, "");
    const base = title
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]*>/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, "")
      .trim()
      .replace(/\s/g, "-");
    if (!base) continue;
    let id = base;
    for (let suffix = 1; used.has(id); suffix++) id = `${base}-${suffix}`;
    used.add(id);
    result.push({ id, line: index + 1, title });
  }
  return result;
}

/** Read exact, bounded local sources without modifying them. Explicit entries
 * are required; the two conventional defaults are optional and independent.
 * @param {string} project
 * @param {string[]} [configured]
 * @returns {Promise<import("./types.js").ProjectDocument[]>} */
export async function readProjectDocuments(project, configured) {
  project = await realpath(project);
  const requested = configured ?? defaults;
  /** @type {import("./types.js").ProjectDocument[]} */
  const documents = [];
  const seen = new Set();
  for (const entry of requested) {
    const relative = localPath(entry);
    if (seen.has(relative))
      throw new Error(`Duplicate project document: ${relative}`);
    seen.add(relative);
    const file = path.join(project, relative);
    try {
      await lstat(file);
    } catch (err) {
      if (err.code === "ENOENT" && configured === undefined) continue;
      throw new Error(
        `Cannot read project document ${relative}: ${err.message}`,
        { cause: err },
      );
    }
    const resolved = await realpath(file);
    const outside = path.relative(project, resolved);
    if (
      outside === ".." ||
      outside.startsWith(".." + path.sep) ||
      path.isAbsolute(outside)
    )
      throw new Error(
        `Project document resolves outside the project: ${relative}`,
      );
    const metadata = await stat(resolved);
    if (!metadata.isFile() || metadata.size > maxBytes)
      throw new Error(
        `Project document must be a regular file of at most 1 MiB: ${relative}`,
      );
    const bytes = await readFile(resolved);
    if (bytes.length > maxBytes || !isUtf8(bytes) || bytes.includes(0))
      throw new Error(
        `Project document must be UTF-8 text of at most 1 MiB: ${relative}`,
      );
    const content = bytes.toString("utf8");
    const basename = path.posix.basename(relative);
    documents.push({
      path: relative,
      role:
        basename === "DESIGN.md"
          ? "design"
          : basename === "STYLE.md"
            ? "style"
            : "reference",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      content,
      headings: /\.md$/i.test(relative) ? headings(content) : [],
    });
  }
  return documents.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
}

/** Resolve a rule's source to an immutable report line, not an arbitrary URL.
 * @param {string} source
 * @param {import("./types.js").ProjectDocument[]} documents */
export function documentSource(source, documents) {
  const separator = source.indexOf("#");
  const pathname = separator < 0 ? source : source.slice(0, separator);
  const fragment =
    separator < 0 ? "" : decodeURIComponent(source.slice(separator + 1));
  const relative = localPath(decodeURIComponent(pathname));
  const index = documents.findIndex((document) => document.path === relative);
  if (index < 0)
    throw new Error(`Rule source is not a loaded project document: ${source}`);
  const document = documents[index];
  let line = 1;
  if (fragment) {
    const heading = document.headings.find((entry) => entry.id === fragment);
    line =
      heading?.line ??
      (/^L[1-9]\d*$/.test(fragment) ? Number(fragment.slice(1)) : 0);
    if (!line || line > document.content.split(/\r?\n/).length)
      throw new Error(
        `Unknown source section ${source}; use an ATX heading fragment or #L<number>`,
      );
  }
  return {
    source,
    path: relative,
    line,
    href: `project-documents.html#document-${index + 1}-L${line}`,
  };
}

/** @param {import("./types.js").Rule[]} rules
 * @param {import("./types.js").ProjectDocument[]} documents */
export function validateDocumentSources(rules, documents) {
  for (const rule of rules)
    for (const source of rule.sources ?? []) {
      try {
        documentSource(source, documents);
      } catch (err) {
        throw new Error(`Rule ${rule.id}: ${err.message}`, { cause: err });
      }
    }
}

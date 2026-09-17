import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { readRuleGuide } from "../src/rule-guide.mjs";

/** Preserve policy text; resolve repository-relative inline links at publication.
 * Unsupported relative link syntax fails the build rather than shipping a dead link.
 * @param {string} markdown @param {string} source */
function publicMarkdown(markdown, source) {
  const base = `https://raw.githubusercontent.com/lanej/viewrule/main/${source}`;
  const links = new Set();
  marked.walkTokens(marked.lexer(markdown), (token) => {
    if (token.type === "link" || token.type === "image") links.add(token.href);
  });
  for (const href of links) {
    if (/^https?:\/\//.test(href) || href.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:|^\//i.test(href))
      throw new Error(`${source}: unsupported public link ${href}`);
    const url = new URL(href, base);
    if (!url.pathname.startsWith("/lanej/viewrule/main/"))
      throw new Error(`${source}: link escapes repository: ${href}`);
    markdown = markdown.replaceAll(`](${href})`, `](${url.href})`);
  }
  marked.walkTokens(marked.lexer(markdown), (token) => {
    if (
      (token.type === "link" || token.type === "image") &&
      !/^https?:\/\/|^#/.test(token.href)
    )
      throw new Error(`${source}: unresolved public link ${token.href}`);
  });
  return markdown;
}

/** Publish generated representations, never a second maintained policy copy.
 * @param {string} output */
export async function buildRuleDocuments(output) {
  const { index, documents } = await readRuleGuide();
  const published = [];
  for (const { markdown: source, ...metadata } of documents) {
    const directory = path.join(output, "rules", metadata.id.toLowerCase());
    await mkdir(directory, { recursive: true });
    const markdown =
      `---\n${JSON.stringify({ schemaVersion: 1, ...metadata }, null, 2)}\n---\n\n` +
      publicMarkdown(source, metadata.source);
    const file = path.join(directory, "index.md");
    await writeFile(file, markdown);
    // Validate the actual exported bytes and its corresponding human-facing route.
    const exported = await readFile(file, "utf8");
    if (exported !== markdown)
      throw new Error(`${file}: exported policy changed during publication`);
    await readFile(path.join(directory, "index.html"));
    published.push({
      ...metadata,
      markdownSHA256: createHash("sha256").update(exported).digest("hex"),
    });
  }
  await writeFile(
    path.join(output, "rules/index.json"),
    JSON.stringify({ ...index, rules: published }, null, 2) + "\n",
  );
}

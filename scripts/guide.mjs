import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv } from "ajv";
import { marked } from "marked";
import Mustache from "mustache";
import {
  guideRoot,
  readGuide,
  guideIndex,
} from "../plugins/claude-code/scripts/guide.mjs";

import { validateExamples } from "./examples.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const source = path.resolve(fileURLToPath(guideRoot));
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
const renderer = new marked.Renderer();
renderer.heading = function ({ tokens, depth, text }) {
  return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
};
marked.use({ renderer });

function links(body) {
  const result = [];
  marked.walkTokens(marked.lexer(body), (token) => {
    if (token.type === "link" || token.type === "image")
      result.push(token.href);
  });
  return result;
}

export async function validateGuide() {
  const examples = await validateExamples();
  const pages = await readGuide();
  const schema = JSON.parse(
    await readFile(new URL("schema.json", guideRoot), "utf8"),
  );
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  const byId = new Map();
  const exampleIds = new Set();
  const policy = await readFile(
    path.join(repository, "docs/design-rules.md"),
    "utf8",
  );
  const version = pages.find((p) => p.metadata.kind === "index")?.metadata
    .version;
  for (const page of pages) {
    const m = page.metadata;
    if (!validate({ ...m }))
      throw new Error(`${page.file}: ${JSON.stringify(validate.errors)}`);
    if (
      !/^(P-\d{3}|E-[A-Z0-9-]+|guide-(index|authoring|template))$/.test(m.id) ||
      byId.has(m.id)
    )
      throw new Error(`${page.file}: invalid/duplicate ID ${m.id}`);
    if (m.version !== version)
      throw new Error(`${page.file}: mismatched corpus version`);
    byId.set(m.id, page);
    marked.walkTokens(marked.lexer(page.body), (token) => {
      if (token.type === "html")
        throw new Error(`${page.file}: use Markdown, not raw HTML`);
    });
  }
  for (const page of pages) {
    const m = page.metadata;
    const refs = links(page.body);
    if (m.kind === "pattern") {
      for (const heading of [
        "What to do and why",
        "Prefer, avoid, and exceptions",
        "Examples",
        "Evidence and limits",
        "Automated checks and judgment",
      ])
        if (!page.body.includes(`## ${heading}\n`))
          throw new Error(`${page.file}: missing ${heading}`);
      for (const id of m.related)
        if (byId.get(id)?.metadata.kind !== "pattern")
          throw new Error(`${page.file}: unknown pattern ${id}`);
      for (const id of m.rules)
        if (!policy.includes(`## ${id} `))
          throw new Error(`${page.file}: unknown DR ${id}`);
      for (const id of m.sources) {
        const evidence = byId.get(id);
        if (
          evidence?.metadata.kind !== "evidence" ||
          !refs.includes(evidence.file)
        )
          throw new Error(`${page.file}: missing cited evidence ${id}`);
      }
      for (const quality of ["good", "bad"])
        if (!m.examples.some((e) => e.quality === quality))
          throw new Error(`${page.file}: missing ${quality} example`);
      for (const example of m.examples) {
        if (!/^[a-z][a-z0-9-]*$/.test(example.id) || exampleIds.has(example.id))
          throw new Error(
            `${page.file}: invalid/duplicate example ${example.id}`,
          );
        exampleIds.add(example.id);
        refs.push(example.href);
      }
    }
    if (m.kind === "evidence") {
      if (!refs.includes(m.url) || !page.body.includes("## Limitations\n"))
        throw new Error(
          `${page.file}: evidence needs source link and limitations`,
        );
    }
    for (const ref of refs) {
      if (/^https:\/\//.test(ref)) continue;
      if (/^[a-z]+:|^\/\//i.test(ref))
        throw new Error(`${page.file}: unsupported link ${ref}`);
      const [file, fragment] = ref.split("#");
      const target = path.resolve(
        source,
        path.dirname(page.file),
        file.split("?")[0] || path.basename(page.file),
      );
      if (!target.startsWith(repository + path.sep))
        throw new Error(`${page.file}: link escapes repository`);
      const contents = await readFile(target, "utf8");
      if (fragment) {
        if (target.endsWith(".md")) {
          const headings = [...contents.matchAll(/^#{1,6} (.+)$/gm)].map((m) =>
            slug(m[1]),
          );
          if (!headings.includes(fragment))
            throw new Error(`${page.file}: missing Markdown anchor ${ref}`);
        } else if (
          target.endsWith(".html") &&
          !contents.includes(`id="${fragment}"`) &&
          !contents.includes(`value="${fragment}"`) &&
          !(
            path.dirname(target) === path.join(repository, "docs/examples") &&
            examples.pages[path.basename(target)]?.anchors.includes(fragment)
          )
        )
          throw new Error(`${page.file}: missing example anchor ${ref}`);
      }
    }
  }
  return pages;
}

export async function buildGuide(output) {
  const pages = await validateGuide();
  const examples = await validateExamples();
  const destination = path.join(output, "guide/v1");
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
  const template = await readFile(
    path.join(repository, "docs/guide-page.html"),
    "utf8",
  );
  const index = guideIndex(pages);
  // Repository-relative links become deployment-relative links under /viewrule/.
  const publicPath = (target) => {
    if (target.startsWith(source + path.sep))
      return `guide/v1/${path.relative(source, target)}`;
    if (target.startsWith(path.join(repository, "docs") + path.sep))
      return path.relative(path.join(repository, "docs"), target);
    throw new Error(`No public route for ${target}`);
  };
  for (const page of pages) {
    const publicFile = `guide/v1/${page.file.replace(/\.md$/, ".html")}`;
    const rewrite = (href, format) => {
      if (/^https:\/\//.test(href)) return href;
      const split = href.search(/[?#]/);
      const file = split < 0 ? href : href.slice(0, split);
      const suffix = split < 0 ? "" : href.slice(split);
      const target = path.resolve(
        source,
        path.dirname(page.file),
        file || path.basename(page.file),
      );
      let published = publicPath(target);
      if (target.endsWith(".md")) {
        if (target.startsWith(source + path.sep)) {
          if (format === "html")
            published = published.replace(/\.md$/, ".html");
        } else {
          const root =
            format === "html"
              ? "https://github.com/lanej/viewrule/blob/main/docs/"
              : "https://raw.githubusercontent.com/lanej/viewrule/main/docs/";
          return root + published + suffix;
        }
      }
      return (
        path.posix.relative(path.posix.dirname(publicFile), published) + suffix
      );
    };
    const rewriteBody = (format) => {
      let body = page.body;
      for (const href of new Set(links(body)))
        body = body.replaceAll(`](${href})`, `](${rewrite(href, format)})`);
      return body;
    };
    const body = rewriteBody("html");
    const metadata = { ...page.metadata };
    if (metadata.examples)
      metadata.examples = metadata.examples.map((example) => ({
        ...example,
        href: rewrite(example.href, "md"),
      }));
    const markdown = `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${rewriteBody("md")}\n`;
    await writeFile(path.join(destination, page.file), markdown);
    const indexed = index.pages.find((p) => p.id === metadata.id);
    if (indexed && metadata.examples)
      indexed.examples = metadata.examples.map((example) => ({
        ...example,
        publicUrl: new URL(
          example.href,
          `https://lanej.io/viewrule/guide/v1/${page.file}`,
        ).href,
      }));
    const m = page.metadata;
    const prefix =
      path.posix.relative(path.posix.dirname(publicFile), ".") || ".";
    const html = Mustache.render(template, {
      title: m.title,
      id: m.id,
      version: m.version,
      kind: m.kind,
      prefix,
      markdown: path.posix.basename(page.file),
      content: marked.parse(body, { async: false }),
      pages: pages
        .filter((p) => p.metadata.kind === "pattern")
        .sort((a, b) => a.metadata.id.localeCompare(b.metadata.id))
        .map((p) => ({
          title: p.metadata.title,
          href: path.posix.relative(
            path.posix.dirname(publicFile),
            `guide/v1/${p.file.replace(/\.md$/, ".html")}`,
          ),
          current: p.file === page.file ? "page" : "false",
        })),
    });
    await writeFile(path.join(output, publicFile), html);
  }
  // Validate exported Markdown from its deployment location, including metadata.
  // This catches repository-relative links that were valid locally but escape Pages.
  for (const page of pages) {
    const exported = await readFile(path.join(destination, page.file), "utf8");
    const metadata = index.pages.find((p) => p.id === page.metadata.id);
    for (const href of [
      ...links(exported.replace(/^---[\s\S]*?\n---\n/, "")),
      ...(metadata?.examples || []).map((e) => e.href),
    ]) {
      if (/^https:\/\//.test(href)) continue;
      const url = new URL(
        href,
        `https://lanej.io/viewrule/guide/v1/${page.file}`,
      );
      if (!url.pathname.startsWith("/viewrule/"))
        throw new Error(`${page.file}: exported link escapes Pages: ${href}`);
      const contents = await readFile(
        path.join(
          output,
          decodeURIComponent(url.pathname.slice("/viewrule/".length)),
        ),
        "utf8",
      );
      const fragment = url.hash.slice(1);
      if (fragment) {
        const valid = url.pathname.endsWith(".md")
          ? [...contents.matchAll(/^#{1,6} (.+)$/gm)].some(
              (m) => slug(m[1]) === fragment,
            )
          : contents.includes(`id="${fragment}"`) ||
            contents.includes(`value="${fragment}"`) ||
            (path.posix.dirname(url.pathname) === "/viewrule/examples" &&
              examples.pages[
                path.posix.basename(url.pathname)
              ]?.anchors.includes(fragment));
        if (!valid)
          throw new Error(`${page.file}: exported anchor missing: ${href}`);
      }
    }
  }
  await writeFile(
    path.join(destination, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
  );
  console.log(
    `Validated and rendered ${pages.length} guide pages (corpus ${index.version}).`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const pages = await validateGuide();
  console.log(`Guide contract valid: ${pages.length} pages.`);
}

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const guideRoot = new URL("../guide/v1/", import.meta.url);
export const publicRoot = "https://lanej.io/viewrule/guide/v1/";

// JSON is a deliberately constrained YAML subset: no YAML parser or runtime deps.
export function parsePage(markdown, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  if (!match) throw new Error(`${file}: expected JSON frontmatter`);
  return {
    file,
    metadata: JSON.parse(match[1]),
    body: markdown.slice(match[0].length).trim(),
    markdown,
  };
}

export async function readGuide() {
  const files = (await readdir(guideRoot)).filter((f) => f.endsWith(".md"));
  const evidence = (await readdir(new URL("evidence/", guideRoot)))
    .filter((f) => f.endsWith(".md"))
    .map((f) => `evidence/${f}`);
  return Promise.all(
    [...files, ...evidence]
      .sort()
      .map(async (file) =>
        parsePage(await readFile(new URL(file, guideRoot), "utf8"), file),
      ),
  );
}

export function guideIndex(pages) {
  const version = pages.find((p) => p.metadata.kind === "index").metadata
    .version;
  return {
    schemaVersion: 1,
    version,
    markdown: "index.md",
    exampleSource: "examples.json",
    designRules: {
      indexUrl: "https://lanej.io/viewrule/rules/index.json",
      command: "viewrule guide rules",
      authority: "installed engine policy; public URLs track the current site",
    },
    pages: pages
      .filter((p) => p.metadata.kind !== "template")
      .map(({ file, metadata }) => ({
        ...metadata,
        markdown: file,
      })),
  };
}

export async function printGuide(args) {
  if (args.length > 1) throw new Error("Usage: guide [ID]");
  const pages = await readGuide();
  if (!args.length) {
    const index = guideIndex(pages);
    console.log(
      JSON.stringify(
        {
          ...index,
          pages: index.pages.map(
            ({
              id,
              kind,
              title,
              summary,
              applicability,
              related,
              rules,
              sources,
              markdown,
            }) => ({
              id,
              kind,
              title,
              summary,
              applicability,
              related,
              rules,
              sources,
              markdown,
            }),
          ),
          localRoot: fileURLToPath(guideRoot),
          publicRoot,
        },
        null,
        2,
      ),
    );
    return;
  }
  const page = pages.find((p) => p.metadata.id === args[0]);
  if (!page)
    throw new Error(`Unknown guide ID ${args[0]}; run guide for the index`);
  process.stdout.write(page.markdown);
}

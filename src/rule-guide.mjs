import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readDesignPolicy } from "./design.mjs";

export const publicRulesRoot = "https://lanej.io/viewrule/rules/";

/** Read only the installed canonical policy. No project, browser, or network. */
export async function readRuleGuide() {
  const policy = await readDesignPolicy();
  const documents = await Promise.all(
    policy.rules.map(async (rule) => {
      const markdown = await readFile(
        new URL(`../${rule.source}`, import.meta.url),
        "utf8",
      );
      const summary = rule.body
        .match(/^\*\*Principle:\*\*\s+([^\n]+(?:\n(?!\n)[^\n]+)*)/m)?.[1]
        .replace(/\s+/g, " ")
        .trim();
      if (!summary) throw new Error(`${rule.source}: missing Principle`);
      return {
        id: rule.id,
        title: rule.title,
        summary,
        enforcement: rule.enforcement,
        htmlUrl: `${publicRulesRoot}${rule.id.toLowerCase()}/`,
        markdownUrl: `${publicRulesRoot}${rule.id.toLowerCase()}/index.md`,
        source: rule.source,
        sourceSHA256: createHash("sha256").update(markdown).digest("hex"),
        markdown,
      };
    }),
  );
  return {
    index: {
      schemaVersion: 1,
      policySHA256: policy.sha256,
      rules: documents.map(({ markdown: _markdown, ...metadata }) => metadata),
    },
    documents,
  };
}

/** @param {string[]} args */
export async function printRuleGuide(args) {
  if (args.length !== 1)
    throw new Error("Usage: guide rules | guide DR-<number>");
  const { index, documents } = await readRuleGuide();
  if (args[0] === "rules") {
    console.log(JSON.stringify(index, null, 2));
    return;
  }
  const document = documents.find((entry) => entry.id === args[0]);
  if (!document)
    throw new Error(
      `Unknown design rule ${args[0]}; run guide rules for the index`,
    );
  process.stdout.write(document.markdown);
}

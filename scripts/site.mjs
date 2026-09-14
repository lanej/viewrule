import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";

const repository = path.resolve(import.meta.dirname, "..");
const output = path.join(repository, "dist/site");
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "app"), { recursive: true });
// Explicit public assets: review configuration and local evidence are not deployed.
for (const file of ["index.html", "app.css", "app.js", "data.js"])
  await cp(
    path.join(repository, "docs/app", file),
    path.join(output, "app", file),
  );
await cp(
  path.join(repository, "docs/index.html"),
  path.join(output, "index.html"),
);
await cp(
  path.join(repository, "docs/examples"),
  path.join(output, "examples"),
  { recursive: true },
);
const gallery = path.join(output, "examples/index.html");
await writeFile(
  gallery,
  (await readFile(gallery, "utf8")).replaceAll(
    "../design-examples.md",
    "https://github.com/lanej/viewrule/blob/main/docs/design-examples.md",
  ),
);
const behavior = path.join(output, "examples/behavior.html");
await writeFile(
  behavior,
  (await readFile(behavior, "utf8")).replaceAll(
    "../design-rules.md",
    "https://github.com/lanej/viewrule/blob/main/docs/design-rules.md",
  ),
);
await writeFile(path.join(output, ".nojekyll"), "");
console.log("Built dist/site (mock application and component gallery).");

if (process.argv.includes("--serve")) {
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
  };
  createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405);
        response.end();
        return;
      }
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        output,
        "." + pathname,
        ...(pathname.endsWith("/") ? ["index.html"] : []),
      );
      if (!file.startsWith(output + path.sep)) {
        response.writeHead(404);
        response.end();
        return;
      }
      const content = await readFile(file);
      response.writeHead(200, {
        "Content-Type": `${types[path.extname(file)] || "application/octet-stream"}; charset=utf-8`,
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  }).listen(4173, "127.0.0.1", () =>
    console.log("Preview: http://127.0.0.1:4173/app/"),
  );
}

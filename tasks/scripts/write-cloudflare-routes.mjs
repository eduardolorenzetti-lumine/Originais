import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const distRoot = resolve("dist");

await mkdir(distRoot, { recursive: true });

await writeFile(
  resolve(distRoot, "_redirects"),
  ["/tasks /tasks/index.html 200", "/tasks/* /tasks/index.html 200", ""].join("\n"),
);

await writeFile(
  resolve(distRoot, "_headers"),
  [
    "/tasks/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "/tasks/index.html",
    "  Cache-Control: no-cache",
    "",
  ].join("\n"),
);


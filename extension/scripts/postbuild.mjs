// Generate a loadable dist/manifest.json after `vite build`.
//
// The source manifest.json references TypeScript entry paths for readability.
// Vite emits flat bundles (background.js, content.js) and index.html into dist/,
// so this script rewrites the manifest paths to match the built output.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(root, "dist");

const ENTRY_REWRITES = {
  "src/background/serviceWorker.ts": "background.js",
  "src/content/content.ts": "content.js",
};

function rewrite(path) {
  return ENTRY_REWRITES[path] ?? path;
}

const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8"),
);

if (manifest.background?.service_worker) {
  manifest.background.service_worker = rewrite(
    manifest.background.service_worker,
  );
}

if (Array.isArray(manifest.content_scripts)) {
  for (const entry of manifest.content_scripts) {
    if (Array.isArray(entry.js)) {
      entry.js = entry.js.map(rewrite);
    }
  }
}

await writeFile(
  resolve(distDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log("Wrote dist/manifest.json");

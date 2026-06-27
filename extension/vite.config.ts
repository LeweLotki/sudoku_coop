import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The extension is built in separate passes (see package.json `build` script):
//   - popup       → index.html + hashed assets (ES modules, loaded by the page)
//   - background  → background.js (module service worker, self-contained)
//   - content     → content.js (IIFE; MV3 content scripts cannot use ESM imports)
//
// Each script entry is bundled standalone with `inlineDynamicImports` so no shared
// chunks are emitted — content scripts in particular must not contain `import`s.
const target = process.env.BUILD_TARGET ?? "popup";

export default defineConfig(() => {
  if (target === "content") {
    return {
      build: {
        outDir: "dist",
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(__dirname, "src/content/content.ts"),
          output: {
            entryFileNames: "content.js",
            format: "iife" as const,
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  if (target === "background") {
    return {
      build: {
        outDir: "dist",
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(__dirname, "src/background/serviceWorker.ts"),
          output: {
            entryFileNames: "background.js",
            format: "es" as const,
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  // Default: popup. index.html references src/popup/main.tsx.
  return {
    plugins: [react()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  };
});

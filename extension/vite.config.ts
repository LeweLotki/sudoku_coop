import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Scaffold-only Vite config. A future change will refine the multi-entry build
// (popup HTML + content script + background service worker) so the extension can
// be loaded unpacked from `dist/`.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
        content: resolve(__dirname, "src/content/content.ts"),
        background: resolve(__dirname, "src/background/serviceWorker.ts"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});

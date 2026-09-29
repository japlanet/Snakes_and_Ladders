import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Only the dev and preview servers use a port; a build does not need one.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : undefined;
if (port !== undefined && !(Number.isInteger(port) && port > 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Where the game is served from. The default suits GitHub Pages for this repository.
const basePath = process.env.BASE_PATH || "/Snakes_and_Ladders/";

export default defineConfig({
  base: basePath,
  // Shown as "Version from …" next to the Check for update button (src/update.ts).
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true, deny: ["**/.*"] },
  },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});

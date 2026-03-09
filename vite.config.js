import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

function listIfcFiles() {
  const dir = path.resolve("public");
  try {
    return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".ifc"));
  } catch {
    return [];
  }
}

const sampleManifest = () => ({
  name: "sample-manifest",
  configureServer(server) {
    const cached = JSON.stringify(listIfcFiles());
    server.middlewares.use("/samples.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(cached);
    });
  },
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "samples.json", source: JSON.stringify(listIfcFiles()) });
  },
});

export default defineConfig({
  plugins: [
    sampleManifest(),
    viteStaticCopy({
      targets: [
        { src: "node_modules/web-ifc/web-ifc.wasm", dest: "" },
        { src: "node_modules/web-ifc/web-ifc-mt.wasm", dest: "" },
        { src: "node_modules/@thatopen/fragments/dist/Worker/worker.mjs", dest: "" },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ["web-ifc"],
  },
});

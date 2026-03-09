import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const sampleManifest = () => ({
  name: "sample-manifest",
  configureServer(server) {
    server.middlewares.use("/samples.json", (_req, res) => {
      const dir = path.resolve("public");
      const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".ifc"))
        : [];
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(files));
    });
  },
  generateBundle() {
    const dir = path.resolve("public");
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".ifc"))
      : [];
    this.emitFile({ type: "asset", fileName: "samples.json", source: JSON.stringify(files) });
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

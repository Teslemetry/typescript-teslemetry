import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "app.ts",
  outDir: ".homeybuild",
  format: "esm",
  platform: "node",
  external: ["homey"],
});

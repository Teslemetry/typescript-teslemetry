import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["app.ts", "drivers/*/*.ts"],
  outDir: ".homeybuild",
  external: ["homey"],
  format: ["esm"],
  dts: false,
  platform: "node",
});

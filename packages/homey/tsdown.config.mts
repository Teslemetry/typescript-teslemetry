import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["app.ts", "api.ts", "drivers/*/*.ts"],
  outDir: ".homeybuild",
  external: ["homey"],
  format: ["cjs"],
  dts: false,
  platform: "node",
});

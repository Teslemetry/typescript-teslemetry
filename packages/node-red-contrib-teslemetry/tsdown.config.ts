import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/nodes/*.ts",
  outDir: "dist/nodes",
  format: "cjs",
  platform: "node",
});

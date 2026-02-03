import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/nodes/*.ts", "src/credentials/*.ts"],
  outDir: "dist",
  format: "cjs",
  platform: "node",
});

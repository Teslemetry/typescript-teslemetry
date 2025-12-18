import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["app.ts", "app.json", "drivers/*/*"],
  outDir: ".homeybuild",
  shims: true,
});

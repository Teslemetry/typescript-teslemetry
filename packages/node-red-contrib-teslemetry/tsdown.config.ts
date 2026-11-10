import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/nodes/*.ts",
  outDir: "dist/nodes",
  format: "cjs",
  platform: "node",
  fixedExtension: false,
  deps: {
    // Bundled from devDependencies on purpose: the package installs with no
    // runtime dependencies.
    onlyBundle: [
      "tesla-fleet-api",
      "@teslemetry/tesla-protocol",
      "@bufbuild/protobuf",
    ],
  },
});

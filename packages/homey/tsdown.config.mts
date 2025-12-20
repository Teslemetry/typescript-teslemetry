import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "app.ts",
    "drivers/powerwall/device.ts",
    "drivers/powerwall/driver.ts",
    "drivers/vehicle/device.ts",
    "drivers/vehicle/driver.ts",
    "drivers/wall-connector/device.ts",
    "drivers/wall-connector/driver.ts",
  ],
  outDir: ".homeybuild",
  external: ["cpu-features", "ssh2"],
  format: ["esm"],
  dts: false,
  platform: "node",
  treeshake: true,
  shims: true,
});

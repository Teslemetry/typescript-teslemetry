import { defineConfig } from "tsdown";

export default defineConfig({
  // A new entry also needs a package.json `exports` subpath.
  entry: { index: "src/index.ts", compat: "src/compat/index.ts" },
  deps: {
    // tesla-fleet-api's getTariffPeriods is bundled in from a devDependency (see src/tariff.ts)
    // so @teslemetry/api carries no runtime dependency on it - declare that intentional.
    onlyBundle: ["tesla-fleet-api"],
  },
});

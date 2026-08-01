import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    // tesla-fleet-api's getTariffPeriods is bundled in from a devDependency (see src/tariff.ts)
    // so @teslemetry/api carries no runtime dependency on it - declare that intentional.
    onlyBundle: ["tesla-fleet-api"],
  },
});

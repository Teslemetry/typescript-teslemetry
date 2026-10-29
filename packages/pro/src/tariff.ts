// Bundled from `tesla-fleet-api` at build time (devDependency, inlined by tsdown) so
// consumers get tariff resolution without a runtime dependency on that package. Deep-imported
// from its own submodules rather than the package root to keep tree-shaking narrow to this
// helper's closure, not tesla-fleet-api's vehicle/energy/signing surface.
export { getTariffPeriods } from "tesla-fleet-api/dist/tariff.js";
export type {
  TariffRate,
  TariffPeriod,
  TariffResolution,
} from "tesla-fleet-api/dist/tariff.js";
export type { TariffContentV2 } from "tesla-fleet-api/dist/types/site_info.js";

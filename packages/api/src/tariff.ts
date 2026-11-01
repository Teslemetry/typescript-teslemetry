// Bundled from `tesla-fleet-api` at build time (devDependency, inlined by tsdown) so
// consumers get tariff resolution without a runtime dependency on that package. Imported
// from its `tariff` subpath rather than the package root to keep tree-shaking narrow to this
// helper's closure, not tesla-fleet-api's vehicle/energy/signing surface.
export { getTariffPeriods } from "tesla-fleet-api/tariff";
export type {
  TariffRate,
  TariffPeriod,
  TariffResolution,
} from "tesla-fleet-api/tariff";
export type { TariffContentV2 } from "tesla-fleet-api/types";

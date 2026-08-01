---
"@teslemetry/api": minor
---

Adds `getTariffPeriods` and the `TariffContentV2` type it consumes, re-exported from the package root. The implementation is bundled in from `tesla-fleet-api` at build time (a devDependency, inlined by tsdown) - consumers get tariff resolution without taking a runtime dependency on `tesla-fleet-api` themselves.

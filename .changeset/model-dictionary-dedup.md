---
"@teslemetry/api": patch
---

Bump `tesla-fleet-api` to 0.3.0 and consume its exported `Models` map (deep-imported from `tesla-fleet-api/dist/types/vehicle.js`) instead of a local copy for VIN-based model detection. `useTeslaModel()`'s public behavior and test coverage are unchanged, including Cybercab ("A").

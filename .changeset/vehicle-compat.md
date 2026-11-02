---
"@teslemetry/api": minor
---

Add `@teslemetry/api/compat` with `VehicleCompat`, which exposes a vehicle under `tesla-fleet-api`'s method names and arguments so it can be a `VehicleRouter` backend. Rejections stay the values the SDK rejects today, with hidden `status` and `failover_safe` properties added to objects. `tesla-fleet-api` is not imported.

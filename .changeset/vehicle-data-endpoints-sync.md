---
"@teslemetry/api": patch
---

Add `charge_schedule_data` and `preconditioning_schedule_data` to `VehicleDataEndpoints`, matching the endpoint list the generated client documents for `GET /api/1/vehicles/{vin}/vehicle_data`. The hand-maintained union had drifted behind those two endpoints.

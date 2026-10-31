---
"@teslemetry/api": minor
---

Add `TeslemetryStream.ingest(data, vin?, metadata?, createdAt?)` and `TeslemetryVehicleStream.ingest(data, metadata?, createdAt?)` to dispatch externally sourced signals (e.g. BLE) as native `data` events, without a connection.

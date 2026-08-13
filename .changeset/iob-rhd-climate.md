---
"iobroker.teslemetry": patch
---

Fix driver/passenger temperature setpoints being swapped on right-hand-drive vehicles: both the SSE signal mapping (`HvacLeft`/`HvacRightTemperatureRequest`) and `setTemps()` writes now select the correct physical side using the vehicle's `config.rhd` metadata, matching the Homebridge plugin's existing behavior.

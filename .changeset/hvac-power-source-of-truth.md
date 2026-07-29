---
"homebridge-teslemetry": patch
---

Climate accessory now uses `HvacPower` (the vehicle's actual system power state) instead of `HvacACEnabled` to determine HomeKit's `CurrentHeatingCoolingState`. Previously the accessory reported the climate system OFF whenever the AC compressor wasn't running, even while heating was active. `HvacACEnabled` is now only used to distinguish HEAT from COOL once `HvacPower` reports the system on.

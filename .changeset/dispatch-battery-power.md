---
"@teslemetry/api": minor
---

Energy sites can now dispatch the Powerwall battery. `dispatchBatteryPower(power_watts, duration_seconds)` runs the battery at a set power (positive discharges, negative charges, up to 100000 W either way) for 1 to 86400 seconds, after which it returns to normal operation by itself. `resumeBatteryOperation()` ends a dispatch early. Energy site metadata now includes `paired`, which is `true` when Teslemetry's key is verified on the gateway so these commands can be sent through the cloud, and `null` until that is known.

**Breaking (TypeScript types only):** the client is regenerated from the current api, which changes these types:
- The `AccRail` telemetry field is renamed to `AccessoryRail`.
- The telemetry fields `AutomaticEmergencyBrakingState`, `CruiseState`, `LifetimeDcChargeEnergyKwh`, `PowerTransferStatus`, `RollingResistanceCoefficient` and `VehicleMassKg` are removed. Code that names any of these in a signal, stream listener or field configuration no longer compiles.
- The stream's `cursor` query parameter is now typed as a string. What is sent to the server is unchanged.

The telemetry fields `SelfDrivingSoftwareVersion`, `SemiTrailerLatched` and `SemiVehicleMassKg` are new.

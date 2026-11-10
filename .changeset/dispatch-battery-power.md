---
"@teslemetry/api": minor
---

Add `dispatchBatteryPower(power_watts, duration_seconds)` and `resumeBatteryOperation()` to energy sites, to run a Powerwall at a set power for a set time and to end that early. The client is regenerated from the current api, which also adds the energy site `paired` flag to product metadata and renames the `AccRail` telemetry field to `AccessoryRail`, removes `AutomaticEmergencyBrakingState`, `CruiseState`, `LifetimeDcChargeEnergyKwh`, `PowerTransferStatus`, `RollingResistanceCoefficient` and `VehicleMassKg`, and adds `SelfDrivingSoftwareVersion`, `SemiTrailerLatched` and `SemiVehicleMassKg`.

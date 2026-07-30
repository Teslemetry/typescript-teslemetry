---
"homebridge-teslemetry": minor
"@teslemetry/api": patch
---

Add HomeKit accessories for two of the four telemetry signals selected in the 2026-07-29 field-parity audit that have a clean HomeKit concept: a `WindowCovering` for the Cybertruck's tonneau cover (`TonneauOpenPercent`/`closure({ tonneau })`, `TargetPosition` restricted to 0/100 since the vehicle command is open/close only), and a read-only `ContactSensor` for `RearDefrostEnabled` (no rear-specific command exists, so it's display-only rather than a fake-writable `Switch`). The tonneau service is gated to Cybertruck vehicles via `@teslemetry/api`'s newly-exported `useTeslaModel(vin)` helper. The other two selected signals - the FSD mileage counters (`MilesSinceReset`, `SelfDrivingMilesSinceReset`) and `LifetimeEnergyGainedRegen` - have no stock HomeKit characteristic for arbitrary distance or energy values, so they're intentionally left unmapped rather than forced onto an unrelated sensor type.

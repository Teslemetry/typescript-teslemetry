---
"homebridge-teslemetry": minor
---

Add HomeKit accessories for two of the four telemetry signals selected in the 2026-07-29 field-parity audit that have a clean HomeKit concept: a `WindowCovering` for the Cybertruck's tonneau cover (`TonneauOpenPercent`/`closure({ tonneau })`), and a status-only `Switch` for `RearDefrostEnabled` (no rear-specific command exists, so it's display-only). The other two signals - the FSD mileage counters (`MilesSinceReset`, `SelfDrivingMilesSinceReset`) and `LifetimeEnergyGainedRegen` - have no stock HomeKit characteristic for arbitrary distance or energy values, so they're intentionally left unmapped rather than forced onto an unrelated sensor type.

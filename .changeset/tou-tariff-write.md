---
"@teslemetry/api": minor
---

Add `TeslemetryEnergyApi.setTimeOfUseSettings()` to write an energy site's time-of-use tariff (buy/sell rate schedule), mirroring the `/api/1/energy_sites/{id}/time_of_use_settings` endpoint. Previously the client only exposed tariff reads via `getSiteInfo()`.

---
"@teslemetry/api": minor
---

Add `getTariff()` to `TeslemetryEnergyApi`, a typed accessor for the site's time-of-use tariff (`tariff_id`, `tariff_content`, `tariff_content_v2`). No dedicated tariff endpoint exists in the Fleet API, so this reads the fields out of `getSiteInfo()` rather than issuing a new request.

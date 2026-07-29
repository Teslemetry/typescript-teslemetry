---
"@teslemetry/api": patch
---

Align the `energy_totals` SSE event type with the server's trimmed payload (Teslemetry/api#321): `product_type`, `topic`, and `url` are no longer part of the event, and `isCache` is now typed `?: true` (present only on a connect-time snapshot replay, omitted on every live publish) instead of a plain boolean. Adoption of this event was zero prior to today's release, so no deprecation cycle is needed.

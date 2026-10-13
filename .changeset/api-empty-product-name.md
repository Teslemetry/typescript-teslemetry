---
"@teslemetry/api": patch
---

`createProducts()` now falls back to the model name (vehicles) or "Unnamed" (energy sites) when the api sends an empty product name, not only when the name is missing.

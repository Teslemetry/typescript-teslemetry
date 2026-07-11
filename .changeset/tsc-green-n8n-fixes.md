---
"@teslemetry/n8n-nodes-teslemetry": patch
---

Fix the VIN, energy site, and signal field dropdowns (`loadOptions`) throwing `TypeError: ... is not a function` instead of populating, because they called nonexistent `TeslemetryApi` methods (`.vehicles()`, `.products()`, `.fields()` instead of `.getVehicles()`, `.getProducts()`, `.getFields()`).

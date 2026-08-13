---
"homebridge-teslemetry": patch
---

Retry a transient `createProducts()` failure during startup discovery with capped exponential backoff instead of failing discovery outright, and evict any cached accessory for a product no longer returned by the account or newly added to the ignore list, destroying its services (and their SSE listeners) before unregistering it.

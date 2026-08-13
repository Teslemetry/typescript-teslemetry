---
"homebridge-teslemetry": patch
---

Close two gaps left by the terminal stream health fault propagation: PresenceService's occupancy sensors now fault on a terminal stream failure and clear again once their signal reports a fresh value, and WallConnectorService's per-DIN sensors restored from Homebridge's accessory cache (before any `live_status` has arrived this run) are now hydrated and fault-checked immediately instead of being invisible to `setStreamFault()` until their first reading.

---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Retry the config node's initial vehicle/energy-site fetch on failure instead of caching that error for the node's whole lifetime - a transient API/network blip now clears on its own, and a corrected token recovers cleanly on the next redeploy instead of leaving stale state behind.

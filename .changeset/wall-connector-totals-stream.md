---
"@teslemetry/api": minor
---

Add the `wall_connector_totals` stream event: per-Wall-Connector daily Wh totals keyed by DIN (`totals`), with the installation-local `date`, on both `TeslemetryStream` and `TeslemetryEnergySiteStream`. It is now a valid `topics` name, and `startLocalCache()` replays the last value to new listeners. The generated client was regenerated from the live spec.

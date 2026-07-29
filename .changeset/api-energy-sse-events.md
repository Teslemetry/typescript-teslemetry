---
"@teslemetry/api": minor
---

Add `live_status`/`site_info` energy SSE events to `TeslemetryStream`, mirroring the existing vehicle event surface. `sse.getEnergySite(id)` returns a `TeslemetryEnergySiteStream` (analogous to `getVehicle`) that emits these events and replays the local cache to new listeners; account-wide and single-site streams both work through the existing optional-id connection mechanism. Forward-compatible and inert until the backend's energy SSE feature (flag-gated) is enabled.

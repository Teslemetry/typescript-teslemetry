---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Fix the Wall Connector node emitting nothing when wired to the Energy Event node: it now reads the connectors from `payload.live_status.wall_connectors` (the Energy Event node's `live_status` message) as well as from `payload.wall_connectors` and a bare array. It also now sends every connector on its output; previously only the first connector of a site with several Wall Connectors was emitted.

---
"@teslemetry/node-red-contrib-teslemetry": minor
---

Add a `teslemetry-wall-connector` node that splits an Energy Site's `wall_connectors[]` array (e.g. from `teslemetry-energy-event`'s `live_status` payload) into one message per connector, keyed by DIN, with an optional DIN filter to isolate a single connector.

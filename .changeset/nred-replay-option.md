---
"@teslemetry/node-red-contrib-teslemetry": minor
---

Nodes no longer receive Teslemetry's last known values when the stream connects, unless the new "Replay last known values on connect" checkbox on the config node is ticked. The config node always asked for no replay, but a malformed stream URL meant the server never saw that and replayed anyway, so flows may have come to depend on it: after this update a node stays silent until a value next changes. Tick the new option (off by default, and off for existing config nodes) to get the replay back; replayed events carry `isCache: true` in the payload of the event nodes.

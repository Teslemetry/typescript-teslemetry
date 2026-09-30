---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Make streaming node statuses and the Node-RED log say why a stream is not connected. A refused connection now names the reason (`subscription required` for a lapsed subscription, `too many connections` for the connection cap, otherwise the HTTP status) instead of only `reconnecting (attempt N)`; `auth failed - check token` is no longer replaced by `disconnected` a moment later; a streaming node added to an already-running stream gets a status instead of a blank; and log lines such as `SSE error:` now include the reason that used to be dropped.

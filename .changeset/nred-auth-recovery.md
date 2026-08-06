---
"@teslemetry/node-red-contrib-teslemetry": minor
---

Distinguish config/auth failures from ordinary reconnects on the `teslemetry-event`, `teslemetry-signal`, and `teslemetry-energy-event` nodes' status indicator, and automatically resume the stream after a bad/expired token clears - the SDK stops reconnecting on its own after repeated `auth_failure`, so previously this required a flow redeploy to recover.

---
"homebridge-teslemetry": patch
---

Handle `stream_error` and terminal `auth_failure` from the account stream: a stream disconnect no longer logs a blanket "will attempt to reconnect" (it may be terminal), and two consecutive auth failures now mark every contact sensor that supports a HomeKit fault state (doors, TPMS, grid outage, storm watch active) as faulted instead of leaving them on their last cached value forever. A later reconnect clears the fault. See the README's Streaming Connection Issues section for recovery steps.

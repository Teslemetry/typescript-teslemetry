---
"iobroker.teslemetry": patch
---

Update SSE event handling to use standard EventEmitter pattern:
- Replace `onOpen()`, `onClose()`, `onError()` with `on("connect")`, `on("disconnect")`
- Replace `onData()`, `onState()`, `onAlert()` with `on("data")`, `on("state")`, `on("alerts")`

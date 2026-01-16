---
"@teslemetry/n8n-nodes-teslemetry": patch
---

Update SSE event handling to use standard EventEmitter pattern:
- Replace `onData()`, `onState()`, etc. with `on("data")`, `on("state")` pattern
- Use new `on("all")` event for subscribing to all events
- Add VIN filtering in event callbacks

---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Update SSE event handling to use standard EventEmitter pattern:
- Replace `onData()`, `onState()`, etc. with `on("data")`, `on("state")` pattern
- Use new `on("all")` event for subscribing to all events
- Add VIN filtering in event callbacks
- Emit catchable errors only on initial connection failure (not on disconnect)

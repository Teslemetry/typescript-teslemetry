---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Update SSE event handling to use standard EventEmitter pattern:
- Replace `onData()`, `onState()`, etc. with `on("data")`, `on("state")` pattern
- Use new `on("all")` event for subscribing to all events
- Add VIN filtering in event callbacks

Improve error handling:
- Config node tracks errors from initial API verification (auth/subscription issues)
- All nodes now show "Error" status with red ring when API verification fails
- Nodes wait for API verification before attempting SSE connections
- Clearer error messages in node logs

Refactor shared helpers:
- Add `getInstance()` to get and validate config instance
- Add `hasInstanceError()` for synchronous error checking (command nodes)
- Add `verifyInstance()` for async verification before SSE connection
- Add `getErrorMessage()` to extract useful messages from any error type (handles hey-api response objects)

---
"@teslemetry/api": patch
---

Standardize SSE event handling to use EventEmitter pattern:
- Remove `onConnection()` helper method - use `on("connect")` and `on("disconnect")` instead
- Add `"all"` event type to subscribe to all SSE events at once
- Update documentation and examples to reflect new patterns

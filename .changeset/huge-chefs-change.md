---
"@teslemetry/api": patch
---

Standardize SSE event handling to use EventEmitter pattern:
- Remove `onConnection()` helper method - use `on("connect")` and `on("disconnect")` instead
- Add `"all"` event type to subscribe to all SSE events at once
- Update documentation and examples to reflect new patterns

Fix unhandled promise rejections in SSE streaming:
- Add error handling to `connect()` method's internal connection loop
- `updateFields()` now returns a promise that resolves/rejects when the debounced update completes
- Multiple calls within the debounce window share the same promise
- `addField()` now properly returns the promise from `updateFields()`

Refactor `updateFields()` internals:
- Consolidate batch state into single `_fieldUpdateBatch` object
- Extract flush logic into `_flushFieldUpdate()` method
- Use Deferred pattern for cleaner promise handling

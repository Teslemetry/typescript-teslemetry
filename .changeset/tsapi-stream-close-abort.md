---
"@teslemetry/api": patch
---

`TeslemetryStream.close()`/`disconnect()` now abort the in-flight SSE fetch/reader and cancel any pending reconnect backoff wait immediately, instead of only flipping `active` to `false` and leaving the request/timer running until it naturally times out or fires (up to 10 minutes). Both methods are now awaitable, so callers can sequence teardown before reinitializing without leaking HTTP streams or timers.

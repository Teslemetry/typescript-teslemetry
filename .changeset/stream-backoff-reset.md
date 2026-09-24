---
"@teslemetry/api": patch
---

Reset the stream reconnect backoff as soon as any traffic (including a blank keep-alive) arrives on the SSE connection, so a single dropped socket after earlier failures no longer causes a long gap before reconnecting.

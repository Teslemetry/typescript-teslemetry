---
"@teslemetry/api": patch
---

Reset the stream reconnect backoff once a connection is established, so a single dropped socket after earlier failures no longer causes a long gap before reconnecting.

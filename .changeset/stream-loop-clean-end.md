---
"@teslemetry/api": patch
"@teslemetry/node-red-contrib-teslemetry": patch
---

Fix the stream reconnect loop. A connection the server ends cleanly (as it does to every open stream on shutdown) is now treated as a disconnect: `disconnect` and `stream_error` are emitted and the reconnect waits for the backoff, instead of reconnecting in a tight loop with no events. `connect` is now emitted when the server's first chunk arrives rather than before the request is sent, so a rejected or hanging attempt no longer reports a connection. The reconnect backoff is capped at 60 seconds instead of 10 minutes.

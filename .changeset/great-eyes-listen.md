---
"@teslemetry/api": minor
---

Stop the SSE stream from reconnect-looping forever on persistent authentication failure, and surface stream errors as typed events.

- Every connection failure now flows through `TeslemetryStream`'s reconnect loop (the generated client previously retried internally, swallowing errors and reusing the original access token forever), so the access token callback is re-resolved on every reconnect and a refreshed token is actually picked up.
- New `stream_error` event on every failed attempt: `{ error, status?, retries }`.
- On a `401`/`403` the stream reconnects once immediately with a freshly resolved token; a second consecutive auth rejection stops the stream and emits a terminal `auth_failure` event carrying a new `TeslemetryStreamAuthError` (with `.status`) instead of retrying forever. The failure streak resets when genuine events arrive. Call `connect()` again to resume after re-authenticating.

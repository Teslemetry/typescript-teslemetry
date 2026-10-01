---
"@teslemetry/api": patch
---

Fix the stream's `cache` option never reaching the server: the request was sent as `/sse/??cache=...`, so the server read the key as `?cache` and always replayed its last known state. The URL is now well-formed (`/sse/?cache=...`). The default is unchanged - a stream created without `cache` still sends `cache=true` and still gets the replay - but a caller that passes `cache: false` (or `cache: { cloud: false }`) now really gets no replay on connect. Also exports the `TeslemetryStreamOptions` type.

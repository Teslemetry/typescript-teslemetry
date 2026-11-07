---
"@teslemetry/api": patch
"@teslemetry/pro": patch
---

The stream now resumes from the last `cursor` received when it reconnects, so the server's snapshot starts after it instead of resending everything. Vehicle `data`, `alerts`, `errors` and `connectivity` event types carry the optional `cursor`.

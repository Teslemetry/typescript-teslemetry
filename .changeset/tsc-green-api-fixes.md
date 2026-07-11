---
"@teslemetry/api": patch
---

Fix `speedLimitClearPinAdmin()` sending no request body at all, which stripped the Content-Type header and made the Fleet API reject the call. Also fix an SSE `vin` type mismatch when dispatching account-wide `credits` events (no behavior change).

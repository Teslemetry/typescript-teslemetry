---
"@teslemetry/api": patch
---

Fix timezone handling in telemetry history API calls

- Format dates as RFC3339 with local timezone offset instead of UTC
- Default time_zone parameter to local IANA timezone

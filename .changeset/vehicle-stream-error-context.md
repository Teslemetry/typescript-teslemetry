---
"@teslemetry/api": patch
---

Fix streaming field-update failures logging a bare, contextless error message (e.g. just "Not Found") with no indication of which vehicle or fields failed. The log now includes the VIN and the full error.

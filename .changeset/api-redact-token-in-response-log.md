---
"@teslemetry/api": patch
---

Stop logging the full response URL (including the `?token=...` access token query string) in the client's debug log - only the response path and status are logged now. Any consumer that wires a `logger` was previously writing live credentials into its own logs.

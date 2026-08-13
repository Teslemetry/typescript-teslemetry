---
"homebridge-teslemetry": patch
---

Remove the unearned "verified-by-homebridge" badge from the README (the plugin is not yet on the official verified-plugins list) and correct the energy site description: `live_status` (power flow, etc.) is delivered via real-time SSE streaming, not periodic polling — only `site_info` (backup reserve, operation mode, etc.) is polled.

---
"@teslemetry/n8n-nodes-teslemetry": minor
---

Rebuild the nodes on n8n's own HTTP helper so the package passes n8n's verification scanner. The package no longer bundles `@teslemetry/api`.

- **Teslemetry Vehicle** and **Teslemetry Energy** now group their operations by resource. Operation values are unchanged, so saved workflows keep running; the editor may ask you to pick the resource again for an operation outside the default resource.
- **Teslemetry Trigger** is now a polling trigger. Vehicle events read the cached telemetry (no credits, never wakes the car); energy events read `live_status`/`site_info`. A VIN or site is now required, and the stream-only events Credits, Config and Energy Totals are gone.

---
"@teslemetry/n8n-nodes-teslemetry": patch
---

The Teslemetry API credential now tests the access token against `/api/test` when saved, so a mistyped token is reported straight away. The credential's documentation link and the README's API reference link now point to `https://teslemetry.com/docs`; the old hosts did not resolve.

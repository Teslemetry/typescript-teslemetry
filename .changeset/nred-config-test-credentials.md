---
"@teslemetry/node-red-contrib-teslemetry": minor
---

Add a "Test credentials" button to the config node's editor, backed by a new `POST /teslemetry/test-credentials` admin route, so a token can be validated before saving instead of only failing after deploy. The route distinguishes an invalid/expired token (401/403) from any other error.

---
"@teslemetry/n8n-nodes-teslemetry": patch
---

Surface a terminal Teslemetry stream auth failure on the Trigger node as a workflow-visible error instead of leaving the trigger apparently active but silently producing no more items. Stream health handlers are now registered before the stream connects, and `closeFunction` cleanup is idempotent.

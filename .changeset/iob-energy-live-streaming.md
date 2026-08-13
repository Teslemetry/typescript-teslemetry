---
"iobroker.teslemetry": patch
---

Consume `live_status`/`site_info` SSE events per energy site so energy data keeps updating in the default streaming mode, instead of freezing after the initial startup fetch. The REST fetch still seeds a deterministic initial value; the stream now keeps it current afterward without polling.

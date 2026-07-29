---
"homebridge-teslemetry": patch
---

Energy site accessories now consume `live_status` from the account stream instead of REST-polling it, matching the vehicle streaming path. An initial REST read still seeds deterministic startup values, and the persistent stream listener picks up the SDK's cache replay on reconnect. `site_info` stays REST-driven as the primary source, with stream events opportunistically merged in between polls.

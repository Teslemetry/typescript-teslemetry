---
"@teslemetry/node-red-contrib-teslemetry": minor
---

Add Guest Mode, Valet Mode, PIN to Drive, and Speed Limit Mode commands to the vehicle command node. Password/PIN parameters are validated but never echoed into the node's error/status text on a validation failure - a bad PIN or password is redacted as `[redacted]` instead of leaking into the debug sidebar or Node-RED log.

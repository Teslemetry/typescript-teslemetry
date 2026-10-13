---
"homebridge-teslemetry": patch
---

Recover and report stream trouble. After the access token is rejected twice, the stream now tries again every 5 minutes instead of stopping until a restart. While the token is rejected or the subscription has lapsed (HTTP 402), every accessory shows No Response and commands fail; a plain reconnect keeps the last-known values. Stream errors are logged as one line that names the cause (`access token rejected`, `subscription required`, `too many connections`), without a stack trace.

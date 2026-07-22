---
"@teslemetry/homebridge-teslemetry": patch
---

Fix a service-collision bug where multiple HomeKit services sharing the same service type (`Switch`: ChargeSwitch/Defrost/Sentry/Wake; `LockMechanism`: Lock/ChargePort) collapsed onto a single instance, silently breaking every write path except the last one constructed. Service lookup now matches on subType as well as type, so each service registers and responds independently.

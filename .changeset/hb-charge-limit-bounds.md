---
"homebridge-teslemetry": patch
---

Set the Brightness characteristic's min/max/step on the charge-limit control to 50-100 (step 1), matching the telemetry clamp already applied to `ChargeLimitSoc` readings, so HomeKit itself rejects a client write outside the vehicle's supported charge-limit range instead of forwarding it to the API.

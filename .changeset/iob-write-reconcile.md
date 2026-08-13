---
"iobroker.teslemetry": patch
---

Reconcile rejected vehicle/energy writes instead of leaving the object state showing the requested value as applied: `VehicleHandler`/`EnergyHandler` now let write failures propagate to `onStateChange()` (the single place that logs and reports the error) and restore the last confirmed value on the failed state, while a successful write now explicitly acks the new value.

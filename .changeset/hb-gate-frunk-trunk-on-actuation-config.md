---
"homebridge-teslemetry": patch
---

`DoorService` now gates its frunk/trunk contact sensors on the vehicle metadata's `config.can_actuate_trunks` instead of registering them unconditionally - vehicles with manual latch-only frunk/trunk hardware no longer get contact sensors for hardware they don't have. The VIN alone can't distinguish powered from latch-only hardware within a model line, but the metadata surface can.

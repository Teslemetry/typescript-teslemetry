---
"homebridge-teslemetry": patch
---

A command that fails after HomeKit was answered no longer puts back a value that telemetry has since reported. A lock command that timed out after the car locked left the Home app showing "Unlocking" on a locked car.

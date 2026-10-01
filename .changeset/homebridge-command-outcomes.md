---
"homebridge-teslemetry": patch
---

Report what a command actually did. A command the API refuses (`result: false`) now fails in HomeKit with its reason in the log instead of showing as done, except for the benign reasons `already_set`, `not_charging` and `requested`. A command that takes longer than HomeKit's 9 second limit, such as one that first wakes the car, is no longer reported as failed: HomeKit is answered just before the limit and the tile is put back if the command then fails. Turning off Charge Limit, Backup Reserve or Operation Mode no longer leaves the tile off, and an Operation Mode speed that maps to no settable mode is rejected instead of being accepted and ignored.

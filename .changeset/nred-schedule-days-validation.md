---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Reject an invalid `msg.daysOfWeek` on `addChargeSchedule`/`addPreconditionSchedule` before calling the API, instead of only checking that it's a non-empty string. Accepts `"All"`, `"Weekdays"`, or a comma separated list of day names (e.g. `"Monday,Wednesday"`).

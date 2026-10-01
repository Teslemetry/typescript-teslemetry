---
"node-red-contrib-teslemetry": minor
---

The vehicle command node now raises a catchable error when the vehicle refuses a command (`result: false`), naming the reason (e.g. `Command refused: could_not_wake_buses`), shows it in a red status, and no longer sends the message on its output. Refusals meaning the vehicle is already in the requested state (`already_set`, `not_charging`, `requested`) still pass through as before. **Flows that branched on `msg.payload.result` to detect a failed command should handle it with a Catch node instead.**

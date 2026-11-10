---
"@teslemetry/node-red-contrib-teslemetry": minor
---

The Energy Command node can now dispatch the Powerwall battery. "Dispatch Battery Power" runs the battery at `msg.powerWatts` (positive discharges, negative charges, up to 100000 W either way) for `msg.durationSeconds` (1 to 86400), after which it returns to normal operation by itself, and "Resume Battery Operation" ends a dispatch early. Both need the site paired with Teslemetry: they are greyed out in the editor for a site that is not paired, and the node refuses them for one with a message to verify Teslemetry's key on the gateway from the Teslemetry console.

---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Make `msg.command`, `msg.historyType` and `msg.period` usable: the vehicle and energy command nodes gain a "From msg.command" option and the energy history node gains "From msg.historyType" / "From msg.period" options (a value selected in the node still takes precedence, and existing nodes are unchanged). Correct the editor labels, help text and README that named message properties and fields that do not exist (`msg.seat` for Set Seat Heater, `msg.percentage` for Set Backup Reserve, `msg.passenger_temp` for Set Temps, top-level arguments rather than `msg.payload`, the `VehicleSpeed`/`Odometer`/`BatteryLevel` signal names, the Signal node's non-existent `msg.field`, and the rear trunk toggle), and document the energy history and energy event nodes, raw units and `null` values.

---
"@teslemetry/node-red-contrib-teslemetry": minor
---

The Vehicle Command node lists every Teslemetry API vehicle command, grouped and with its credit cost, and shows a field for each of the selected command's arguments. A field can be a fixed value or read from `msg`, `flow`, `global`, an environment variable or JSONata, and reads `msg.payload.<field>` by default. Cybertruck-only commands are listed only for a Cybertruck. Nodes saved with an earlier command name keep working unchanged.

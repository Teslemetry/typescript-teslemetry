---
"@teslemetry/node-red-contrib-teslemetry": minor
---

The Energy Command node lists every Teslemetry API energy site command, with a field for each argument, and runs any of them from `msg.command` by its route name with its arguments in `msg.payload`. This adds backup events, gateway config and diagnostics. Commands that need a key the gateway trusts are offered for a site paired with Teslemetry or with a Local gateway, and backup reserve, operation mode, grid export, dispatch and island mode go to the Local gateway first. Nodes saved with an earlier command name keep working unchanged.

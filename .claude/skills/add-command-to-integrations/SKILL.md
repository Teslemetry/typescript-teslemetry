---
name: add-command-to-integrations
description: Use when a new @teslemetry/api vehicle or energy command method must reach the integrations - wire it into the Node-RED command nodes, the n8n operations and, if a HomeKit control fits, homebridge.
---

# Add an SDK command to the integrations

Only **commands** (writes) need this. A new telemetry field needs no code: the Node-RED signal node and the n8n Trigger's Signal event read `getFields()`. Reads are already covered by `vehicleData()`/`getLiveStatus()`/`getSiteInfo()`.

1. **SDK method first.** The method must exist on `TeslemetryVehicleApi`/`TeslemetryEnergyApi`. If it does not, use the `regenerate-api-client` skill.

2. **Node-RED** (`packages/node-red-contrib-teslemetry`):
   - Add a `case "<method>":` to the `switch (command)` in `src/nodes/teslemetry-vehicle-command.ts` (energy: `teslemetry-energy-command.ts`).
   - Arguments come from the top level of `msg` (`msg.percent`), not `msg.payload`. Validate them with `validateParameters(msg, {...})` from `src/validation.ts` before the call. Convert user-friendly forms there (see `timeToMinutesOfDay()`).
   - Do not handle `result: false`: `checkCommandResult()` already throws on a refusal that is not benign.
   - Add an `<option value="<method>">Label (msg.arg)</option>` to the Command list in the matching `.html`. Name the `msg` properties in the label. Document new inputs in the `data-help-name` section.
   - Add the command to the command list in `README.md`.
   - Add a case to `test/teslemetry-vehicle-command.test.ts` (or `teslemetry-energy-command.test.ts`).

3. **n8n** (`packages/n8n-nodes-teslemetry`):
   - In `src/nodes/TeslemetryVehicle.node.ts` (energy: `TeslemetryEnergy.node.ts`), add an `options` entry (`name`, `value`, `action`) to the operation list.
   - Add one property per argument, shown only for that operation with `displayOptions: { show: { operation: ['<method>'] } }`.
   - Add a `case '<method>':` to the `execute` switch. Read arguments with `this.getNodeParameter('<name>', itemIndex)`.
   - Add the operation to `README.md`.
   - Add a row (operation, params, expected path and body) to the table in `test/vehicleExecute.test.ts` (or `energyExecute.test.ts`).

4. **homebridge** (`packages/homebridge-teslemetry`): only if a HomeKit control maps onto the command with no forced meaning (on/off → Switch, percent → Lightbulb Brightness, open/close → WindowCovering or LockMechanism). If the command fits an existing service, add a `registerCharacteristicSet` handler there and call `this.command(vehicle.api.<method>(...))`. If not, use the `add-homebridge-service` skill. If nothing fits, leave homebridge unwired.

5. **Check and release.**
   ```bash
   pnpm build
   pnpm --filter node-red-contrib-teslemetry test
   pnpm --filter n8n-nodes-teslemetry test
   pnpm --filter homebridge-teslemetry test   # if touched
   pnpm -r --no-bail tsc
   pnpm lint
   pnpm changeset                             # minor bump for each package that gains a command
   ```

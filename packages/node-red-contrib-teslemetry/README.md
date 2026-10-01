# Node-RED Teslemetry Integration

[![npm version](https://img.shields.io/npm/v/@teslemetry/node-red-contrib-teslemetry.svg)](https://www.npmjs.com/package/@teslemetry/node-red-contrib-teslemetry)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Node-RED nodes for controlling Tesla vehicles and energy sites via the [Teslemetry](https://teslemetry.com) API.

## Features

- 🚗 **Vehicle Control**: Lock/unlock, climate, charging, navigation, and more
- ⚡ **Energy Management**: Monitor and control Powerwall and Solar systems
- 📡 **Real-Time Events**: React to vehicle state changes via Server-Sent Events
- 🎯 **Signal Monitoring**: Track specific vehicle data fields (speed, battery, etc.)
- 🔄 **Full API Coverage**: Access all Teslemetry API features

## Installation

### From npm (Recommended)

Navigate to your Node-RED user directory (usually `~/.node-red`) and install:

```bash
cd ~/.node-red
npm install @teslemetry/node-red-contrib-teslemetry
```

Then restart Node-RED.

### From Node-RED Palette Manager

1. Open Node-RED in your browser
2. Go to **Menu** → **Manage palette**
3. Click the **Install** tab
4. Search for `@teslemetry/node-red-contrib-teslemetry`
5. Click **Install**

### Local Development

```bash
cd ~/.node-red
npm install /path/to/packages/node-red-contrib-teslemetry
```

## Prerequisites

1. **Teslemetry Account**: Sign up at [teslemetry.com](https://teslemetry.com)
2. **Access Token**: Generate an API access token from your Teslemetry dashboard
3. **Tesla Virtual Key**: Configure virtual key access for your vehicle(s)

## Configuration

1. Drag a Teslemetry node onto your flow
2. Double-click to edit and add a new **Teslemetry Config**
3. Enter your Teslemetry access token
4. Save and deploy

## Nodes

### teslemetry-config
Configuration node to store your Teslemetry Access Token.

### teslemetry-vehicle-command
Send commands to a specific vehicle or retrieve vehicle data.

**Configuration:**
- **VIN**: Select a vehicle or leave empty to use `msg.vin`.
- **Command**: Select a command, or choose **From msg.command** to take it from each message.

A VIN or command selected in the node always wins; `msg.vin` and `msg.command` are only read when the matching dropdown is set to its **From msg…** option. Command arguments are read from the top level of the message (`msg.percent`, not `msg.payload.percent`).

**Inputs:**
- `msg.vin` (string): VIN of the vehicle (when VIN is **From msg.vin**).
- `msg.command` (string): Command to execute, e.g. `lockDoors` (when Command is **From msg.command**).
- `msg.driver_temp` (number): Driver temperature for `setTemps`.
- `msg.passenger_temp` (number): Passenger temperature for `setTemps`.
- `msg.seat` (string): Seat position for `setSeatHeater` (e.g., `front_left`).
- `msg.level` (number): Heat level (0-3) for `setSeatHeater`.
- `msg.percent` (number): Charge limit percentage for `setChargeLimit`.
- `msg.amps` (number): Charging amps for `setChargingAmps`.
- `msg.lat` (number): Latitude for `triggerHomelink`.
- `msg.lon` (number): Longitude for `triggerHomelink`.
- `msg.value` (string): Address or text for `navigationRequest`.

### teslemetry-energy-command
Send commands to a Tesla Energy Site or retrieve site status.

**Configuration:**
- **Site ID**: Select a site or leave empty to use `msg.siteId`.
- **Command**: Select a command, or choose **From msg.command** to take it from each message.

A site or command selected in the node always wins; `msg.siteId` and `msg.command` are only read when the matching dropdown is set to its **From msg…** option. Command arguments are read from the top level of the message, not from `msg.payload`.

**Inputs:**
- `msg.siteId` (number): Energy Site ID (when Site ID is **From msg.siteId**).
- `msg.command` (string): Command to execute, e.g. `setStormModeOn` (when Command is **From msg.command**).
- `msg.percentage` (number): Backup reserve percentage for `setBackupReserve`.
- `msg.percent` (number): Off-grid reserve percentage for `setOffGridVehicleChargingReserve`.
- `msg.tariffContentV2` (object): Full time-of-use tariff document for `setTimeOfUseSettings`, matching the `TariffContentV2` shape (`version`, `utility`, `code`, `name`, `currency`, `daily_charges`, `demand_charges`, `energy_charges`, `seasons` required). **Replaces the site's entire time-of-use schedule** - it is not merged with the existing schedule.

### teslemetry-energy-history
Retrieve historical data for a Tesla Energy Site.

**Configuration:**
- **Site ID**: Select a site, or choose **From msg.siteId**.
- **History Type**: **Energy History** (solar, battery and grid energy), **Backup History** (off-grid events) or **Telemetry (Charging)** (Wall Connector charging history), or choose **From msg.historyType**.
- **Period**: Day, Week, Month or Year, or choose **From msg.period**. Not used for Telemetry (Charging).
- **Start Date** / **End Date** / **Time Zone**: Leave empty to use `msg.startDate` / `msg.endDate` / `msg.timeZone`.

A value set in the node always wins; the matching message property is only read when the node's own value is empty or **From msg…**.

**Inputs:**
- `msg.siteId` (number): Energy Site ID.
- `msg.historyType` (string): `energy`, `backup` or `telemetry` (defaults to `energy`).
- `msg.period` (string): `day`, `week`, `month` or `year` (defaults to `day`).
- `msg.startDate` / `msg.endDate` (string): Date-time with a UTC offset, e.g. `2026-01-15T00:00:00-08:00`.
- `msg.timeZone` (string): IANA time zone, e.g. `America/Los_Angeles`.

**Outputs:**
- `msg.payload`: The history response from the API.

### teslemetry-energy-event
Listen for real-time Server-Sent Events (SSE) from one Tesla Energy Site.

**Configuration:**
- **Site ID**: The site to listen to (required - this node cannot listen across all sites).
- **Event Type**: The type of event to listen for.

**Event Types:**
- **all**: Every event type below
- **live_status**: Live power flow (solar, battery, grid, load, Wall Connectors)
- **site_info**: Site configuration changes
- **tariff_content_v2**: Time-of-use tariff changes; `null` means the tariff was removed
- **energy_totals**: Daily energy totals

**Outputs:**
- `msg.payload`: The whole event object. Its data sits under a key named after the event type - e.g. `msg.payload.live_status.solar_power` - except `energy_totals`, which carries `date` and `totals` at the top level.
- `msg.topic`: The event type that fired
- `msg.siteId`: The Energy Site ID the event belongs to

### teslemetry-event
Listen for real-time Server-Sent Events (SSE) from Teslemetry.

**Configuration:**
- **VIN**: Filter events for a specific vehicle (optional).
- **Event Type**: The type of event to listen for.

**Event Types:**
- **all**: Stream all events
- **data**: Real-time telemetry data updates
- **state**: State changes (online/asleep/charging)
- **vehicle_data**: Full vehicle data snapshots
- **errors**: Vehicle error events
- **alerts**: Vehicle alerts and notifications
- **connectivity**: Connection status changes
- **credits**: API credit usage updates
- **config**: Configuration changes

**Outputs:**
- `msg.payload`: The event data object
- `msg.topic`: The event type

### teslemetry-signal
Listen for specific signal changes from a vehicle.

**Configuration:**
- **VIN**: The vehicle to monitor
- **Field**: The specific signal field to listen for (e.g., `VehicleSpeed`, `Odometer`, `BatteryLevel`). Both are chosen in the node - it has no input, so neither can come from a message.

**Outputs:**
- `msg.payload`: The new value of the signal
- `msg.topic`: `signal`
- `msg.field`: The name of the field

Signal fields use the streaming names shown in the dropdown, which differ from the `vehicle_data` names returned by **Get Vehicle Data** (`BatteryLevel` there is `charge_state.battery_level`).

### Units and `null` values

Values are passed through exactly as the vehicle or site reports them; nothing is converted to your locale.

- Vehicle distances are in miles and speeds in mph regardless of the car's display setting - `Odometer` is miles, `VehicleSpeed` is mph. `BatteryLevel` is a percentage (0-100).
- Energy site values are likewise the raw numbers Tesla reports.
- Any signal value can be `null` when the vehicle has no reading for that field. Check for it before comparing: in JavaScript `null < 20` is `true`.

### teslemetry-wall-connector
Splits an Energy Site's `wall_connectors` array (e.g. from a `teslemetry-energy-event` `live_status` message) into one message per connector.

**Configuration:**
- **DIN Filter**: Only emit the connector matching this DIN, or leave empty to emit all (optional; can also come from `msg.din`).

**Inputs:**
- `msg.payload` (object | array): A `teslemetry-energy-event` `live_status` message (array at `payload.live_status.wall_connectors`), a `live_status`-shaped object with a `wall_connectors` array, or that array directly.
- `msg.din` (string, optional): Restrict output to one DIN for this message.

**Outputs (one per matching connector):**
- `msg.payload`: The connector's raw object
- `msg.topic`: The connector's DIN
- `msg.din`: The connector's DIN

A DIN absent from the input emits nothing for that DIN - it does not send a synthetic "offline" event.

## Usage Examples

### Example 1: Lock Vehicle When Leaving Home

1. Add a **geofence** or **location** trigger node
2. Add a **function** node to set `msg.command = "lockDoors"`
3. Add a **teslemetry-vehicle-command** node with your VIN configured and Command set to **From msg.command**
4. Connect them together

### Example 2: Start Climate Control on Schedule

1. Add an **inject** node configured for your departure time
2. Add a **teslemetry-vehicle-command** node
3. Set Command to **Start HVAC**
4. Set temperatures using **setTemps** with `msg.driver_temp` and `msg.passenger_temp`

### Example 3: Monitor Charging and Send Notifications

1. Add a **teslemetry-event** node
2. Set Event Type to **data**
3. Add a **function** node to filter charging-related updates
4. Add an **email** or **pushover** node for notifications
5. Send alert when charging completes

### Example 4: Alert on Low Battery

1. Add a **teslemetry-signal** node
2. Set Field to `BatteryLevel`
3. Add a **switch** node to check if value is not `null` and < 20
4. Add notification node (email/SMS/Pushover)

## Available Vehicle Commands

- **Get Vehicle Data**: Retrieves comprehensive vehicle information
- **Wake Up**: Wakes up the vehicle from sleep
- **Flash Lights**: Flashes the headlights
- **Honk Horn**: Honks the horn
- **Lock/Unlock Doors**: Controls door locks
- **Remote Start**: Enables keyless driving
- **Actuate Trunk**: Opens the front trunk; toggles the rear trunk (a powered rear trunk that is open closes)
- **Tonneau**: Opens/closes the tonneau cover (Cybertruck)
- **Sunroof**: Vent/close/stop (legacy Model S/X with a panoramic sunroof)
- **Climate Control**: Start/stop HVAC, set temps, seat heaters, steering wheel heater, cabin overheat protection, auto seat/steering-wheel climate
- **Charging**: Start/stop, open/close port, set limit, set amps, scheduled charging/departure
- **Charge/Precondition Schedules**: Add/update or remove location-based charge and precondition schedules
- **Sentry Mode**: Enable/disable Sentry Mode
- **Homelink**: Trigger Homelink at specific coordinates
- **Navigation**: Send destination to vehicle navigation
- **Media**: Set absolute volume (compose relative up/down from the
  `MediaAudioVolume`/`MediaAudioVolumeIncrement` signals in a function node)
- **Software Update**: Schedule (or install now) or cancel a pending update
- **Guest Mode**: Enable/disable Guest Mode
- **Valet Mode**: Enable/disable (requires `msg.password`), plus reset a forgotten valet PIN
- **PIN to Drive**: Enable/disable (requires `msg.password`), plus admin-clear or reset a lost PIN
- **Speed Limit Mode**: Activate/deactivate/clear PIN (requires `msg.pin`), admin-clear a lost PIN, or set the limit in mph

## Available Energy Commands

- **Get Live Status**: Live power usage details
- **Get Site Info**: Configuration and site details
- **Set Backup Reserve**: Set battery reserve percentage
- **Set Operation Mode**: Self Consumption, Backup, or Autonomous
- **Set Storm Mode**: Enable/disable Storm Mode
- **Grid Import/Export**: Configure grid export rules (Everything, Solar Only, Nothing)
- **Off-Grid Reserve**: Set vehicle charging reserve for off-grid operation

## Resources

- **Teslemetry Documentation**: https://teslemetry.com/docs
- **API Reference**: https://developer.teslemetry.com
- **Support**: https://github.com/Teslemetry/typescript-teslemetry/issues

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/Teslemetry/typescript-teslemetry) for contribution guidelines.

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
- **Command**: Select a command or leave empty to use `msg.command`.

**Inputs:**
- `msg.vin` (string): VIN of the vehicle (if not configured).
- `msg.command` (string): Command to execute (if not configured).
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
- **Command**: Select a command or leave empty to use `msg.command`.

**Inputs:**
- `msg.siteId` (number): Energy Site ID (if not configured).
- `msg.command` (string): Command to execute (if not configured).
- `msg.percentage` (number): Backup reserve percentage for `setBackupReserve`.
- `msg.percent` (number): Off-grid reserve percentage for `setOffGridVehicleChargingReserve`.

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
- **Field**: The specific signal field to listen for (e.g., `speed`, `odometer`, `battery_level`)

**Outputs:**
- `msg.payload`: The new value of the signal
- `msg.topic`: `signal`
- `msg.field`: The name of the field

## Usage Examples

### Example 1: Lock Vehicle When Leaving Home

1. Add a **geofence** or **location** trigger node
2. Add a **function** node to set `msg.command = "lockDoors"`
3. Add a **teslemetry-vehicle-command** node with your VIN configured
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
2. Set Field to `battery_level`
3. Add a **switch** node to check if value < 20
4. Add notification node (email/SMS/Pushover)

## Available Vehicle Commands

- **Get Vehicle Data**: Retrieves comprehensive vehicle information
- **Wake Up**: Wakes up the vehicle from sleep
- **Flash Lights**: Flashes the headlights
- **Honk Horn**: Honks the horn
- **Lock/Unlock Doors**: Controls door locks
- **Remote Start**: Enables keyless driving
- **Actuate Trunk**: Opens/closes front or rear trunk
- **Tonneau**: Opens/closes the tonneau cover (Cybertruck)
- **Climate Control**: Start/stop HVAC, set temps, seat heaters, steering wheel heater, cabin overheat protection, auto seat/steering-wheel climate
- **Charging**: Start/stop, open/close port, set limit, set amps, scheduled charging/departure
- **Sentry Mode**: Enable/disable Sentry Mode
- **Homelink**: Trigger Homelink at specific coordinates
- **Navigation**: Send destination to vehicle navigation
- **Software Update**: Schedule (or install now) or cancel a pending update

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

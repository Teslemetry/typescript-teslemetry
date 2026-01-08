# n8n Teslemetry Integration

[![npm version](https://img.shields.io/npm/v/@teslemetry/n8n-nodes-teslemetry.svg)](https://www.npmjs.com/package/@teslemetry/n8n-nodes-teslemetry)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

n8n community nodes for controlling Tesla vehicles and energy sites via the [Teslemetry](https://teslemetry.com) API.

## Features

- 🚗 **Vehicle Control**: Lock/unlock, climate, charging, navigation, and more
- ⚡ **Energy Management**: Monitor and control Powerwall and Solar systems
- 📡 **Real-Time Events**: Trigger workflows based on vehicle state changes
- 🔄 **Full API Coverage**: Access all Teslemetry API features

## Installation

### Community Nodes Installation (Recommended)

1. In your n8n instance, go to **Settings** → **Community Nodes**
2. Search for `@teslemetry/n8n-nodes-teslemetry`
3. Click **Install**
4. Restart n8n

### Manual Installation

```bash
npm install @teslemetry/n8n-nodes-teslemetry
```

For self-hosted n8n instances, you can also install via:

```bash
cd ~/.n8n/nodes
npm install @teslemetry/n8n-nodes-teslemetry
```

Then restart your n8n instance.

## Prerequisites

1. **Teslemetry Account**: Sign up at [teslemetry.com](https://teslemetry.com)
2. **Access Token**: Generate an API access token from your Teslemetry dashboard
3. **Tesla Virtual Key**: Configure virtual key access for your vehicle(s)

## Configuration

1. In n8n, add a new credential of type **Teslemetry API**
2. Enter your Teslemetry access token
3. Save the credential

## Nodes

### Teslemetry Vehicle
Perform operations on your Tesla vehicles.

**Operations:**
- **Get Vehicle Data**: Retrieves comprehensive data.
- **Wake Up**: Wakes up the vehicle.
- **Flash Lights**: Flashes the headlights.
- **Honk Horn**: Honks the horn.
- **Lock/Unlock Doors**: Controls door locks.
- **Remote Start**: Enables keyless driving.
- **Actuate Trunk**: Opens/Closes front or rear trunk.
- **Climate Control**: Start/Stop HVAC, Set Temps, Seat Heaters, Steering Wheel Heater.
- **Charging**: Start/Stop, Open/Close Port, Set Limit, Set Amps.
- **Sentry Mode**: Enable/Disable Sentry Mode.
- **Homelink**: Trigger Homelink.
- **Navigation Request**: Send a destination to the vehicle navigation.

### Teslemetry Energy
Interact with Tesla Energy sites (Solar/Powerwall).

**Operations:**
- **Get Live Status**: Live power usage details.
- **Get Site Info**: Configuration and site details.
- **Set Backup Reserve**: Set the battery reserve percentage.
- **Set Operation Mode**: Self Consumption, Backup, or Autonomous.
- **Set Storm Mode**: Enable/Disable Storm Mode.
- **Grid Import/Export**: Configure grid export rules.
- **Off-Grid Reserve**: Set vehicle charging reserve for off-grid operation.

### Teslemetry Trigger
Trigger workflows based on real-time vehicle events via Server-Sent Events (SSE).

**Event Types:**
- **All Events**: Stream all events
- **Data**: Real-time telemetry data updates
- **State**: State changes (online/asleep/charging)
- **Vehicle Data**: Full vehicle data snapshots
- **Errors**: Vehicle error events
- **Alerts**: Vehicle alerts and notifications
- **Connectivity**: Connection status changes
- **Credits**: API credit usage updates
- **Config**: Configuration changes
- **Signal**: Monitor specific fields (e.g., `speed`, `odometer`, `battery_level`)

## Usage Examples

### Example 1: Lock Vehicle When Leaving Home

1. Add a **Teslemetry Vehicle** node
2. Select your vehicle VIN
3. Choose operation: **Lock Doors**
4. Trigger this workflow based on your location or schedule

### Example 2: Start Climate Control Before Departure

1. Add a **Schedule Trigger** for your departure time
2. Add a **Teslemetry Vehicle** node
3. Select operation: **Start HVAC**
4. Set desired temperatures

### Example 3: Monitor Charging Status

1. Add a **Teslemetry Trigger** node
2. Set event type to **Data**
3. Filter for charging-related updates
4. Send notifications when charging completes

### Example 4: Alert on Low Battery

1. Add a **Teslemetry Trigger** node
2. Set event type to **Signal**
3. Select signal: `battery_level`
4. Add an **IF** node to check if battery < 20%
5. Send notification via email/SMS

## Resources

- **Teslemetry Documentation**: https://teslemetry.com/docs
- **API Reference**: https://developer.teslemetry.com
- **Support**: https://github.com/Teslemetry/typescript-teslemetry/issues

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/Teslemetry/typescript-teslemetry) for contribution guidelines.
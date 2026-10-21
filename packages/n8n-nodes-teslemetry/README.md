# n8n Teslemetry Integration

[![npm version](https://img.shields.io/npm/v/@teslemetry/n8n-nodes-teslemetry.svg)](https://www.npmjs.com/package/@teslemetry/n8n-nodes-teslemetry)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

n8n community nodes for controlling Tesla vehicles and energy sites via the [Teslemetry](https://teslemetry.com) API.

## Features

- 🚗 **Vehicle Control**: Lock/unlock, climate, charging, navigation, and more
- ⚡ **Energy Management**: Monitor and control Powerwall and Solar systems
- 📡 **Change Events**: Trigger workflows when vehicle telemetry or energy site status changes

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
Perform operations on your Tesla vehicles. Operations are grouped by resource: **Vehicle**, **Doors and Closure**, **Climate** and **Charging**.

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
Interact with Tesla Energy sites (Solar/Powerwall). Operations are grouped by resource: **Status** and **Setting**.

**Operations:**
- **Get Live Status**: Live power usage details.
- **Get Site Info**: Configuration and site details.
- **Get Tariff**: Time-of-use rate schedule.
- **Set Backup Reserve**: Set the battery reserve percentage.
- **Set Operation Mode**: Self Consumption, Backup, or Autonomous.
- **Set Storm Mode**: Enable/Disable Storm Mode.
- **Grid Import/Export**: Configure grid export rules.
- **Off-Grid Reserve**: Set vehicle charging reserve for off-grid operation.

### Teslemetry Trigger
A polling trigger: it checks Teslemetry on the node's **Poll Times** schedule (every minute by default) and starts the workflow once for each value that changed since the previous check. The first check after you activate the workflow only records the current values. A manual test run returns the current values.

**Vehicle events** read the vehicle's cached telemetry (`GET /api/1/vehicles/{vin}/telemetry`). This read never wakes the vehicle, never calls Tesla, and costs no credits, so a short poll interval is free. The vehicle must stream the fields you watch (add them in the Teslemetry console).
- **Any Change**: Any change to the topics below
- **Data**: Any telemetry field changed (the item lists only the changed fields)
- **Signal**: One telemetry field changed (choose the field)
- **State**: The vehicle went online, asleep or offline
- **Connectivity**: A network interface connected or disconnected
- **Alerts**, **Errors**, **Vehicle Data**: The topic's cached value changed

**Energy site events** read the site's `live_status` or `site_info`. Teslemetry serves both from its own cache, which it refreshes about every 30 seconds (live status) and every 5 minutes (site info), so polling faster than that returns the same values. Credits are charged only when Teslemetry fetches fresh data from Tesla, not for cache reads.
- **Live Status**: Power flows, battery level and grid status
- **Site Info**: Settings such as backup reserve and operation mode
- **Tariff Content**: The site tariff changed, or was removed (`tariff_content_v2: null`)

Earlier versions streamed events over Server-Sent Events (SSE). n8n Cloud does not allow the long-lived reconnecting connection a stream needs, so the trigger now polls. The stream-only events **Credits**, **Config** and **Energy Totals**, and the "all vehicles"/"all sites" choice, are no longer available.

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
2. Set event type to **Signal** and the field to `DetailedChargeState`
3. Add an **IF** node that checks `{{ $json.value }}` is `DetailedChargeStateComplete`
4. Send a notification when charging completes

### Example 4: Alert on Low Battery

1. Add a **Teslemetry Trigger** node
2. Set event type to **Signal**
3. Select the field `BatteryLevel`
4. Add an **IF** node to check if `{{ $json.value }}` < 20
5. Send notification via email/SMS

## Resources

- **Teslemetry Documentation**: https://teslemetry.com/docs
- **API Reference**: https://teslemetry.com/docs
- **Support**: https://github.com/Teslemetry/typescript-teslemetry/issues

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/Teslemetry/typescript-teslemetry) for contribution guidelines.
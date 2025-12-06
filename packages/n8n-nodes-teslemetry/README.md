# n8n Teslemetry Integration

n8n nodes for interacting with Tesla vehicles and energy sites via [Teslemetry](https://teslemetry.com).

## Installation

To use these nodes in your n8n instance, you would typically place them in the `.n8n/nodes` directory or install them as a local package.

### Local Development Installation

1.  Clone this repository.
2.  Build the n8n nodes package:
    ```bash
    cd packages/n8n-nodes-teslemetry
    npm install
    npm run build
    ```
3.  Link the package to your n8n instance. Depending on your n8n setup, this might involve:
    ```bash
    cd /path/to/your/n8n/installation
    npm install /path/to/this/repository/packages/n8n-nodes-teslemetry
    # or if using pnpm workspace
    pnpm link /path/to/this/repository/packages/n8n-nodes-teslemetry
    ```
    Then restart your n8n instance.

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
- **All Events**: Stream all events.
- **Data**: Data updates.
- **State**: State changes (online/asleep).
- **Vehicle Data**: Full vehicle data snapshots.
- **Alerts**: Vehicle alerts.
- **Connectivity**: Connection status changes.
- **Signal**: Trigger when a specific field (e.g., `speed`, `odometer`) changes value.

## Credentials

### Teslemetry API
Requires a Teslemetry Access Token.
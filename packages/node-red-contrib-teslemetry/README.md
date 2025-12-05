# Node-RED Teslemetry Integration

Node-RED nodes for interacting with Tesla vehicles and energy sites via [Teslemetry](https://teslemetry.com).

## Installation

Local installation (for development):

```bash
cd ~/.node-red
npm install /path/to/packages/node-red-contrib-teslemetry
```

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
- **Event Type**: The type of event to listen for (e.g., `vehicle_data`, `state`, `alerts`).

**Outputs:**
- `msg.payload`: The event data object.
- `msg.topic`: The event type.

### teslemetry-signal
Listen for specific signal changes from a vehicle.

**Configuration:**
- **VIN**: The vehicle to monitor.
- **Field**: The specific signal field to listen for (e.g., `speed`, `odometer`).

**Outputs:**
- `msg.payload`: The new value of the signal.
- `msg.topic`: `signal`.
- `msg.field`: The name of the field.

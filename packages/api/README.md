# Teslemetry TypeScript SDK

The official TypeScript/JavaScript client for the [Teslemetry](https://teslemetry.com) API.

This library provides a strictly typed, easy-to-use wrapper for interacting with Tesla vehicles and energy sites. It supports standard API commands, state retrieval, and real-time streaming data via Server-Sent Events (SSE).

## 📚 Documentation

- **[Teslemetry API Reference](https://api.teslemetry.com/docs)**: Detailed documentation for all API endpoints, parameters, and response values.
- **[Tesla Fleet API](https://developer.tesla.com/docs/fleet-api)**: Official Tesla documentation for underlying vehicle commands and data.

## Installation

```bash
npm install @teslemetry/api
# or
pnpm add @teslemetry/api
# or
yarn add @teslemetry/api
```

## Quick Start

```typescript
import { Teslemetry } from "@teslemetry/api";

// Initialize with your access token
const teslemetry = new Teslemetry(process.env.TESLEMETRY_ACCESS_TOKEN);

// Get a specific vehicle
const vin = "5YJ...";
const vehicle = teslemetry.getVehicle(vin);

// 1. Get Vehicle State
const state = await vehicle.api.state();
console.log("Vehicle State:", state);

// 2. Send a Command (e.g., Flash Lights)
await vehicle.api.flashLights();

// 3. Stream Real-time Data
vehicle.sse.onSignal("Speed", (speed) => {
  console.log(`Current Speed: ${speed} mph`);
});

// Connect to the stream
await teslemetry.sse.connect();
```

## Usage

### Initialization

The `Teslemetry` class is the main entry point. It automatically handles region detection (NA/EU) upon the first request, or you can specify it manually.

```typescript
import { Teslemetry } from "@teslemetry/api";

// Automatic region detection (recommended)
const teslemetry = new Teslemetry("YOUR_ACCESS_TOKEN");

// Manual region specification
const teslemetryEu = new Teslemetry("YOUR_ACCESS_TOKEN", { region: "eu" });
```

### Vehicle API

Use `getVehicle(vin)` to interact with a vehicle. This returns an object containing two specialized handlers:
- `api`: for standard REST API calls (commands, state).
- `sse`: for real-time streaming.

#### Commands & State
The `.api` property contains methods for all supported Tesla commands.

```typescript
const vehicle = teslemetry.getVehicle("VIN...");

// Get full vehicle data
const data = await vehicle.api.vehicleData();

// Climate Control
await vehicle.api.autoConditioningStart();
await vehicle.api.setTemps(20, 20); // Driver, Passenger (Celsius)

// Charging
await vehicle.api.chargeStart();
await vehicle.api.setChargeLimit(80);

// Locking
await vehicle.api.lockDoors();
```

> **Note:** For a comprehensive list of all available methods and their parameters, please refer to the [Teslemetry API Docs](https://teslemetry.com/docs/api). The SDK methods map 1:1 with these endpoints.

#### Real-time Streaming (SSE)
The `.sse` property allows you to subscribe to specific vehicle signals.

```typescript
// Subscribe to signals
vehicle.sse.onSignal("PackCurrent", (val) => console.log("Current:", val));
vehicle.sse.onSignal("ChargerVoltage", (val) => console.log("Voltage:", val));

// Monitor connection status
teslemetry.sse.onConnection((isConnected) => {
  console.log(isConnected ? "Stream Connected" : "Stream Disconnected");
});

// Start streaming (connects to the shared Teslemetry stream)
await teslemetry.sse.connect();

// Stop streaming
teslemetry.sse.disconnect();
```

### Energy API

Interact with Tesla Energy sites (Solar, Powerwall, Wall Connector).

```typescript
// Get an energy site instance by Site ID
const site = teslemetry.energySite(12345);

// Get site status and info
const status = await site.getLiveStatus();
const info = await site.getSiteInfo();

// Control operations
await site.setBackupReserve(20); // Set backup reserve to 20%
await site.setOperationMode("autonomous");
```

### Account & Discovery

If you don't know your VINs or Site IDs, you can discover all products on your account.

```typescript
// Fetch all vehicles and energy sites
const products = await teslemetry.createProducts();

// Access discovered vehicles
for (const vin in products.vehicles) {
  const vehicle = products.vehicles[vin];
  console.log(`Found ${vehicle.name} (${vehicle.vin})`);
  
  // Use the API immediately
  await vehicle.api.honkHorn();
}

// Access discovered energy sites
for (const siteId in products.energySites) {
  const site = products.energySites[siteId];
  console.log(`Found Site: ${site.name} (${site.site})`);
}
```

### Error Handling

The SDK throws standard Javascript `Error` objects for configuration issues and specific errors for API failures. Streaming errors (like connection drops) are emitted via the stream error handler or specific exception classes.

```typescript
import { TeslemetryStreamConnectionError } from "@teslemetry/api";

try {
  await vehicle.api.wakeUp();
} catch (error) {
  console.error("Failed to wake up vehicle:", error);
}
```

## License

Apache-2.0

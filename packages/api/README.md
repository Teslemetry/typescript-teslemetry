# Teslemetry TypeScript API

The official TypeScript/JavaScript client for the [Teslemetry](https://teslemetry.com) API.

This library provides a convenient wrapper for interacting with Tesla vehicles and energy sites via the Teslemetry service, including support for standard API commands and real-time streaming data (Server-Sent Events).

Further information about each API method can be found in the [Teslemetry API Documentation](https://teslemetry.com/docs/api), and [Tesla Fleet API Documentation](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-commands).

## Features

- 🚗 **Vehicle API**: Full control and state retrieval (lock/unlock, climate, charging, etc.).
- ⚡ **Energy API**: Monitor and control Tesla Energy sites (Solar, Powerwall).
- 📡 **Streaming (SSE)**: Real-time vehicle data streaming with `TeslemetryStream`.
- 🌍 **Region Aware**: Automatic region detection and handling (NA/EU).
- 🔒 **Type-Safe**: Built with TypeScript for full type inference and safety.

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

const token = process.env.TESLEMETRY_ACCESS_TOKEN;
const vin = process.env.TESLEMETRY_VIN;

const teslemetry = new Teslemetry(token);

// Get a vehicle instance
const vehicle = teslemetry.getVehicle(vin);

// API: Get vehicle state
const {response} = await vehicle.api.state();
console.log("State:", response.state);

// API: Send a command
await vehicle.api.flashLights();

// Stream: Listen for real-time data
vehicle.sse.onSignal("Speed", (speed) => {
  console.log(`Current Speed: ${speed}`);
});

await teslemetry.sse.connect();
```

## Usage

### Initialization

Initialize the `Teslemetry` client with your access token. You can optionally specify a region ("na" or "eu"), otherwise it will be automatically detected.

```typescript
import { Teslemetry } from "@teslemetry/api";

const teslemetry = new Teslemetry("YOUR_ACCESS_TOKEN");
// or with specific region
const teslemetryEu = new Teslemetry("YOUR_ACCESS_TOKEN", "eu");
```

### Vehicle Control

The `getVehicle(vin)` method returns an object containing both `api` and `sse` handlers for a specific vehicle.

```typescript
const myCar = teslemetry.getVehicle("VIN123456789");

// Get vehicle state
const state = await myCar.api.state();

// Commands
await myCar.api.doorLock();
await myCar.api.autoConditioningStart();
await myCar.api.chargeStart();
```

### Real-time Streaming (SSE)

Teslemetry supports streaming vehicle data updates via Server-Sent Events.

```typescript
const myCar = teslemetry.getVehicle("VIN123456789");

// Subscribe to specific signals
myCar.sse.onSignal("PackCurrent", (val) => console.log("Current:", val));
myCar.sse.onSignal("ChargerVoltage", (val) => console.log("Voltage:", val));

// Handle connection status
teslemetry.sse.onConnection((isConnected) => {
  console.log(isConnected ? "Connected!" : "Disconnected");
});

// Start the stream
await teslemetry.sse.connect();

// Stop streaming
teslemetry.sse.disconnect();
```

### Energy Sites

Interact with Tesla Energy products.

```typescript
const site = teslemetry.energySite(12345);
const data = await site.getSiteInfo();
```

## Development

To build the package locally:

```bash
pnpm install
pnpm build
```

## License

Apache-2.0

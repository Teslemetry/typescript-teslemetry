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
vehicle.sse.onSignal("VehicleSpeed", (speed) => {
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
await vehicle.api.startAutoConditioning();
await vehicle.api.setTemps(20, 20); // Driver, Passenger (Celsius)

// Charging
await vehicle.api.startCharging();
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
teslemetry.sse.on("connect", () => console.log("Stream Connected"));
teslemetry.sse.on("disconnect", () => console.log("Stream Disconnected"));

// Start streaming (connects to the shared Teslemetry stream)
await teslemetry.sse.connect();

// Stop streaming
teslemetry.sse.disconnect();
```

##### Stream errors and reconnecting

The stream reconnects automatically with exponential backoff (2 seconds,
doubling up to 60), re-resolving your access token callback on every attempt.
`connect` is emitted once the server has started answering, not when the
request is sent. Each failed attempt, and each connection the server ends,
emits a `stream_error` event with the error, the HTTP status (when one was
received), and the number of consecutive failures.

Authentication failures are handled differently: after a `401`/`403` the
stream reconnects once immediately (so a refreshed token can take over), and
if that attempt is also rejected it **stops reconnecting** and emits a
terminal `auth_failure` event instead of looping forever. Listen for it to
prompt the user to re-authenticate, then call `connect()` again to resume.

```typescript
teslemetry.sse.on("stream_error", ({ error, status, retries }) => {
  console.warn(`Stream attempt ${retries} failed`, status, error);
});

teslemetry.sse.on("auth_failure", (error) => {
  // error is a TeslemetryStreamAuthError with a .status of 401 or 403
  console.error("Streaming credentials rejected, reauthorize:", error.status);
  // ...surface reauth to the user, then: await teslemetry.sse.connect();
});
```

##### Selecting topics

By default the stream sends every event applicable to every product you can
access (legacy-all mode). Pass `stream.topics` to receive only the events you
need - either exact wire topic names or the bundled presets from
`SSE_TOPIC_PRESETS` (`vehicleFull`, `vehicleCore`, `energyLive`,
`energyFullState`, `account`), which are expanded client-side to exact names
before the connection opens:

```typescript
const teslemetry = new Teslemetry(process.env.TOKEN, {
  stream: { topics: ["energyLive", "credits"] },
});
```

Omitting `topics` entirely preserves legacy-all behavior forever - it is
never reinterpreted as a narrower default.

##### Ingesting signals from another source

`ingest()` dispatches signals you read elsewhere (for example over BLE) as if
they arrived on the stream: `data`/`all` listeners and `onSignal()` callbacks
fire as they do for a native event. It needs no connection and does no dedupe
or ranking against native events. When the local cache is running, an ingested
event updates it the same way a native `data` event does. When the cache is
off, the cache is left alone.

```typescript
vehicle.sse.ingest({ Gear: "ShiftStateD" }, { source: "ble" });
// or, on the shared stream:
teslemetry.sse.ingest({ VehicleSpeed: 12 }, vin, { source: "ble" }, new Date());
```

Values must use the stream's wire shapes. For example, `Gear` is
`"ShiftStateP" | "ShiftStateR" | "ShiftStateN" | "ShiftStateD" | ...`, so add
the `ShiftState` prefix to a bare `"D"`.

##### Energy tariffs and the composed site-info view

`site_info` events no longer carry `tariff_content`/`tariff_content_v2` -
subscribe separately to `tariff_content_v2`, whose body is `null` when Tesla
explicitly removes the tariff (not merely "no update yet"):

```typescript
site.sse.on("tariff_content_v2", (event) => {
  if (event.tariff_content_v2 === null) {
    console.log("Tariff was removed");
  } else {
    console.log("Tariff updated:", event.tariff_content_v2);
  }
});
```

`site.sse.siteInfoDocument` merges the cached slim `site_info` with the last
received tariff piece into a single whole-document view, resembling the full
REST `site_info` response:

```typescript
const document = site.sse.siteInfoDocument; // undefined until site_info is cached
```

`getTariffPeriods` resolves the current buy/sell rate (and, optionally, the
upcoming schedule) from a `tariff_content_v2` body - pass the site's IANA
`installation_time_zone`, since the tariff itself carries no timezone:

```typescript
import { getTariffPeriods, type TariffContentV2 } from "@teslemetry/api";

const tariff = document?.tariff_content_v2 as TariffContentV2 | null;
if (tariff) {
  const resolution = getTariffPeriods(tariff, new Date(), {
    timeZone: document.installation_time_zone,
  });
  console.log(resolution?.buy.price);
}
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
  console.log(`Found Site: ${site.name} (${site.id})`);
}
```

### Using `@teslemetry/api` as a `tesla-fleet-api` router backend

`@teslemetry/api/compat` adapts the vehicle and energy-site APIs to the method
names, arguments and `{ response }` replies of `tesla-fleet-api`, so they can be
the cloud backend of its routers. It imports nothing from `tesla-fleet-api`, so
it loads no protobuf, and the match is structural.

```typescript
import { VehicleCompat } from "@teslemetry/api/compat";
import { VehicleRouter } from "tesla-fleet-api/router";

const router = new VehicleRouter([bluetoothVehicle, new VehicleCompat(vehicle.api)]);
await router.door_lock();
```

A method the API has no wrapper for stays absent, and the router skips that
backend for it.

Creating a compat object adds one error interceptor to the client. Rejections
stay the values the SDK always rejects with (a parsed body, a string for a
non-JSON page, or `{}`), so existing error handling sees no change. Object and
`Error` rejections gain non-enumerable `status` and `failover_safe` properties,
which the router reads. `failover_safe` is `true` for network errors and HTTP
401, 402, 403, 408, 429, 500, 502, 503 and 504.

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

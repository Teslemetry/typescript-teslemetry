# Teslemetry TypeScript Monorepo

## Overview

This is the **Teslemetry TypeScript monorepo** containing the official TypeScript/JavaScript SDK and multiple platform integrations for the Teslemetry API. The monorepo uses **pnpm workspaces** for package management and **changesets** for versioning and publishing.

**Primary Purpose**: Provide a comprehensive ecosystem for Tesla vehicle and energy site control across multiple automation and smart home platforms.

## Monorepo Structure

```
typescript-teslemetry/
├── packages/
│   ├── api/                           # Core TypeScript/JavaScript SDK
│   ├── node-red-contrib-teslemetry/   # Node-RED integration
│   ├── n8n-nodes-teslemetry/          # n8n workflow integration
│   ├── homebridge-teslemetry/         # Homebridge plugin (published to npm)
│   └── iobroker.teslemetry/           # ioBroker adapter (published to npm)
├── pnpm-workspace.yaml                # Workspace configuration
├── tsconfig.json                      # Root TypeScript config
├── package.json                       # Monorepo root package
├── RELEASE.md                         # Release process documentation
└── .github/workflows/publish.yml      # Automated CI/CD
```

See each package's own `package.json`/`README.md` for its purpose, structure, and current version - don't rely on this file for per-package detail, which goes stale quickly.

All integration packages (`node-red`, `n8n`, `homebridge-teslemetry`, `iobroker.teslemetry`) depend on `@teslemetry/api` via `"@teslemetry/api": "workspace:*"`, so they always build against the local SDK during development.

## Packages

### 1. `@teslemetry/api` - Core SDK

**Location**: `packages/api/`

**Purpose**: Official TypeScript/JavaScript client library for the Teslemetry API - vehicle control, energy site management, real-time SSE streaming, automatic region detection (NA/EU), dual ESM/CJS output.

**Main Source Files**:
- `src/Teslemetry.ts` - Main entry point
- `src/TeslemetryApi.ts` - REST API wrapper
- `src/TeslemetryVehicleApi.ts` - Vehicle operations
- `src/TeslemetryEnergyApi.ts` - Energy site operations
- `src/TeslemetryStream.ts` - SSE streaming base
- `src/TeslemetryVehicleStream.ts` - Vehicle-specific streaming
- `src/TeslemetryUserApi.ts` - User account operations
- `src/TeslemetryChargingApi.ts` - Charging-specific operations
- `src/client/` - Auto-generated OpenAPI client (don't hand-edit)

**Code Generation**:
- Uses `@hey-api/openapi-ts` to generate the client from the OpenAPI spec. Run: `pnpm --filter @teslemetry/api client` (the package.json script is named `client`, not `generate`).
- `src/client/sdk.gen.ts` often already has functions for endpoints that `TeslemetryVehicleApi.ts`/`TeslemetryEnergyApi.ts` haven't wrapped yet - grep it for the endpoint before assuming a capability gap needs a spec regen; usually it's just a new hand-written method calling the existing generated function.
- `@hey-api/openapi-ts` stable releases crash against `typescript@7.x` because they call into the `typescript` package's compiler-API enums at runtime, which TS7's native rewrite doesn't expose - hence the `0.0.0-next-*` pin on `@hey-api/openapi-ts` in `packages/api/package.json` instead of a stable semver range. Bump to a stable release once `npm view @hey-api/openapi-ts@next dependencies` shows `typescript` has dropped out of a *stable* tag's dependency tree.
- The `input:` in `openapi-ts.config.ts` fetches the live `api.teslemetry.com/openapi.yaml`, not the api repo's committed `openapi.json` - the two can briefly diverge around a deploy, and the live endpoint can be *ahead* of the api repo's committed snapshot. If regenerating to pick up a specific just-merged api-repo change, prefer fetching that repo's `openapi.json` from `main` over trusting the live endpoint's current deploy state.
- CI's "Verify API client codegen toolchain" step (`.github/workflows/reusable-ci.yml`) regenerates into a throwaway temp directory on every PR to catch toolchain breaks at PR time - it does not diff against the committed `src/client/`, since live-spec drift is expected and not itself a bug.

**Gotcha**: every Teslemetry API request carries the access token as a `?token=...` query parameter, so `response.url`/`request.url` on the generated client's `Client` (`src/client/client/*.ts`) is credential-bearing - `Teslemetry.ts`'s response interceptor logs only `new URL(response.url).pathname`, never the full URL. Any future logging, error-reporting, or telemetry code touching a request/response object in `packages/api` must strip the query string (not just a named param) before it reaches a consumer-wired `logger`, since consumers like the Homey app forward `debug`-level logs into user-visible diagnostics.

**Gotcha**: `getTariffPeriods`/`TariffContentV2` (`src/tariff.ts`) are bundled in from the published `tesla-fleet-api` npm package rather than hand-ported - tsdown externalizes `dependencies`/`peerDependencies` by default but bundles `devDependencies`, so `tesla-fleet-api` is a `devDependency` here specifically to get inlined into `dist/` with no runtime dependency on it. `src/tariff.ts` deep-imports `tesla-fleet-api/dist/tariff.js` and `tesla-fleet-api/dist/types/site_info.js` directly (not the package root) so tree-shaking never has to prove the rest of that package's vehicle/signing/commands surface is side-effect-free. `tsdown.config.ts`'s `deps.onlyBundle: ["tesla-fleet-api"]` documents that inlining as intentional; adding another bundled devDependency needs a matching entry there. `useTeslaModel()` (`src/Teslemetry.ts`) follows the same deep-import pattern, importing `Models` from `tesla-fleet-api/dist/types/vehicle.js` rather than maintaining a local copy - check that leaf (not the package root, and not `dist/vehicle.js`'s `Vehicle` class, which pulls in the whole signing/protocol graph) before adding a new hand-maintained constant the library may already export.

### 2. `node-red-contrib-teslemetry` - Node-RED Integration

**Location**: `packages/node-red-contrib-teslemetry/`

**Purpose**: Node-RED nodes for Tesla vehicle and energy site automation.

**Nodes**:
1. **teslemetry-config** - Configuration node (stores API credentials)
2. **teslemetry-vehicle-command** - Vehicle commands and data retrieval
3. **teslemetry-energy-command** - Energy site commands (REST)
4. **teslemetry-energy-history** - Energy site calendar/telemetry history (REST)
5. **teslemetry-event** - Real-time vehicle event listener (SSE)
6. **teslemetry-signal** - Real-time single vehicle signal field listener (SSE)
7. **teslemetry-energy-event** - Real-time energy site event listener (SSE: `live_status`/`site_info`/`tariff_content_v2`/`energy_totals`)

**Structure**: each node has a TypeScript file (`.ts`) and HTML UI file (`.html`); `src/shared.ts` holds shared utilities, `src/validation.ts` input validation.

**Build**: `pnpm --filter node-red-contrib-teslemetry build` runs `tsdown && cp src/nodes/*.html dist/nodes/` - HTML files must be copied manually, tsdown won't do it.

**Gotcha**: `teslemetry-signal`'s field dropdown is populated from `teslemetry.api.getFields()` at edit time (`teslemetry-config.ts`'s `/teslemetry/fields` admin route), i.e. the live API's field registry, not a hand-maintained list - any new vehicle telemetry field the backend exposes is automatically selectable with zero code changes here. Combined with `teslemetry-event`/`teslemetry-energy-event` streaming whole raw payloads, most Homey/Homebridge-style "new capability" work (per-field mapping, units, gating) has no equivalent here: only genuinely new SDK *commands* (wire into `teslemetry-vehicle-command`/`teslemetry-energy-command`'s switch-case) or missing *streams* are real gaps in this package. Threshold-crossing and lifecycle-transition logic (Homey's Flow trigger cards) has no dedicated node either - it's expected to be composed downstream with core Node-RED `switch`/`change`/`function` nodes over the raw stream, not reimplemented here.

**Gotcha**: `TeslemetryStream`'s reconnect loop (`packages/api/src/TeslemetryStream.ts`) gives up permanently after two consecutive `auth_failure`s (`this.active = false`) - a bad/expired token doesn't get the exponential-backoff treatment ordinary `stream_error`s do, and nothing resumes the stream until something outside the SDK calls `connect()` again. `teslemetry-event`/`teslemetry-signal`/`teslemetry-energy-event` share this recovery logic (and the connect/disconnect/stream_error/auth_failure status wiring) through `attachStreamStatus()` in `src/shared.ts` rather than each hand-rolling it - extend that helper for new streaming nodes instead of duplicating the listener wiring.

**Gotcha**: `teslemetry-config.ts`'s initial `createProducts()` fetch (populates the vehicle/energy-site dropdowns and gates `hasInstanceError()`) self-heals via `createProductsFetcher()` - on failure it retries on a fixed timer and clears `Instance.error` on the next success, rather than caching the first failure for the node's lifetime. A corrected token still requires a redeploy (it's baked into the `Teslemetry` client at construction), but a transient fetch failure recovers on its own without one.

The config node's editor has a "Test credentials" button (`POST /teslemetry/test-credentials`) that validates a token pre-save via a throwaway `Teslemetry` client and `teslemetry.api.test()` (the lightest-weight authenticated call, `GET /api/test`) - `testCredentials()` in `teslemetry-config.ts` captures the response status via a client response interceptor to distinguish a 401/403 auth failure from any other error, since the generated client's thrown errors don't carry `.status` themselves.

**Local testing**:
```bash
cd packages/node-red-contrib-teslemetry
pnpm build
pnpm link --global

# In another terminal
cd ~/.node-red
pnpm link --global node-red-contrib-teslemetry
node-red
```

### 3. `n8n-nodes-teslemetry` - n8n Integration

**Location**: `packages/n8n-nodes-teslemetry/`

**Purpose**: n8n workflow nodes for Tesla automation. Builds to a single `dist/index.cjs` entry point.

**Components**:
- `src/credentials/TeslemetryApi.credentials.ts` - API credential definition
- `src/nodes/TeslemetryVehicle.node.ts` - Vehicle operations (climate/seat automation, closures/windows, charging schedules, software update, volume, wake/lock/charge/sentry, data retrieval)
- `src/nodes/TeslemetryEnergy.node.ts` - Energy operations (backup reserve, operation mode, storm mode, grid rules, off-grid EV reserve)
- `src/nodes/TeslemetryTrigger.node.ts` - Event triggers: vehicle SSE events (including a generic per-field Signal listener) and energy site SSE events (live status, site info, tariff content, energy totals)

See each node's `operation`/`event` option list for the exact current set - it grows incrementally and this summary goes stale fast.

**Gotcha**: before adding a new node operation to wrap an SDK command, check whether the capability is already reachable without new code. `TeslemetryVehicleApi`/`TeslemetryEnergyApi` already expose most of the Tesla command surface (grep before assuming a gap, per the `@teslemetry/api` codegen note above), and the Trigger node's generic Signal event type (any field from `teslemetry.api.getFields()`, delivered via `onSignal`) already covers arbitrary read-only vehicle telemetry - unlike Homey/Homebridge, which need a capability/service wired per field, n8n needs no new code to expose a new telemetry field. New operations are only needed for genuinely new **commands** (writes), not for reading data already covered by `vehicleData()`/`getLiveStatus()`/`getSiteInfo()` or the Signal/Energy Site event types.

**n8n conventions**: node class names must end with `.node.ts`, credential class names with `.credentials.ts`, icons are referenced from `src/`, and the node's `version` field must match `package.json`.

**Local testing**:
```bash
cd packages/n8n-nodes-teslemetry
pnpm build
pnpm link --global

# In another terminal
cd ~/.n8n/nodes
pnpm link --global n8n-nodes-teslemetry
```

### 4. `homebridge-teslemetry` - Homebridge Plugin

**Location**: `packages/homebridge-teslemetry/`

**Purpose**: Exposes vehicles and energy sites as HomeKit accessories via `src/vehicle-services/*` and `src/energy-services/*` service classes, each a thin adapter between a HomeKit `Service`/`Characteristic` and the corresponding `@teslemetry/api` method.

**Publishing note**: ships to npm as `homebridge-teslemetry`, superseding the legacy hand-published package of the same name via a same-name major hard cut (no dual-maintain, no rename). CI publish requires npm trusted publishing to be registered for this package name on npmjs.com (only an npm org owner can do that) - once registered, the changesets flow publishes on the next merge to `main` with no further repo changes needed.

**Gotcha**: HomeKit's `Service`/`Characteristic` static members (e.g. `Service.Lightbulb`, `Characteristic.On`) are concrete subclasses with simpler overridden constructors than the base `Service`/`Characteristic` class hap-nodejs types against - generic helpers that accept "any service/characteristic type" need `WithUUID<{ new (...): T }>`-shaped types (see `*-services/base.ts`), not `typeof Service`/`typeof Characteristic` directly, or `addService`/`getCharacteristic` overload resolution breaks.

**Gotcha**: `BaseService`/`BaseEnergyService`'s getOrCreate lookup only falls back to a bare `getService(serviceType)`/`addService(new ConcreteService(displayName))` (type-only match) when the caller passes no `subType`. Several sibling services intentionally share a service type with different subTypes - `LockService`/`ChargePortService` both use `Service.LockMechanism`; `ChargeSwitchService`/`DefrostService`/`SentryService`/`WakeService` and `StormWatchService`/`GridChargingService` all use `Service.Switch` - those must always pass a stable unique `subType` string so the base class routes through `getServiceById`/`addService(..., subType)` instead, or they'll collapse onto one shared HAP service (`test/serviceCollision.test.ts`, `test/energyServiceCollision.test.ts` cover this). Services with no natural sibling sharing their type (Information, Battery, Climate) should keep omitting `subType` - HAP pre-creates a default `AccessoryInformation` service on every `Accessory`, and `addService` rejects a second service of the same UUID whose `subtype` is falsy, so forcing a subType there breaks that default-service reuse.

**Testing**: `test/fakePlatform.ts`, `test/fakeVehicle.ts`, and `test/fakeEnergySite.ts` provide fakes for the Homebridge/HAP/Teslemetry-SDK objects the services depend on - real hap-nodejs `Service`/`Characteristic` classes are used (not mocks) so characteristic get/set wiring behaves as it does at runtime, driven via `handleSetRequest`/`handleGetRequest` rather than `setValue` (which fires the handler asynchronously with no return value to await). `vehicle.api`/`site.api` are plain stubs, not real `@teslemetry/api` instances, to keep tests free of network I/O.

**Gotcha**: `vehicle-services/climate.ts` maps `CurrentHeatingCoolingState` off the `HvacPower` signal (the schema's actual system power enum: Off/On/Precondition/OverheatProtect), not `HvacACEnabled` (narrowly "is the AC compressor running") - heating can be active with the AC compressor off. `HvacACEnabled` is still subscribed, but only to pick HEAT vs COOL once `HvacPower` already says the system is on - when adding a new signal-driven characteristic, check `packages/api/src/client/types.gen.ts` for whether a narrowly-scoped boolean flag or a proper state enum is the right source of truth.

**Gotcha**: `energy-services/*` never touch `site.sse` directly - they subscribe to `site.api.on("siteInfo"|"liveStatus", ...)`, an event bus whose REST-response envelope shape (`{ response: {...} }`) they all destructure from. `EnergyAccessory` (`src/energy.ts`) is the only place that touches `site.sse`: it re-wraps incoming `live_status`/`site_info` stream events into that same envelope and re-emits them on `site.api`, so every service keeps working unchanged regardless of whether the data came from REST or the stream. `live_status` fully replaces the cached value (it's the primary continuous-update path, no recurring REST poll); `site_info` shallow-merges into the existing cache instead of replacing it, since the stream's `site_info` payload is a slimmer, evolving subset of the full REST response (e.g. tariff content lives in its own `tariff_v2` topic) - don't build anything in this layer that assumes the stream `site_info` event carries the full REST shape.

**Gotcha**: stock hap-nodejs (`CharacteristicDefinitions.d.ts`) has no generic characteristic for arbitrary distance or energy values - only vendor-specific Eve custom characteristics (not in this dependency) cover those. Signals like `MilesSinceReset`/`SelfDrivingMilesSinceReset` (miles) or `LifetimeEnergyGainedRegen` (kWh) have no non-misleading HomeKit mapping and should stay unwired here rather than forced onto an unrelated sensor type (e.g. `TemperatureSensor`); other products (HA, Node-RED) can still expose them as generic sensors.

**Gotcha**: single-model/config-dependent services must gate on vehicle model/config, never register unconditionally. Two patterns cover this: a single-model signal like Cybertruck's `TonneauOpenPercent` gates its whole service in `vehicle.ts` on `useTeslaModel(vehicle.vin) === "Cybertruck"` (`@teslemetry/api`'s VIN-based model discriminator, `Teslemetry.ts`) before constructing it; a config-dependent feature within an otherwise-universal service, like `DoorService`'s frunk/trunk contact sensors, instead gates just that piece on the vehicle metadata's `config.can_actuate_trunks` (`VehicleDetails.metadata`, sourced from `getApiMetadata` - see `packages/api/src/client/types.gen.ts`'s `GetApiMetadataResponses`), since the VIN alone can't distinguish powered from latch-only hardware within a model line.

**Gotcha**: not every feature can be gated ahead of time (model/config are known synchronously; whether a given vehicle *reports* a signal at all often isn't). `PresenceService` (`vehicle-services/presence.ts`) and `WallConnectorService` (`energy-services/wall-connector.ts`) don't extend `BaseService`/`BaseEnergyService` and create zero HAP services at construction time - each sub-sensor (per presence field, per Wall Connector DIN) is created lazily the first time its signal/live_status entry actually arrives, since a field withheld by scope or simply absent hardware may never fire. Contrast this with `TpmsService`, `GridOutageService`, and `StormWatchActiveService`, which construct their `ContactSensor`s eagerly (virtually every vehicle/site has the underlying hardware) but hold `StatusFault` at `GENERAL_FAULT` until the first real payload lands, clearing it only then - never default a not-yet-received reading to "safe" by leaving a fresh `ContactSensorState` at its HAP default. Both new and existing contact-sensor mappings in this package (`DoorService`, the TPMS/grid/storm/wall-connector services above) follow one polarity convention: `CONTACT_DETECTED` = normal/quiescent (door closed, no fault, cable seated, grid up), `CONTACT_NOT_DETECTED` = triggered/abnormal (door open, fault active, cable unseated, grid down) - keep new contact sensors on this convention rather than picking polarity per-service.

**Gotcha**: `BaseService`/`BaseEnergyService.setStreamFault()` (called from `VehicleAccessory`/`EnergyAccessory`/`TeslemetryPlatform` to reflect terminal account-stream health) only marks a service's `StatusFault` when that HomeKit service type actually declares it as an optional characteristic (checked via `service.optionalCharacteristics`, not `service.testCharacteristic()` - the latter only reports characteristics already added, which excludes `StatusFault` on a service like `DoorService` that never touches it during normal operation). Only sensor-type services (`ContactSensor`, `OccupancySensor`, and similar) declare `StatusFault` at all; core control services (`LockMechanism`, `Switch`, `Thermostat`, `Battery`) don't, and forcing it onto them via `getCharacteristic()` would silently add an out-of-spec characteristic with a HAP warning - `setStreamFault()` is a no-op for those rather than inventing a misleading fault signal. Services owning more than one HAP `Service` instance (`TpmsService`, `DoorService`) override `setStreamFault()` to loop over all of them, not just the primary `this.service`. `PresenceService`/`WallConnectorService` don't extend `BaseService`/`BaseEnergyService` (see above) but hand-implement the same `setStreamFault()` contract over their own lazily-created sensor maps, clearing a sensor's fault the moment its own signal/DIN reading arrives - independent of any debounce applied to the reading's *value*.

**Gotcha**: `WallConnectorService`'s `connectors` map is otherwise only populated by `live_status`, so per-DIN sensors that already exist in Homebridge's persisted accessory cache from a prior run are invisible to `setStreamFault()` until this run's first `live_status` - its constructor hydrates `connectors` from any matching cached `ContactSensor` services up front (parsed off their `wall-connector-{fault,connected}-<din>` subtype) and immediately applies `TeslemetryPlatform.streamFault` (a public getter over the platform's private terminal-fault flag), so a fault already raised before this accessory was constructed still reaches them. Any other lazily-hydrated per-entity service map should follow the same hydrate-from-cache-at-construction pattern rather than assuming the live stream is the only source of a map's keys.

### 5. `iobroker.teslemetry` - ioBroker Adapter

**Location**: `packages/iobroker.teslemetry/`

**Status**: Published to npm. Not yet listed in the ioBroker adapter repository (`ioBroker/ioBroker.repositories`) - that listing is a separate, manual submission (repochecker + ioBroker maintainer review) that requires the npm package to already exist.

**Purpose**: ioBroker adapter exposing vehicles and energy sites as ioBroker states/objects (`lib/StateManager.ts`, `lib/VehicleHandler.ts`, `lib/EnergyHandler.ts`, `lib/StreamHandler.ts`).

**Gotcha**: its typecheck script is named `check`, not `tsc` (`pnpm --filter iobroker.teslemetry check`) - `pnpm -r tsc` silently skips it. The `@iobroker/adapter-core` module's own exports don't include an `Adapter` type; the real `ioBroker.Adapter` type comes from the global `ioBroker` namespace ambiently declared by `@iobroker/types` (pulled in transitively) - don't alias a local import to the name `ioBroker`, it shadows that global.

**Gotcha**: `VehicleHandler`/`EnergyHandler` register vehicles/sites via `teslemetry.api.getVehicle(vin)` / `teslemetry.api.getEnergySite(id)` (get-or-create), never `teslemetry.vehicle(vin)` / `teslemetry.energySite(id)` (those construct unconditionally and throw "already exists" once `createProducts()` has already discovered the same VIN/id). Keep the handlers' SDK-instance maps typed as `Map<string, TeslemetryVehicleApi>` / `Map<number, TeslemetryEnergyApi>`, not `Map<string, any>` - `any` erases the compiler's ability to catch a wrong method name. Also mind the two distinct vehicle-data shapes: `vehicle.vehicleData()` (REST) resolves `{ response: { charge_state, climate_state, vehicle_state, ... } }` (nested, snake_case), while the SSE `data` stream event carries a flat PascalCase signal map (`{ BatteryLevel, InsideTemp, Locked, ... }`) - `StateManager` has separate parsers (`updateVehicleData` vs `updateVehicleDataFromSignals`) for exactly this reason; don't route one shape through the other's parser.

**Gotcha**: changesets bumps `package.json`/`CHANGELOG.md` on release but never touches `io-package.json` - its `common.version` and `common.news` need a manual sync on every release or the ioBroker repochecker hard-fails submission to `ioBroker.repositories`. No Teslemetry brand/logo asset lives in this monorepo; the real logo mark lives in the separate `website3` repo (its `public/web-app-manifest-512x512.png` is the highest-res copy) - source icons from there, don't hand-draw a placeholder.

## Technology Stack

- **pnpm** (workspaces) - package management; version pinned via `packageManager` in root `package.json`
- **tsdown** - primary build tool (bundles via rolldown); its `rolldown-plugin-dts` dependency must support the installed `typescript` major version for declaration emit to work, since that's the actual compiler-API consumer, not tsdown itself
- **TypeScript** 7.x - type checking and compilation. TS7's config surface dropped `baseUrl` and the `node`/`node10` `moduleResolution` value, and defaults `types` to `[]` instead of auto-including all `@types/*` packages - any tsconfig relying on the old implicit behavior needs `"types": ["node"]` added explicitly
- **Oxlint** - code linting (native TS parsing, no per-package tsconfig project setup needed; config at root `.oxlintrc.json`)
- **tsx** - TypeScript execution (scripts, and each package's `test` script: `tsx --test test/*.test.ts`, Node's built-in test runner)
- **Changesets** (`@changesets/cli`) - version bumping, changelog generation, and publishing
- **Node-RED**, **n8n**, **Homebridge** (hap-nodejs), **ioBroker** (`@iobroker/adapter-core`, `@iobroker/types`) - platform SDKs for the respective integration package; see each package's `package.json` for the exact supported version

## Development Workflow

```bash
pnpm install                              # install all workspace dependencies
pnpm build                                # build all packages
pnpm --filter <package-name> build        # build one package
pnpm --filter <package-name> test         # run one package's tests
pnpm --filter @teslemetry/api client      # regenerate the OpenAPI client
pnpm lint                                 # oxlint across the whole monorepo (single root invocation)
pnpm lint:fix                             # auto-fix lint issues
pnpm -r --no-bail tsc                     # typecheck every package, don't stop at first failure
pnpm --filter iobroker.teslemetry check   # iobroker's typecheck script is named `check`, not `tsc` - `pnpm -r tsc` skips it silently
```

Config: `.oxlintrc.json` at repo root. Two `overrides` blocks intentionally silence rules that conflict with deliberate patterns rather than bugs:
- `typescript/no-unsafe-declaration-merging` off under `packages/api/src/**` - the `class X extends EventEmitter` + `declare interface X` typed-emitter pattern used throughout the SDK
- `typescript/no-this-alias` off under `packages/node-red-contrib-teslemetry/src/nodes/**` - Node-RED's standard `const node = this;` idiom for capturing node identity inside async callbacks

The generated OpenAPI client (`packages/api/src/client/**`) is excluded via `ignorePatterns` - don't hand-edit it or add lint overrides for it.

To make a change: branch, edit the relevant package(s), `pnpm build`, add a changeset (`pnpm changeset`), commit (including `.changeset/`), and open a PR.

## Release Process

Changesets drives version management and automated publishing - see `RELEASE.md` for the detailed process. Summary: `pnpm changeset` records an entry describing which packages changed and the semver bump; merging a PR containing changeset entries to `main` causes a "Version Packages" PR to be created automatically, and merging *that* PR bumps versions, generates changelogs, and publishes to npm (with `--access public`).

## Key Architecture Decisions

- **Shared dependency model**: every integration package depends on `@teslemetry/api` via `workspace:*` for a single source of truth and easier maintenance.
- **Dual module format**: the core API package ships both ESM (`dist/index.mjs`) and CommonJS (`dist/index.cjs`).
- **TypeScript**: root `tsconfig.json` sets strict mode, `target: ES2022`, `module: NodeNext`; package configs extend it with their own `outDir`/`include`/platform types.
- **Code generation**: OpenAPI specs auto-generate the client in `packages/api/src/client/` to keep the SDK in sync with the API.

## Important Files and Directories

- `pnpm-workspace.yaml`, root `tsconfig.json`, root `package.json` - workspace/build config
- `RELEASE.md` - release process documentation
- `.changeset/` - changeset entries for version management
- `openapi-ts.config.ts` (api package) - OpenAPI code generation config

**Gotcha**: energy-site SSE event union members are inconsistent about which field identifies the site - `live_status`/`site_info` carry `site_id`, but `energy_totals` (and any future refresh-notification event sharing that uniform `{id, product_type, topic, url, createdAt, isCache}` shape) carries `id` instead. `TeslemetryStream._dispatch()`'s two routing blocks (one per field name) reflect this; adding a new energy SSE event means checking which field the backend's schema actually uses, not assuming `site_id`. Every `on()` override across `TeslemetryStream`/`TeslemetryVehicleStream`/`TeslemetryEnergySiteStream` must call `super.on()` before replaying any cached value to the listener - reversing that order silently breaks `once()` (see `test/energyStream.test.ts`'s dead-listener regression tests).

**Gotcha**: `src/sseTopics.ts`'s `SSE_TOPICS` is the client-side mirror of the API's `src/lib/sseTopics.ts` allowlist - keep both in sync when the backend adds a wire event, or the new topic can never be selected via `stream.topics`. `SSE_TOPIC_PRESETS` entries are SDK-only convenience and are always expanded to exact wire names client-side before the `topics` query parameter is built - never send a preset name or a wildcard over the wire. `tariff_content_v2`'s body is `null` for the server's explicit tariff-removal signal, not merely "no update yet" - `EnergySiteCache.tariff_content_v2` distinguishes that (`null`) from "never received" (`undefined`), and replay/cache logic must preserve the distinction rather than treating `null` as falsy-skip.

## CI/CD

`.github/workflows/reusable-ci.yml` holds the full lint/build/typecheck/test/codegen-verify suite as a `workflow_call` reusable workflow, called by both `ci.yml` (PR/push triggers) and `publish.yml`'s `validate` job, so there is exactly one place to add or change a check. This repo has no branch protection, so `publish.yml`'s `release` job (which enters the `production` environment and runs `changeset publish`) depends on `needs: validate` in the *same workflow run* - that guarantees the full CI suite ran against the exact SHA being published, not a separate/racing CI run on the same push. Don't restore CI as inline steps in `publish.yml` or drop the `needs: validate` gate.

`publish.yml`'s "Upgrade npm for OIDC support" step always installs `npm@latest`, whose `engines.node` requirement can rise ahead of the workflow's `actions/setup-node` pin. If publish starts failing with `EBADENGINE`, check `npm view npm@latest engines` against the pinned `node-version` first.

`pnpm/action-setup` in `publish.yml`/`ci.yml` must use `@v4` with no hardcoded `version:` (it then reads the `packageManager` field in root `package.json`). A hardcoded-major pin that drifts from `packageManager` makes `changeset publish` silently fall through to a plain `npm publish` that rejects the `--git-checks` flag changesets passes for the pnpm path, failing with `EUNKNOWNCONFIG` - this looks like a changesets/flag bug but is actually a pnpm-version mismatch. Keep root `packageManager` and both workflow files' pnpm major in sync.

## Resources

- **Teslemetry API Docs**: https://teslemetry.com/docs
- **pnpm Workspaces**: https://pnpm.io/workspaces
- **Changesets**: https://github.com/changesets/changesets
- **Node-RED**: https://nodered.org/docs/creating-nodes/
- **n8n**: https://docs.n8n.io/integrations/creating-nodes/
- **Homebridge Plugin Dev**: https://developers.homebridge.io/
- **ioBroker Adapter Dev**: https://www.iobroker.net/#en/documentation/dev/adapterdev.md

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

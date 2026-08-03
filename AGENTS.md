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

See each package's own `package.json`/`README.md` for its purpose and structure - don't rely on this file for per-package detail, which goes stale quickly.

## Packages

### 1. `@teslemetry/api` - Core SDK

**Location**: `packages/api/`
**Version**: 0.6.7
**Status**: Stable, actively maintained

**Purpose**: Official TypeScript/JavaScript client library for the Teslemetry API.

**Key Features**:
- 🚗 Vehicle control (climate, charging, security, navigation)
- ⚡ Energy site management (Powerwall, Solar)
- 📡 Real-time streaming via Server-Sent Events (SSE)
- 🌍 Automatic region detection (NA/EU)
- 📦 Dual ESM/CommonJS support
- 🔧 Full TypeScript type definitions

**Main Source Files**:
- `src/Teslemetry.ts` - Main entry point
- `src/TeslemetryApi.ts` - REST API wrapper
- `src/TeslemetryVehicleApi.ts` - Vehicle operations
- `src/TeslemetryEnergyApi.ts` - Energy site operations
- `src/TeslemetryStream.ts` - SSE streaming base
- `src/TeslemetryVehicleStream.ts` - Vehicle-specific streaming
- `src/TeslemetryUserApi.ts` - User account operations
- `src/TeslemetryChargingApi.ts` - Charging-specific operations
- `src/client/` - Auto-generated OpenAPI client

**Build Output**:
- `dist/index.cjs` - CommonJS bundle
- `dist/index.mjs` - ESM bundle
- `dist/*.d.ts` - TypeScript declarations

**Code Generation**:
- Uses `@hey-api/openapi-ts` to generate client from OpenAPI spec
- Run: `pnpm --filter @teslemetry/api client` (package.json script is named `client`, not `generate`)
- The generated client (`src/client/sdk.gen.ts`) often already has functions for endpoints that `TeslemetryVehicleApi.ts`/`TeslemetryEnergyApi.ts` haven't wrapped yet - grep `src/client/sdk.gen.ts` for the endpoint before assuming closing a capability gap needs a spec regen; usually it's just a new hand-written method that calls the existing generated function.
- `@hey-api/openapi-ts` releases up to and including `0.99.0` crash against `typescript@7.x` (`TypeError: Cannot read properties of undefined (reading 'LineFeed'/'AnyKeyword'/...)`) because they still call into the `typescript` package's compiler-API enums at runtime, and TS7's native rewrite doesn't expose that surface - this is a known upstream gap (hey-api/hey-api#4235), not a repo config issue. The fix landed by dropping the runtime dependency on `typescript` entirely, but only in hey-api's `next` prerelease channel as of 2026-07 (no stable release yet) - hence the `0.0.0-next-*` pin in `packages/api/package.json`'s `@hey-api/openapi-ts` devDependency instead of a stable semver range. Bump to a stable release once one ships with this fix (check `npm view @hey-api/openapi-ts@next dependencies` - once `typescript` disappears from a *stable* tag's dependency tree, the fix has shipped).
- The `input:` in `openapi-ts.config.ts` fetches the live `api.teslemetry.com/openapi.yaml`, not the api repo's committed `openapi.json` directly - the two can briefly diverge around a deploy, and empirically the live endpoint can even be *ahead* of the api repo's committed snapshot file (which isn't necessarily regenerated on every commit). If regenerating to pick up a specific just-merged api-repo change, prefer fetching that repo's `openapi.json` from its `main` branch over trusting the live endpoint's current deploy state.
- CI (`.github/workflows/ci.yml`, "Verify API client codegen toolchain" step) regenerates into a throwaway temp directory on every PR specifically to catch a toolchain break like this one at PR time - it does not diff against the committed `src/client/`, since the live spec drifting is expected and not itself a bug.

**Gotcha**: `getTariffPeriods`/`TariffContentV2` (`src/tariff.ts`) are bundled in from the published `tesla-fleet-api` npm package rather than hand-ported - tsdown externalizes `dependencies`/`peerDependencies` by default but bundles `devDependencies`, so `tesla-fleet-api` is a `devDependency` here specifically to get inlined into `dist/` with no runtime dependency on it. `src/tariff.ts` deep-imports `tesla-fleet-api/dist/tariff.js` and `tesla-fleet-api/dist/types/site_info.js` directly (not the package root) so tree-shaking never has to prove the rest of that package's vehicle/signing/commands surface is side-effect-free - importing the root would risk dragging all of it in. `tsdown.config.ts`'s `deps.onlyBundle: ["tesla-fleet-api"]` documents that inlining as intentional (silences tsdown's unintentional-bundling hint); adding another bundled devDependency needs a matching entry there.

### 2. `node-red-contrib-teslemetry` - Node-RED Integration

**Location**: `packages/node-red-contrib-teslemetry/`
**Version**: 0.1.2
**Status**: Active

**Purpose**: Provides Node-RED nodes for Tesla vehicle and energy site automation.

**Nodes**:
1. **teslemetry-config** - Configuration node (stores API credentials)
2. **teslemetry-vehicle-command** - Vehicle commands and data retrieval
3. **teslemetry-energy-command** - Energy site commands (REST)
4. **teslemetry-energy-history** - Energy site calendar/telemetry history (REST)
5. **teslemetry-event** - Real-time vehicle event listener (SSE)
6. **teslemetry-signal** - Real-time single vehicle signal field listener (SSE)
7. **teslemetry-energy-event** - Real-time energy site event listener (SSE: `live_status`/`site_info`/`tariff_content_v2`/`energy_totals`)

**Structure**:
- Each node has a TypeScript file (`.ts`) and HTML UI file (`.html`)
- `src/shared.ts` - Shared utilities
- `src/validation.ts` - Input validation

**Gotcha**: `teslemetry-signal`'s field dropdown is populated from `teslemetry.api.getFields()` at edit time (`teslemetry-config.ts`'s `/teslemetry/fields` admin route), i.e. the live API's field registry, not a hand-maintained list - any new vehicle telemetry field the backend exposes is automatically selectable with zero code changes here. Combined with `teslemetry-event`/`teslemetry-energy-event` streaming whole raw payloads, most Homey/Homebridge-style "new capability" work (per-field mapping, units, gating) has no equivalent here: only genuinely new SDK *commands* (wire into `teslemetry-vehicle-command`/`teslemetry-energy-command`'s switch-case) or missing *streams* (as `teslemetry-energy-event` was, until added) are real gaps in this package. Threshold-crossing and lifecycle-transition logic (Homey's Flow trigger cards) has no dedicated node either - it's expected to be composed downstream with core Node-RED `switch`/`change`/`function` nodes over the raw stream, not reimplemented here.

**Build Process**:
```bash
pnpm --filter node-red-contrib-teslemetry build
# Runs: tsdown && cp src/nodes/*.html dist/nodes/
```

### 3. `n8n-nodes-teslemetry` - n8n Integration

**Location**: `packages/n8n-nodes-teslemetry/`
**Status**: Active

**Purpose**: Provides n8n workflow nodes for Tesla automation.

**Components**:
- `src/credentials/TeslemetryApi.credentials.ts` - API credential definition
- `src/nodes/TeslemetryVehicle.node.ts` - Vehicle operations
- `src/nodes/TeslemetryEnergy.node.ts` - Energy operations
- `src/nodes/TeslemetryTrigger.node.ts` - Event triggers (Vehicle and Energy Site resources)

**Node Capabilities**: see each node's `operation`/`event` option list for the current set - it's grown incrementally and the list goes stale fast. As of the capability-expansion uplift (2026-08), Vehicle covers climate/seat automation, closures/windows, charging schedules, software update, and volume in addition to the original data/wake/lock/charge/sentry set; Energy covers backup reserve, operation mode, storm mode, grid rules, and off-grid EV reserve; Trigger covers both vehicle SSE events (including a generic per-field Signal listener) and energy site SSE events (live status, site info, tariff content, energy totals).

**Gotcha**: before adding a new node operation to wrap an SDK command, check whether the capability is already reachable without new code. `TeslemetryVehicleApi`/`TeslemetryEnergyApi` already expose most of the Tesla command surface (grep before assuming a gap, per the `@teslemetry/api` codegen note above), and the Trigger node's generic Signal event type (any field from `teslemetry.api.getFields()`, delivered via `onSignal`) already covers arbitrary read-only vehicle telemetry - unlike Homey/Homebridge, which need a capability/service wired per field, n8n needs no new code to expose a new telemetry field. New operations are only needed for genuinely new **commands** (writes), not for reading data already covered by `vehicleData()`/`getLiveStatus()`/`getSiteInfo()` or the Signal/Energy Site event types.

**Build Output**: `dist/index.cjs` (single entry point)

### 4. `homebridge-teslemetry` - Homebridge Plugin

**Location**: `packages/homebridge-teslemetry/`
**Status**: Ready to publish to npm as `homebridge-teslemetry` 1.0.0, superseding the legacy hand-published package of the same name via a same-name major hard cut (no dual-maintain, no rename). The first CI publish attempt 404s until npm trusted publishing is registered for the `homebridge-teslemetry` package name on npmjs.com - only an npm org owner can do that; once registered, the existing changesets flow publishes on the next merge to `main` without further repo changes.

**Purpose**: Exposes vehicles and energy sites as HomeKit accessories via `src/vehicle-services/*` and `src/energy-services/*` service classes, each a thin adapter between a HomeKit `Service`/`Characteristic` and the corresponding `@teslemetry/api` method.

**Gotcha**: HomeKit's `Service`/`Characteristic` static members (e.g. `Service.Lightbulb`, `Characteristic.On`) are concrete subclasses with simpler overridden constructors than the base `Service`/`Characteristic` class hap-nodejs types against - generic helpers that accept "any service/characteristic type" need `WithUUID<{ new (...): T }>`-shaped types (see `*-services/base.ts`), not `typeof Service`/`typeof Characteristic` directly, or `addService`/`getCharacteristic` overload resolution breaks.

**Gotcha**: `BaseService`/`BaseEnergyService`'s getOrCreate lookup only falls back to a bare `getService(serviceType)`/`addService(new ConcreteService(displayName))` (type-only match) when the caller passes no `subType`. Several sibling services intentionally share a service type with different subTypes - `LockService`/`ChargePortService` both use `Service.LockMechanism`; `ChargeSwitchService`/`DefrostService`/`SentryService`/`WakeService` and `StormWatchService`/`GridChargingService` all use `Service.Switch` - those must always pass a stable unique `subType` string so the base class routes through `getServiceById`/`addService(..., subType)` instead, or they'll collapse onto one shared HAP service (`test/serviceCollision.test.ts`, `test/energyServiceCollision.test.ts` cover this). Services with no natural sibling sharing their type (Information, Battery, Climate) should keep omitting `subType` - HAP pre-creates a default `AccessoryInformation` service on every `Accessory`, and `addService` rejects a second service of the same UUID whose `subtype` is falsy, so forcing a subType there breaks that default-service reuse.

**Testing**: `test/fakePlatform.ts`, `test/fakeVehicle.ts`, and `test/fakeEnergySite.ts` provide fakes for the Homebridge/HAP/Teslemetry-SDK objects the services depend on - real hap-nodejs `Service`/`Characteristic` classes are used (not mocks) so characteristic get/set wiring behaves as it does at runtime, driven via `handleSetRequest`/`handleGetRequest` rather than `setValue` (which fires the handler asynchronously with no return value to await). `vehicle.api`/`site.api` are plain stubs, not real `@teslemetry/api` instances, to keep tests free of network I/O.

**Gotcha**: `vehicle-services/climate.ts` maps `CurrentHeatingCoolingState` off the `HvacPower` signal (the schema's actual system power enum: Off/On/Precondition/OverheatProtect), not `HvacACEnabled` (narrowly "is the AC compressor running"). Heating can be active with the AC compressor off, so gating on `HvacACEnabled` alone reported the system OFF while it was heating. `HvacACEnabled` is still subscribed, but only to pick HEAT vs COOL once `HvacPower` already says the system is on - when adding a new signal-driven characteristic, check `packages/api/src/client/types.gen.ts` for whether a narrowly-scoped boolean flag or a proper state enum is the right source of truth.

**Gotcha**: `energy-services/*` never touch `site.sse` directly - they subscribe to `site.api.on("siteInfo"|"liveStatus", ...)`, an event bus whose REST-response envelope shape (`{ response: {...} }`) they all destructure from. `EnergyAccessory` (`src/energy.ts`) is the only place that touches `site.sse`: it re-wraps incoming `live_status`/`site_info` stream events into that same envelope and re-emits them on `site.api`, so every service keeps working unchanged regardless of whether the data came from REST or the stream. `live_status` fully replaces the cached value (it's the primary continuous-update path, no recurring REST poll); `site_info` shallow-merges into the existing cache instead of replacing it, since the stream's `site_info` payload is a slimmer, evolving subset of the full REST response (e.g. tariff content lives in its own `tariff_v2` topic) - don't build anything in this layer that assumes the stream `site_info` event carries the full REST shape.

**Gotcha**: stock hap-nodejs (`CharacteristicDefinitions.d.ts`) has no generic characteristic for arbitrary distance or energy values - only vendor-specific Eve custom characteristics (not in this dependency) cover those. Signals like `MilesSinceReset`/`SelfDrivingMilesSinceReset` (miles) or `LifetimeEnergyGainedRegen` (kWh) have no non-misleading HomeKit mapping and should stay unwired here rather than forced onto an unrelated sensor type (e.g. `TemperatureSensor`); other products (HA, Node-RED) can still expose them as generic sensors.

**Gotcha**: single-model/config-dependent services must gate on vehicle model/config, never register unconditionally. Two patterns cover this: a single-model signal like Cybertruck's `TonneauOpenPercent` gates its whole service in `vehicle.ts` on `useTeslaModel(vehicle.vin) === "Cybertruck"` (`@teslemetry/api`'s VIN-based model discriminator, `Teslemetry.ts`) before constructing it; a config-dependent feature within an otherwise-universal service, like `DoorService`'s frunk/trunk contact sensors, instead gates just that piece on the vehicle metadata's `config.can_actuate_trunks` (`VehicleDetails.metadata`, sourced from `getApiMetadata` - see `packages/api/src/client/types.gen.ts`'s `GetApiMetadataResponses`), since the VIN alone can't distinguish powered from latch-only hardware within a model line.

**Gotcha**: not every feature can be gated ahead of time (model/config are known synchronously; whether a given vehicle *reports* a signal at all often isn't). `PresenceService` (`vehicle-services/presence.ts`) and `WallConnectorService` (`energy-services/wall-connector.ts`) don't extend `BaseService`/`BaseEnergyService` and create zero HAP services at construction time - each sub-sensor (per presence field, per Wall Connector DIN) is created lazily the first time its signal/live_status entry actually arrives, since a field withheld by scope or simply absent hardware may never fire. Contrast this with `TpmsService`, `GridOutageService`, and `StormWatchActiveService`, which construct their `ContactSensor`s eagerly (virtually every vehicle/site has the underlying hardware) but hold `StatusFault` at `GENERAL_FAULT` until the first real payload lands, clearing it only then - never default a not-yet-received reading to "safe" by leaving a fresh `ContactSensorState` at its HAP default. Both new and existing contact-sensor mappings in this package (`DoorService`, the TPMS/grid/storm/wall-connector services above) follow one polarity convention: `CONTACT_DETECTED` = normal/quiescent (door closed, no fault, cable seated, grid up), `CONTACT_NOT_DETECTED` = triggered/abnormal (door open, fault active, cable unseated, grid down) - keep new contact sensors on this convention rather than picking polarity per-service.

### 5. `iobroker.teslemetry` - ioBroker Adapter

**Location**: `packages/iobroker.teslemetry/`
**Status**: Published to npm. Not yet listed in the ioBroker adapter repository (`ioBroker/ioBroker.repositories`) - that listing is a separate, manual submission (repochecker + ioBroker maintainer review) that requires the npm package to already exist.

**Purpose**: ioBroker adapter exposing vehicles and energy sites as ioBroker states/objects (`lib/StateManager.ts`, `lib/VehicleHandler.ts`, `lib/EnergyHandler.ts`, `lib/StreamHandler.ts`).

**Gotcha**: its typecheck script is named `check`, not `tsc` (`pnpm --filter iobroker.teslemetry check`) - `pnpm -r tsc` silently skips it. The `@iobroker/adapter-core` module's own exports don't include an `Adapter` type; the real `ioBroker.Adapter` type comes from the global `ioBroker` namespace ambiently declared by `@iobroker/types` (pulled in transitively) - don't alias a local import to the name `ioBroker`, it shadows that global.

**Gotcha**: `VehicleHandler`/`EnergyHandler` register vehicles/sites via `teslemetry.api.getVehicle(vin)` / `teslemetry.api.getEnergySite(id)` (get-or-create), never `teslemetry.vehicle(vin)` / `teslemetry.energySite(id)` (those construct unconditionally and throw "already exists" once `createProducts()` has already discovered the same VIN/id - this took the adapter down at startup for one release). Keep the handlers' SDK-instance maps typed as `Map<string, TeslemetryVehicleApi>` / `Map<number, TeslemetryEnergyApi>`, not `Map<string, any>` - `any` erases the compiler's ability to catch a wrong method name, which is exactly how the whole handler layer silently called a non-existent snake_case surface for a release. Also mind the two distinct vehicle-data shapes: `vehicle.vehicleData()` (REST) resolves `{ response: { charge_state, climate_state, vehicle_state, ... } }` (nested, snake_case), while the SSE `data` stream event carries a flat PascalCase signal map (`{ BatteryLevel, InsideTemp, Locked, ... }`) - `StateManager` has separate parsers (`updateVehicleData` vs `updateVehicleDataFromSignals`) for exactly this reason; don't route one shape through the other's parser.

**Gotcha**: changesets bumps `package.json`/`CHANGELOG.md` on release but never touches `io-package.json` - its `common.version` and `common.news` need a manual sync on every release or the ioBroker repochecker hard-fails submission to `ioBroker.repositories`. No Teslemetry brand/logo asset lives in this monorepo; the real logo mark lives in the separate `website3` repo (its `public/web-app-manifest-512x512.png` is the highest-res copy) - source icons from there, don't hand-draw a placeholder.

## Technology Stack

### Package Management
- **pnpm** 10.18.1 - Fast, disk-space efficient package manager
- **Workspaces** - Monorepo package linking

### Build Tools
- **tsdown** (>=0.22) - Primary build tool (bundles via rolldown); its `rolldown-plugin-dts` dependency must support the installed `typescript` major version for declaration emit to work, since that's the actual compiler-API consumer, not tsdown itself
- **TypeScript** 7.x - Type checking and compilation. TS7's config surface dropped `baseUrl` and the `node`/`node10` `moduleResolution` value, and defaults `types` to `[]` instead of auto-including all `@types/*` packages - any tsconfig relying on the old implicit behavior needs `"types": ["node"]` added explicitly
- **Oxlint** - Code linting (native TS parsing, no per-package tsconfig project setup needed; config at root `.oxlintrc.json`)
- **tsx** - TypeScript execution (for scripts)

### Version Management
- **Changesets** (`@changesets/cli`) - Version bumping and changelog generation
- **Git-based releases** - Automated via GitHub Actions

### Code Generation
- **@hey-api/openapi-ts** - Generate TypeScript client from OpenAPI specs

### Platform-Specific
- **Node-RED** 4.1.1 - For node-red integration
- **n8n** 1.122.5 - For n8n integration
- **Homebridge** 1.8+ - For homebridge-teslemetry (uses hap-nodejs for HomeKit types)
- **ioBroker** - For iobroker.teslemetry (`@iobroker/adapter-core`, `@iobroker/types`)

## Development Workflow

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd typescript-teslemetry

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Working on a Specific Package

```bash
# Build a specific package
pnpm --filter @teslemetry/api build
pnpm --filter node-red-contrib-teslemetry build
pnpm --filter n8n-nodes-teslemetry build
pnpm --filter homebridge-teslemetry build
pnpm --filter iobroker.teslemetry build

# Run tests (if available)
pnpm --filter @teslemetry/api test

# Generate OpenAPI client
pnpm --filter @teslemetry/api generate
```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** to the relevant package(s)

3. **Build and test**
   ```bash
   pnpm build
   ```

4. **Create a changeset** (for version bumping)
   ```bash
   pnpm changeset
   # Follow the prompts to describe your changes
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

## Release Process

The monorepo uses **Changesets** for version management and automated publishing.

### Creating a Release

1. **Add a changeset** when making changes:
   ```bash
   pnpm changeset
   ```
   - Select which packages changed
   - Choose semver bump type (major/minor/patch)
   - Write a description

2. **Commit the changeset**:
   ```bash
   git add .changeset/
   git commit -m "Add changeset for X"
   ```

3. **Automated Publishing** (via GitHub Actions):
   - When PR is merged to `main`
   - Changesets creates a "Version Packages" PR
   - Merging that PR triggers:
     - Version bumping
     - Changelog generation
     - npm publishing (with --access public)
     - Discord notifications

See `RELEASE.md` for detailed release documentation.

## Key Architecture Decisions

### 1. Shared Dependency Model
All integration packages (`node-red`, `n8n`, `homebridge-teslemetry`, `iobroker.teslemetry`) depend on `@teslemetry/api` via workspace references:
```json
"dependencies": {
  "@teslemetry/api": "workspace:*"
}
```

This ensures:
- Code reuse and consistency
- Single source of truth for API logic
- Easier maintenance

### 2. Dual Module Format (ESM + CommonJS)
The core API package outputs both formats:
- **ESM** (`dist/index.mjs`) - Modern bundlers and Node.js
- **CommonJS** (`dist/index.cjs`) - Legacy compatibility

### 3. TypeScript Configuration
- **Root config** (`tsconfig.json`): Base configuration with strict mode
- **Package configs**: Extend root with package-specific settings
- **Target**: ES2022 with NodeNext module resolution

### 4. Build Strategy
- **tsdown**: Lightweight TypeScript compiler using esbuild
  - Fast compilation
  - Automatic type declaration generation
  - Minimal configuration

### 5. Code Generation
- OpenAPI specs are used to auto-generate client code
- Keeps SDK in sync with API specifications
- Located in `packages/api/src/client/`

## Common Tasks

### Add a New Package

1. Create directory in `packages/`
2. Add `package.json` with workspace dependencies
3. Add `tsconfig.json` extending root config
4. Update `pnpm-workspace.yaml` if needed (auto-detects `packages/*`)
5. Run `pnpm install` to link workspace

### Update Dependencies

```bash
# Update all dependencies
pnpm update -r

# Update specific package
pnpm --filter @teslemetry/api update

# Update dependency across workspace
pnpm update -r <package-name>
```

### Lint Code

A single root `oxlint` invocation covers every package in one pass - no per-package config needed since oxlint parses TS natively without a tsconfig project reference.

```bash
# Run linter across the whole monorepo
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix
```

Config: `.oxlintrc.json` at repo root. Two `overrides` blocks intentionally silence rules that conflict with deliberate patterns rather than bugs:
- `typescript/no-unsafe-declaration-merging` off under `packages/api/src/**` - the `class X extends EventEmitter` + `declare interface X` typed-emitter pattern used throughout the SDK
- `typescript/no-this-alias` off under `packages/node-red-contrib-teslemetry/src/nodes/**` - Node-RED's standard `const node = this;` idiom for capturing node identity inside async callbacks

The generated OpenAPI client (`packages/api/src/client/**`) is excluded via `ignorePatterns` - don't hand-edit it or add lint overrides for it.

### Typecheck and Test Every Package

`pnpm -r tsc` runs every package's `tsc` script, but `iobroker.teslemetry`'s is named `check` (not `tsc`), so it's silently skipped - run `pnpm --filter iobroker.teslemetry check` separately, or `pnpm -r --no-bail tsc` to see every package's errors instead of stopping at the first failure.

Each package's `test` script runs `tsx --test test/*.test.ts` (Node's built-in test runner, no extra framework) - a convention applied across `api`, `n8n-nodes-teslemetry`, `iobroker.teslemetry`, and `homebridge-teslemetry`. `node-red-contrib-teslemetry` has no test suite yet.

### Test n8n Nodes Locally

```bash
cd packages/n8n-nodes-teslemetry
pnpm build
pnpm link --global

# In another terminal
cd ~/.n8n/nodes
pnpm link --global n8n-nodes-teslemetry
```

### Test Node-RED Nodes Locally

```bash
cd packages/node-red-contrib-teslemetry
pnpm build
pnpm link --global

# In another terminal
cd ~/.node-red
pnpm link --global node-red-contrib-teslemetry
node-red
```

## Important Files and Directories

### Root Level
- `pnpm-workspace.yaml` - Workspace package definitions
- `tsconfig.json` - Base TypeScript configuration
- `package.json` - Monorepo scripts and metadata
- `RELEASE.md` - Release process documentation
- `.changeset/` - Changeset entries for version management

### API Package
- `openapi-ts.config.ts` - OpenAPI code generation config
- `src/client/` - Auto-generated client code (don't edit manually)
- `src/Teslemetry.ts` - Main SDK entry point

**Gotcha**: energy-site SSE event union members are inconsistent about which field identifies the site - `live_status`/`site_info` carry `site_id`, but `energy_totals` (and any future refresh-notification event sharing that uniform `{id, product_type, topic, url, createdAt, isCache}` shape) carries `id` instead. `TeslemetryStream._dispatch()`'s two routing blocks (one per field name) reflect this; adding a new energy SSE event means checking which field the backend's schema actually uses, not assuming `site_id`. Every `on()` override across `TeslemetryStream`/`TeslemetryVehicleStream`/`TeslemetryEnergySiteStream` must call `super.on()` before replaying any cached value to the listener - reversing that order silently breaks `once()` (see `test/energyStream.test.ts`'s dead-listener regression tests).

**Gotcha**: `src/sseTopics.ts`'s `SSE_TOPICS` is the client-side mirror of the API's `src/lib/sseTopics.ts` allowlist - keep both in sync when the backend adds a wire event, or the new topic can never be selected via `stream.topics`. `SSE_TOPIC_PRESETS` entries are SDK-only convenience and are always expanded to exact wire names client-side before the `topics` query parameter is built - never send a preset name or a wildcard over the wire. `tariff_content_v2`'s body is `null` for the server's explicit tariff-removal signal, not merely "no update yet" - `EnergySiteCache.tariff_content_v2` distinguishes that (`null`) from "never received" (`undefined`), and replay/cache logic must preserve the distinction rather than treating `null` as falsy-skip.

### Node-RED Package
- `src/nodes/*.html` - Node UI definitions (copied to dist/)
- `src/shared.ts` - Shared utilities for all nodes

### n8n Package
- `src/credentials/` - Credential type definitions
- `src/nodes/` - Node implementations
- `src/shared.ts` - Shared state management

### Homebridge Package
- `src/vehicle-services/`, `src/energy-services/` - One class per HomeKit service, extending `base.ts`'s `BaseService`/`BaseEnergyService`
- `src/platform.ts` - Discovers vehicles/energy sites and registers HomeKit accessories

### ioBroker Package
- `lib/StateManager.ts` - Creates/updates ioBroker states and parses incoming state-change IDs back into vehicle/site commands
- `src/main.ts` - Adapter entry point; augments the ambient `ioBroker.AdapterConfig` type to match `io-package.json`'s native config schema

### CI/CD
- `.github/workflows/publish.yml` - Automated build, test, and publish. Its "Upgrade npm for OIDC support" step always installs `npm@latest`, whose `engines.node` requirement can rise ahead of the workflow's `actions/setup-node` pin (this happened 2026-07: npm 12 required node ^22.22.2/^24.15.0/>=26, but the workflow was pinned to Node 20, breaking every publish with EBADENGINE). If publish starts failing, check `npm view npm@latest engines` against the pinned `node-version` first.
- `pnpm/action-setup` in `publish.yml`/`ci.yml` must use `@v4` with no hardcoded `version:` (it then reads the `packageManager` field in root `package.json`). A `@v2`/hardcoded-major pin that drifts from `packageManager` (e.g. installing pnpm 9 while `packageManager` says `pnpm@10.x`) makes `changeset publish` silently fall through to a plain `npm publish` that rejects the `--git-checks` flag changesets passes for the pnpm path, failing with `EUNKNOWNCONFIG` - this looks like a changesets/flag bug but is actually a pnpm-version mismatch. Keep root `packageManager` and both workflow files' pnpm major in sync (see the sibling `tesla-protocol` repo's `publish.yml` for the working reference shape).

## Integration-Specific Notes

### n8n Integration (Active Development Area)

**Current State**: Early but functional
- Has 3 node types (Vehicle, Energy, Trigger)
- Credential management implemented
- Basic operations available

**Development Focus**:
- This is the package being actively developed
- Located at `packages/n8n-nodes-teslemetry/`
- Uses n8n's node framework
- Builds to single `dist/index.cjs` entry point

**Testing**:
```bash
cd packages/n8n-nodes-teslemetry
pnpm build
pnpm link --global  # Makes available to local n8n instance
```

**Key Files**:
- `src/nodes/TeslemetryVehicle.node.ts` - Main vehicle operations node
- `src/nodes/TeslemetryEnergy.node.ts` - Energy site operations
- `src/nodes/TeslemetryTrigger.node.ts` - Event-based triggers
- `src/credentials/TeslemetryApi.credentials.ts` - Authentication

**n8n Conventions**:
- Node class names must end with `.node.ts`
- Credential class names must end with `.credentials.ts`
- Icons referenced from `src/` directory
- Version field must match package.json

### Node-RED Integration
- Most mature integration
- 5 node types with full HTML UI
- HTML files must be manually copied during build
- Node-RED specific conventions in `.html` files

## TypeScript Configuration

### Root `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Package-Specific Configs
Each package extends the root config and adds:
- Custom `outDir` paths
- Package-specific `include` patterns
- Platform-specific type definitions

## Dependencies Between Packages

```
@teslemetry/api (core SDK)
    ↑
    ├── node-red-contrib-teslemetry (depends on API)
    ├── n8n-nodes-teslemetry (depends on API)
    ├── homebridge-teslemetry (depends on API)
    └── iobroker.teslemetry (depends on API)
```

All integrations use `"@teslemetry/api": "workspace:*"` to ensure they use the local version during development.

## Helpful Commands Reference

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter <package-name> build

# Create changeset
pnpm changeset

# Version packages (apply changesets)
pnpm changeset version

# Publish packages
pnpm changeset publish

# Run script in specific package
pnpm --filter <package-name> <script-name>

# Add dependency to specific package
pnpm --filter <package-name> add <dependency>

# Remove dependency from specific package
pnpm --filter <package-name> remove <dependency>

# Update all dependencies
pnpm update -r

# Clean node_modules
pnpm clean  # (if script exists)
rm -rf node_modules packages/*/node_modules

# Fresh install
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

## Resources

- **Teslemetry API Docs**: https://teslemetry.com/docs
- **pnpm Workspaces**: https://pnpm.io/workspaces
- **Changesets**: https://github.com/changesets/changesets
- **Node-RED**: https://nodered.org/docs/creating-nodes/
- **n8n**: https://docs.n8n.io/integrations/creating-nodes/
- **Homebridge Plugin Dev**: https://developers.homebridge.io/
- **ioBroker Adapter Dev**: https://www.iobroker.net/#en/documentation/dev/adapterdev.md

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add a changeset (`pnpm changeset`)
5. Submit a pull request

See individual package READMEs for package-specific contribution guidelines.

---

**Last Updated**: 2026-07-11
**Monorepo Version**: pnpm workspaces
**Primary Maintainer**: Teslemetry

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

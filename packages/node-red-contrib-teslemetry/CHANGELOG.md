# @teslemetry/node-red-contrib-teslemetry

## 0.5.0

### Minor Changes

- 3e1e7c9: Add media playback commands to the teslemetry-vehicle-command node: Play/Pause, Next Track, and Previous Track.
- 70f187e: Distinguish config/auth failures from ordinary reconnects on the `teslemetry-event`, `teslemetry-signal`, and `teslemetry-energy-event` nodes' status indicator, and automatically resume the stream after a bad/expired token clears - the SDK stops reconnecting on its own after repeated `auth_failure`, so previously this required a flow redeploy to recover.
- 55c75a4: Add `addChargeSchedule`/`removeChargeSchedule` and `addPreconditionSchedule`/`removePreconditionSchedule` command cases to `teslemetry-vehicle-command`, with strict parameter validation and example flows in `examples/all-features.json`.
- 2409cce: Add GPS navigation commands to the teslemetry-vehicle-command node: Navigation Request - GPS Coordinates (msg.lat, msg.lon, msg.order), Navigation Request - Supercharger (msg.id, msg.order), and Navigation Request - Waypoints (msg.waypoints), alongside the existing address/share-link Navigation Request.
- 3ae9250: Add manual seat cooling (`setSeatCooler`), preconditioning max on/off, climate keeper mode, and bioweapon defense mode on/off command cases to the Command node, wrapping the existing `@teslemetry/api` methods with matching editor dropdown options.
- 06e97a7: Add `setTimeOfUseSettings` command case to `teslemetry-energy-command`, with strict validation of the `tariffContentV2` tariff document against the SDK's `TariffContentV2` shape and an example flow.
- d32d9e5: Add Guest Mode, Valet Mode, PIN to Drive, and Speed Limit Mode commands to the vehicle command node. Password/PIN parameters are validated but never echoed into the node's error/status text on a validation failure - a bad PIN or password is redacted as `[redacted]` instead of leaking into the debug sidebar or Node-RED log.

## 0.4.0

### Minor Changes

- 116988d: Bring vehicle/energy capability parity up to the completed Homey capability-expansion campaign, expressed in this package's own idiom (raw signal/event streaming plus command nodes, rather than per-field Homey capabilities):

  - Added a `teslemetry-energy-event` node streaming real-time Energy Site `live_status`/`site_info`/`tariff_content_v2`/`energy_totals` events — energy sites previously had no push-based node, only REST polling.
  - Added vehicle commands: cabin overheat protection (on/off/fan-only, temp limit), software update schedule/cancel, scheduled charging/departure, automatic seat and steering-wheel climate, Cybertruck tonneau open/close, legacy S/X sunroof vent/close/stop, and absolute media volume.

  Raw telemetry for most of the campaign's other themes (TPMS, route/ETA, Powershare, HV battery pack diagnostics, presence, grid-outage status, and more) was already reachable via the existing `teslemetry-signal`/`teslemetry-event` nodes without any new wiring, since those expose any field from the live API field registry dynamically.

## 0.3.0

### Minor Changes

- d2907d5: Add a "Get Tariff (TOU rates)" command to the Energy Command node, surfacing the SDK's `getTariff()` read (time-of-use rate schedule) in flows.

## 0.2.1

### Patch Changes

- 6291669: Update SSE event handling to use standard EventEmitter pattern:

  - Replace `onData()`, `onState()`, etc. with `on("data")`, `on("state")` pattern
  - Use new `on("all")` event for subscribing to all events
  - Add VIN filtering in event callbacks

  Improve error handling:

  - Config node tracks errors from initial API verification (auth/subscription issues)
  - All nodes now show "Error" status with red ring when API verification fails
  - Nodes wait for API verification before attempting SSE connections
  - Clearer error messages in node logs

  Refactor shared helpers:

  - Add `getInstance()` to get and validate config instance
  - Add `hasInstanceError()` for synchronous error checking (command nodes)
  - Add `verifyInstance()` for async verification before SSE connection
  - Add `getErrorMessage()` to extract useful messages from any error type (handles hey-api response objects)

## 0.2.0

### Minor Changes

- c47e6b4: Add teslemetry-energy-history node for retrieving historical energy data

  New node supports three history types:

  - Energy History - energy measurements (solar, battery, grid) aggregated by period
  - Backup History - off-grid event history aggregated by period
  - Telemetry (Charging) - wall connector charging history

  Configurable date range with start/end dates and timezone support.

## 0.1.3

### Patch Changes

- fa21299: Enhance Node-RED integration documentation and metadata

  **Documentation Improvements:**

  - Added npm installation instructions (via npm and Palette Manager)
  - Added badges for npm version and license
  - Comprehensive README update with:
    - Features section highlighting key capabilities
    - Prerequisites section for getting started
    - Configuration guide
    - 4 usage examples with real-world scenarios
    - Complete list of available vehicle and energy commands
    - Event types documentation (including all 9 event types)
    - Resources and support links

  **Package Metadata:**

  - Enhanced description: "Node-RED nodes for controlling Tesla vehicles and energy sites via Teslemetry API"
  - Expanded keywords: Added automation, vehicle, energy, powerwall, solar, iot, smart-home

  This brings the Node-RED documentation quality to match the n8n integration improvements.

## 0.1.2

### Patch Changes

- e72beac: Improve typing and minor cleanup

## 0.1.1

### Patch Changes

- 16a577a: Improve Node-RED scorecard

## 0.1.0

### Minor Changes

- 8495521: Fully working release with 4 nodes

### Patch Changes

- 6825e08: Rename nodes
- fb5147a: Fixed VIN selector, added signal selector, and renamed vehicle to vehicle command

## 0.0.2

### Patch Changes

- Added core nodes and functionality

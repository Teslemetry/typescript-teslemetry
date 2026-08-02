# @teslemetry/node-red-contrib-teslemetry

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

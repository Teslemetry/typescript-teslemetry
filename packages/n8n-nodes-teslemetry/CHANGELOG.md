# @teslemetry/n8n-nodes-teslemetry

## 0.4.1

### Patch Changes

- b61aef4: Add regression coverage for the Vehicle and Energy nodes' operation dispatch (endpoint and argument shape for every switch-case), Continue On Fail behavior, and the Trigger node's VIN/site filtering and signal-field validation. No product code changes.
- 76ebb96: Surface a terminal Teslemetry stream auth failure on the Trigger node as a workflow-visible error instead of leaving the trigger apparently active but silently producing no more items. Stream health handlers are now registered before the stream connects, and `closeFunction` cleanup is idempotent.

## 0.4.0

### Minor Changes

- 1198995: Add climate/seat automation, closure and window control, charging schedule, software update, and volume operations to the Vehicle node, and add Energy Site event support (live status, site info, tariff content, energy totals) to the Trigger node, bringing capability coverage in line with the Homey integration's capability-expansion campaign.

## 0.3.0

### Minor Changes

- 0f960f6: Add a "Get Tariff" operation to the Teslemetry Energy node, surfacing the SDK's `getTariff()` read (time-of-use rate schedule) in workflows.

## 0.2.2

### Patch Changes

- 0a00bb9: Fix the VIN, energy site, and signal field dropdowns (`loadOptions`) throwing `TypeError: ... is not a function` instead of populating, because they called nonexistent `TeslemetryApi` methods (`.vehicles()`, `.products()`, `.fields()` instead of `.getVehicles()`, `.getProducts()`, `.getFields()`).

## 0.2.1

### Patch Changes

- 6291669: Update SSE event handling to use standard EventEmitter pattern:
  - Replace `onData()`, `onState()`, etc. with `on("data")`, `on("state")` pattern
  - Use new `on("all")` event for subscribing to all events
  - Add VIN filtering in event callbacks

## 0.2.0

### Minor Changes

- e0978a1: Uplift n8n integration to feature-complete status, ready for publishing

  **New Features:**

  - Added "errors" event type to Teslemetry Trigger node for monitoring vehicle error events

  **Improvements:**

  - Enhanced package.json with better metadata, author info, and keywords (including n8n-community-node-package)
  - Added node engine requirement (>=18.0.0)
  - Comprehensive README update with:
    - Installation instructions from npm
    - Usage examples and workflow scenarios
    - Better documentation of all node types and operations
    - Links to resources and support

  **Status:**

  - Feature parity with Node-RED integration achieved
  - All vehicle operations (22/22) implemented
  - All energy operations (7/7) implemented
  - All event types (9/9) including the newly added "errors" type
  - Ready for publishing to npm registry

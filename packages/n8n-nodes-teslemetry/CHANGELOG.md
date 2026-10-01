# @teslemetry/n8n-nodes-teslemetry

## 0.5.0

### Minor Changes

- 7ad7e72: Make the package installable in n8n, and make failures visible.

  - **Loading.** Every earlier version listed a single bundle in its manifest, and n8n (which takes each class name from its file name) loaded no nodes and no credential from it. The package now builds one file per node and credential, so it installs from Community Nodes and shows Teslemetry Vehicle, Teslemetry Energy, Teslemetry Trigger and the Teslemetry API credential. It also declares `n8nNodesApiVersion` and the `n8n-workflow` peer dependency, ships a LICENSE file, and the Vehicle node has an icon instead of a question mark.
  - **Errors.** A failed Teslemetry request now shows the API's own message (for example "Active subscription required") with its HTTP status, in the node's error, in the error item when Continue On Fail is on, and in the vehicle, site and field dropdowns. Previously the error was blank. A command the API answers with `result: false` now fails with its reason instead of passing as a success, unless the reason is `already_set`, `not_charging` or `requested`.
  - **Trigger.** The Trigger node checks the token and subscription before it opens the stream, so a wrong or revoked token or a lapsed subscription fails activation with a message instead of putting n8n into a reactivation loop. A subscription that lapses later is reported once, and a rate-limited stream is logged once while it keeps retrying.
  - **Logging.** SDK log lines go through n8n's logger at debug level instead of being written to the process output, and one SDK client is built per execution rather than per item.

  Also picks up the bundled SDK's stream reconnect fix: the backoff resets as soon as any traffic arrives on the stream.

## 0.4.1

### Patch Changes

- bd225a7: Add regression coverage for the Vehicle and Energy nodes' operation dispatch (endpoint and argument shape for every switch-case), Continue On Fail behavior, and the Trigger node's VIN/site filtering and signal-field validation. No product code changes.
- 36afaac: Surface a terminal Teslemetry stream auth failure on the Trigger node as a workflow-visible error instead of leaving the trigger apparently active but silently producing no more items. Stream health handlers are now registered before the stream connects, and `closeFunction` cleanup is idempotent.

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

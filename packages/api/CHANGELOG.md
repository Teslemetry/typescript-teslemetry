# @teslemetry/api

## 0.10.0

### Minor Changes

- 9cd3c30: Add `live_status`/`site_info` energy SSE events to `TeslemetryStream`, mirroring the existing vehicle event surface. `sse.getEnergySite(id)` returns a `TeslemetryEnergySiteStream` (analogous to `getVehicle`) that emits these events and replays the local cache to new listeners; account-wide and single-site streams both work through the existing optional-id connection mechanism. Forward-compatible and inert until the backend's energy SSE feature (flag-gated) is enabled.
- dba83c5: Add the `energy_totals` energy SSE event to `TeslemetryStream`/`TeslemetryEnergySiteStream`, mirroring the existing `live_status`/`site_info` event surface. The event carries a compact, typed cumulative-totals object (`EnergyHistoryTotals`) plus the canonical REST `url` to re-fetch the full calendar history document - it never carries the full time_series/events payload itself. Silence on this event means no change since the last server-side poll, not staleness. Purely additive; existing event contracts are unchanged.
- 1908085: Add typed support for the API's SSE topic-selection and tariff-v2 protocol changes:

  - `stream.topics` opt-in on `Teslemetry`/`TeslemetryStream` selects an exact comma-separated topic allowlist, either exact wire names or the bundled `SSE_TOPIC_PRESETS` (`vehicleFull`, `vehicleCore`, `energyLive`, `energyFullState`, `account`), expanded client-side before connecting. Omitting `topics` keeps legacy-all behavior forever.
  - New `tariff_content_v2` event on `TeslemetryStream`/`TeslemetryEnergySiteStream`; a `null` body is the server's explicit tariff-removal signal, distinct from "no update yet".
  - `site_info` events no longer carry tariff fields (matches the server's slim `site_info` schema); existing `site_info` listeners keep working unchanged.
  - `TeslemetryEnergySiteStream.siteInfoDocument` composes the cached slim `site_info` with the last received tariff piece into a whole-document view.

  Purely additive; existing event contracts are unchanged.

## 0.9.0

### Minor Changes

- 1445aa6: Add wrapper methods on `TeslemetryEnergyApi` for the remaining generated energy-command functions: `getPrograms()`, `sendCommand()`, `getCommandSystemInfo()`, `getCommandNetworkingStatus()`, `getCommandAuthorizedClients()`, `getCommandSignedCommandsPublicKey()`, `getCommandWifiScan()`, `getCommandDeviceCert()`, `scheduleBackupEvent()`, `cancelBackupEvent()`, `setLocalSiteConfig()`, `setIslandMode()`, `addAuthorizedClient()`, and `removeAuthorizedClient()`. These cover Powerwall/gateway networking diagnostics, guest-client (installer) access management, and scheduled backup-event control, which previously required calling the generated client functions directly.
- 2d1d852: Add `getTariff()` to `TeslemetryEnergyApi`, a typed accessor for the site's time-of-use tariff (`tariff_id`, `tariff_content`, `tariff_content_v2`). No dedicated tariff endpoint exists in the Fleet API, so this reads the fields out of `getSiteInfo()` rather than issuing a new request.

## 0.8.0

### Minor Changes

- a06f296: Add `TeslemetryEnergyApi.setTimeOfUseSettings()` to write an energy site's time-of-use tariff (buy/sell rate schedule), mirroring the `/api/1/energy_sites/{id}/time_of_use_settings` endpoint. Previously the client only exposed tariff reads via `getSiteInfo()`.

### Patch Changes

- 0a00bb9: Fix `speedLimitClearPinAdmin()` sending no request body at all, which stripped the Content-Type header and made the Fleet API reject the call. Also fix an SSE `vin` type mismatch when dispatching account-wide `credits` events (no behavior change).

## 0.7.1

### Patch Changes

- 4405c76: Fix streaming field-update failures logging a bare, contextless error message (e.g. just "Not Found") with no indication of which vehicle or fields failed. The log now includes the VIN and the full error.

## 0.7.0

### Minor Changes

- a73ad21: Stop the SSE stream from reconnect-looping forever on persistent authentication failure, and surface stream errors as typed events.
  - Every connection failure now flows through `TeslemetryStream`'s reconnect loop (the generated client previously retried internally, swallowing errors and reusing the original access token forever), so the access token callback is re-resolved on every reconnect and a refreshed token is actually picked up.
  - New `stream_error` event on every failed attempt: `{ error, status?, retries }`.
  - On a `401`/`403` the stream reconnects once immediately with a freshly resolved token; a second consecutive auth rejection stops the stream and emits a terminal `auth_failure` event carrying a new `TeslemetryStreamAuthError` (with `.status`) instead of retrying forever. The failure streak resets when genuine events arrive. Call `connect()` again to resume after re-authenticating.

### Patch Changes

- 502932c: Updated API routes

## 0.6.13

### Patch Changes

- 0b18bc3: Fix timezone handling in telemetry history API calls

  - Format dates as RFC3339 with local timezone offset instead of UTC
  - Default time_zone parameter to local IANA timezone

- 1a40778: Field updates no longer throw when nothing changed, but return a boolean instead
- a18f277: Add energy command endpoint

## 0.6.12

### Patch Changes

- 54c358b: Fix timezone bug in date formatting for telemetry history API calls

## 0.6.11

### Patch Changes

- 8fedd76: Fix bug with sendCache

## 0.6.10

### Patch Changes

- 6291669: Standardize SSE event handling to use EventEmitter pattern:

  - Remove `onConnection()` helper method - use `on("connect")` and `on("disconnect")` instead
  - Add `"all"` event type to subscribe to all SSE events at once
  - Update documentation and examples to reflect new patterns

  Fix unhandled promise rejections in SSE streaming:

  - Add error handling to `connect()` method's internal connection loop
  - `updateFields()` now returns a promise that resolves/rejects when the debounced update completes
  - Multiple calls within the debounce window share the same promise
  - `addField()` now properly returns the promise from `updateFields()`

  Refactor `updateFields()` internals:

  - Consolidate batch state into single `_fieldUpdateBatch` object
  - Extract flush logic into `_flushFieldUpdate()` method
  - Use Deferred pattern for cleaner promise handling

## 0.6.9

### Patch Changes

- 5d045ee: Fix the streaming types

## 0.6.8

### Patch Changes

- 818f55a: Updated client types, and increaed fields debounce
- 1fb55c4: Fix getApi1EnergySitesByIdTelemetryHistory date inputs

## 0.6.7

### Patch Changes

- e887196: Allow dates to be undefined and excluded from the API calls.

## 0.6.6

### Patch Changes

- b7c2726: Fix types for calandarHistory

## 0.6.5

### Patch Changes

- 3ecc77d: Cache and refresh history endpoints

## 0.6.4

### Patch Changes

- 5cce64e: Add emit to history data polling, and add sumEnergyHistory helper

## 0.6.3

### Patch Changes

- 06d4767: Add more energy API to schedule, and also add better typing with overloads to getCalendarHistory

## 0.6.2

### Patch Changes

- 410733e: Added error handling to scheduled energy API calls, and added event emitters to other classes

## 0.6.1

### Patch Changes

- 6838cdd: Add throwOnError option but default to true.

## 0.6.0

### Minor Changes

- d6211a7: createProducts now throws on error, such as a lack of subscription. User and Charging are automatically created now.

## 0.5.6

### Patch Changes

- eb0401e: Improve getCalendarHistory in Energy API

## 0.5.5

### Patch Changes

- 51f1009: Fixed reuse type
- 28ec7a5: Add cache prop to the vehicle stream

## 0.5.4

### Patch Changes

- 41d70db: Updated SSE types

## 0.5.3

### Patch Changes

- 504efa2: Add energy cache and reuse

## 0.5.2

### Patch Changes

- 3fdbfc1: Updated site_info schema

## 0.5.1

### Patch Changes

- c082ab4: Added cache on listen

## 0.5.0

### Minor Changes

- c0b252c: Rework createProducts to use metadata instead, and add energy refresh system

### Patch Changes

- 6a1af6a: Bump to re-release

## 0.4.0

### Minor Changes

- 5afef9b: Refactor to use native event emitters, and add emitters for API get requests.

## 0.3.0

### Minor Changes

- e1447a5: Allow for dynamic (OAuth2) access tokens

## 0.2.2

### Patch Changes

- 6ff4699: Fix some types

## 0.2.1

### Patch Changes

- e427dde: Fix wake return type

## 0.2.0

### Minor Changes

- 864dbb2: Public release

## 0.1.0

### Minor Changes

- Updated SDK documentation

## 0.0.2

### Patch Changes

- 8f87243: Added fields endpoint
- 8f87243: Fixed the return value of a few base API methods
- c7c7dce: Added root createProducts endpoint
- 3b47ce6: Remove controller and fix connected prop
- c7c7dce: Add single options object and add ability to disable stream cache

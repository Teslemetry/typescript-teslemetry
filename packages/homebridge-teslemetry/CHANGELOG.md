# @teslemetry/homebridge-teslemetry

## 1.1.1

### Patch Changes

- Updated dependencies [c170974]
  - @teslemetry/api@0.11.1

## 1.1.0

### Minor Changes

- 387add0: Add HomeKit accessories for two of the four telemetry signals selected in the 2026-07-29 field-parity audit that have a clean HomeKit concept: a `WindowCovering` for the Cybertruck's tonneau cover (`TonneauOpenPercent`/`closure({ tonneau })`, `TargetPosition` restricted to 0/100 since the vehicle command is open/close only), and a read-only `ContactSensor` for `RearDefrostEnabled` (no rear-specific command exists, so it's display-only rather than a fake-writable `Switch`). The tonneau service is gated to Cybertruck vehicles via `@teslemetry/api`'s newly-exported `useTeslaModel(vin)` helper. The other two selected signals - the FSD mileage counters (`MilesSinceReset`, `SelfDrivingMilesSinceReset`) and `LifetimeEnergyGainedRegen` - have no stock HomeKit characteristic for arbitrary distance or energy values, so they're intentionally left unmapped rather than forced onto an unrelated sensor type.

### Patch Changes

- b65ff34: `DoorService` now gates its frunk/trunk contact sensors on the vehicle metadata's `config.can_actuate_trunks` instead of registering them unconditionally - vehicles with manual latch-only frunk/trunk hardware no longer get contact sensors for hardware they don't have. The VIN alone can't distinguish powered from latch-only hardware within a model line, but the metadata surface can.
- dc644ce: Climate accessory now uses `HvacPower` (the vehicle's actual system power state) instead of `HvacACEnabled` to determine HomeKit's `CurrentHeatingCoolingState`. Previously the accessory reported the climate system OFF whenever the AC compressor wasn't running, even while heating was active. `HvacACEnabled` is now only used to distinguish HEAT from COOL once `HvacPower` reports the system on.
- Updated dependencies [288440b]
- Updated dependencies [7265d49]
- Updated dependencies [387add0]
- Updated dependencies [4b5cf92]
  - @teslemetry/api@0.11.0

## 1.0.1

### Patch Changes

- 7795040: Energy site accessories now consume `live_status` from the account stream instead of REST-polling it, matching the vehicle streaming path. An initial REST read still seeds deterministic startup values, and the persistent stream listener picks up the SDK's cache replay on reconnect. `site_info` stays REST-driven as the primary source, with stream events opportunistically merged in between polls.
- Updated dependencies [9cd3c30]
- Updated dependencies [dba83c5]
- Updated dependencies [1908085]
  - @teslemetry/api@0.10.0

## 1.0.0

### Major Changes

- 74e9990: Publish the monorepo Homebridge plugin under the same npm name as the legacy `homebridge-teslemetry` package, superseding it with a major version (1.0.0 over legacy 0.4.x). This is a hard cut, not a parallel release - there is no dual-maintenance and no rename; going forward `homebridge-teslemetry` on npm is this package.

  **Breaking: the HomeKit service set has changed.** The legacy plugin registered 14 vehicle services and 7 energy services. This package registers 11 vehicle services and 6 energy services, and is subType-aware for services that previously collided under a shared HomeKit service type (e.g. `LockService`/`ChargePortService` both used `Service.LockMechanism`; several switches shared `Service.Switch`). Existing users upgrading from the legacy package should expect some HomeKit accessories/tiles to disappear, merge, or need re-pairing in the Home app after upgrade - this is expected, not a regression.

## 0.1.11

### Patch Changes

- 506071b: Fix a service-collision bug where multiple HomeKit services sharing the same service type (`Switch`: ChargeSwitch/Defrost/Sentry/Wake; `LockMechanism`: Lock/ChargePort) collapsed onto a single instance, silently breaking every write path except the last one constructed. Service lookup now matches on subType as well as type, so each service registers and responds independently.

## 0.1.10

### Patch Changes

- Updated dependencies [1445aa6]
- Updated dependencies [2d1d852]
  - @teslemetry/api@0.9.0

## 0.1.9

### Patch Changes

- Updated dependencies [a06f296]
- Updated dependencies [0a00bb9]
  - @teslemetry/api@0.8.0

## 0.1.8

### Patch Changes

- Updated dependencies [4405c76]
  - @teslemetry/api@0.7.1

## 0.1.7

### Patch Changes

- Updated dependencies [a73ad21]
- Updated dependencies [502932c]
  - @teslemetry/api@0.7.0

## 0.1.6

### Patch Changes

- Updated dependencies [0b18bc3]
- Updated dependencies [1a40778]
- Updated dependencies [a18f277]
  - @teslemetry/api@0.6.13

## 0.1.5

### Patch Changes

- Updated dependencies [54c358b]
  - @teslemetry/api@0.6.12

## 0.1.4

### Patch Changes

- Updated dependencies [8fedd76]
  - @teslemetry/api@0.6.11

## 0.1.3

### Patch Changes

- 6291669: Remove non-existent "error" event listeners from SSE stream handlers (errors result in disconnect events)
- Updated dependencies [6291669]
  - @teslemetry/api@0.6.10

## 0.1.2

### Patch Changes

- Updated dependencies [5d045ee]
  - @teslemetry/api@0.6.9

## 0.1.1

### Patch Changes

- Updated dependencies [818f55a]
- Updated dependencies [1fb55c4]
  - @teslemetry/api@0.6.8

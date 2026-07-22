# @teslemetry/homebridge-teslemetry

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

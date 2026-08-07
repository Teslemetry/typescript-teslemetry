# iobroker.teslemetry

## 0.2.5

### Patch Changes

- Updated dependencies [57d1415]
  - @teslemetry/api@0.11.3

## 0.2.4

### Patch Changes

- Updated dependencies [b5c8b63]
- Updated dependencies [0be2d1b]
- Updated dependencies [f17e85c]
  - @teslemetry/api@0.11.2

## 0.2.3

### Patch Changes

- Updated dependencies [c170974]
  - @teslemetry/api@0.11.1

## 0.2.2

### Patch Changes

- Updated dependencies [288440b]
- Updated dependencies [7265d49]
- Updated dependencies [387add0]
- Updated dependencies [4b5cf92]
  - @teslemetry/api@0.11.0

## 0.2.1

### Patch Changes

- Updated dependencies [9cd3c30]
- Updated dependencies [dba83c5]
- Updated dependencies [1908085]
  - @teslemetry/api@0.10.0

## 0.2.0

### Minor Changes

- 7dc9304: Surface the site's time-of-use tariff (`tariff_id`, `tariff_content`, `tariff_content_v2`) as read-only states under `energy.{SITE_ID}.tariff`. Read-only, matching the node-red/Homey tariff precedent - no tariff write or VPP surfaces.

## 0.1.11

### Patch Changes

- 7b86f6c: Publish to npm. The adapter has been private while the ioBroker-specific packaging (io-package.json metadata, admin icon) caught up to the rest of the monorepo; that work is done, so this drops `private: true` and lets the changesets pipeline publish it like the other packages.

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

- 6291669: Update SSE event handling to use standard EventEmitter pattern:
  - Replace `onOpen()`, `onClose()`, `onError()` with `on("connect")`, `on("disconnect")`
  - Replace `onData()`, `onState()`, `onAlert()` with `on("data")`, `on("state")`, `on("alerts")`
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

# iobroker.teslemetry

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

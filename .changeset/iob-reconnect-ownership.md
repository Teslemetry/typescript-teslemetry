---
"iobroker.teslemetry": patch
---

Give the SDK sole ownership of stream reconnection instead of running a competing five-attempt reconnect timer alongside it: `StreamHandler` now registers its stream listeners exactly once (fixing double-registration on repeated `connect()` calls) and handles `stream_error` and terminal `auth_failure`, so `info.connection` accurately reflects whether the stream is transiently down or has stopped for good.

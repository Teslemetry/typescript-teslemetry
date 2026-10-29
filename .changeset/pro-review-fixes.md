---
"@teslemetry/api": patch
---

Fix four bugs:
- Passing `stream: { vin }` to `new Teslemetry()` no longer throws a `TypeError` during construction.
- `TeslemetryVehicleStream.getConfig()` now sends the request through the configured client (token and region), and a 404 now logs a warning instead of throwing.
- `getRegion()` now returns `null` instead of an unchecked value when the server sends no `x-region` header or an unrecognized one. The response interceptor also ignores an unrecognized region, so it no longer switches the base URL to it.
- Energy-site polling errors are now passed to `logger.warn` as a method call, so a class-based logger keeps its `this`.

The `api.ts` example no longer prints the access token.

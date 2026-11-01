---
"@teslemetry/api": patch
"@teslemetry/pro": patch
---

Build against `tesla-fleet-api` 0.4, importing its `tariff`, `const` and `types` subpaths instead of the removed `dist/...` deep imports. The bundled output is unchanged in behaviour and still has no runtime `tesla-fleet-api` dependency.

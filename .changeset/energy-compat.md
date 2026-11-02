---
"@teslemetry/api": minor
---

Add `EnergySiteCompat` to `@teslemetry/api/compat`, which exposes an energy site under `tesla-fleet-api`'s method names and arguments so it can be an `EnergySiteRouter` backend. A single-setting `grid_import_export` call sends only that setting.

---
"@teslemetry/api": patch
---

`ingest()` now drops `state`, `site_id` and `totals` from `metadata`, which previously sent the event down the wrong path, so `data` listeners and `onSignal()` callbacks missed it.

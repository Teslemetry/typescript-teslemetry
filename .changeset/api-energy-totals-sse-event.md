---
"@teslemetry/api": minor
---

Add the `energy_totals` energy SSE event to `TeslemetryStream`/`TeslemetryEnergySiteStream`, mirroring the existing `live_status`/`site_info` event surface. The event carries a compact, typed cumulative-totals object (`EnergyHistoryTotals`) plus the canonical REST `url` to re-fetch the full calendar history document - it never carries the full time_series/events payload itself. Silence on this event means no change since the last server-side poll, not staleness. Purely additive; existing event contracts are unchanged.

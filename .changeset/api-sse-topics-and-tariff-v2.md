---
"@teslemetry/api": minor
---

Add typed support for the API's SSE topic-selection and tariff-v2 protocol changes:

- `stream.topics` opt-in on `Teslemetry`/`TeslemetryStream` selects an exact comma-separated topic allowlist, either exact wire names or the bundled `SSE_TOPIC_PRESETS` (`vehicleFull`, `vehicleCore`, `energyLive`, `energyFullState`, `account`), expanded client-side before connecting. Omitting `topics` keeps legacy-all behavior forever.
- New `tariff_content_v2` event on `TeslemetryStream`/`TeslemetryEnergySiteStream`; a `null` body is the server's explicit tariff-removal signal, distinct from "no update yet".
- `site_info` events no longer carry tariff fields (matches the server's slim `site_info` schema); existing `site_info` listeners keep working unchanged.
- `TeslemetryEnergySiteStream.siteInfoDocument` composes the cached slim `site_info` with the last received tariff piece into a whole-document view.

Purely additive; existing event contracts are unchanged.

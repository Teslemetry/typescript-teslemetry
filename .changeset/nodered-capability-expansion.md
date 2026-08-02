---
"@teslemetry/node-red-contrib-teslemetry": minor
---

Bring vehicle/energy capability parity up to the completed Homey capability-expansion campaign, expressed in this package's own idiom (raw signal/event streaming plus command nodes, rather than per-field Homey capabilities):

- Added a `teslemetry-energy-event` node streaming real-time Energy Site `live_status`/`site_info`/`tariff_content_v2`/`energy_totals` events — energy sites previously had no push-based node, only REST polling.
- Added vehicle commands: cabin overheat protection (on/off/fan-only, temp limit), software update schedule/cancel, scheduled charging/departure, automatic seat and steering-wheel climate, Cybertruck tonneau open/close, legacy S/X sunroof vent/close/stop, and absolute media volume.

Raw telemetry for most of the campaign's other themes (TPMS, route/ETA, Powershare, HV battery pack diagnostics, presence, grid-outage status, and more) was already reachable via the existing `teslemetry-signal`/`teslemetry-event` nodes without any new wiring, since those expose any field from the live API field registry dynamically.

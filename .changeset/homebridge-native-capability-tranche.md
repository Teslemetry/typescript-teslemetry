---
"homebridge-teslemetry": minor
---

Add the HomeKit-native "safety, presence, and energy continuity" capability tranche:

- Vehicle home/work OccupancySensor presence (favourite location opt-in via `enableFavoritePresence`), created only once a field actually reports a value and debounced against geofence-boundary flicker.
- TPMS warning contact sensors: one aggregate critical-warning sensor plus four per-wheel soft-warning sensors, preserving "unknown" via `StatusFault` rather than defaulting a missing reading to safe.
- Grid outage and active Storm Watch contact sensors driven by `live_status`, distinct from the existing Storm Watch settings switch.
- Wall Connector fault and vehicle-connected contact sensors per Wall Connector DIN.

No power/pressure/coordinate numerics are exposed anywhere in this tranche - only standard HomeKit services and semantic booleans.

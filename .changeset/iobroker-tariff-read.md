---
"iobroker.teslemetry": minor
---

Surface the site's time-of-use tariff (`tariff_id`, `tariff_content`, `tariff_content_v2`) as read-only states under `energy.{SITE_ID}.tariff`. Read-only, matching the node-red/Homey tariff precedent - no tariff write or VPP surfaces.

---
"homebridge-teslemetry": patch
---

Stop the Powerwall "Grid Charging" switch from rewriting the site's export rule. Toggling it used to send an export rule alongside the grid charging flag, silently switching sites set to export (`battery_ok` or `pv_only`) to `never` and inventing a rule for sites with none; it now sends only the grid charging flag.

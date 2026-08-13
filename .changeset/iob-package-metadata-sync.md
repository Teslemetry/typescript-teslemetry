---
"iobroker.teslemetry": patch
---

Sync `io-package.json` adapter metadata (version, news, deprecated fields, dependency minimums) with the published package and add a test that fails CI if they drift apart again. Also addresses several ioBroker repository-checker findings: admin UI translations for English/German, JSON-config schema fixes, README/changelog/license formatting, and a `this.setInterval()`/`this.clearInterval()` fix for the polling timer.

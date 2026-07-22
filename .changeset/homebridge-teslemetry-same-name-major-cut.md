---
"homebridge-teslemetry": major
---

Publish the monorepo Homebridge plugin under the same npm name as the legacy `homebridge-teslemetry` package, superseding it with a major version (1.0.0 over legacy 0.4.x). This is a hard cut, not a parallel release - there is no dual-maintenance and no rename; going forward `homebridge-teslemetry` on npm is this package.

**Breaking: the HomeKit service set has changed.** The legacy plugin registered 14 vehicle services and 7 energy services. This package registers 11 vehicle services and 6 energy services, and is subType-aware for services that previously collided under a shared HomeKit service type (e.g. `LockService`/`ChargePortService` both used `Service.LockMechanism`; several switches shared `Service.Switch`). Existing users upgrading from the legacy package should expect some HomeKit accessories/tiles to disappear, merge, or need re-pairing in the Home app after upgrade - this is expected, not a regression.

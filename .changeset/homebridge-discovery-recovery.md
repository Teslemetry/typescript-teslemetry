---
"homebridge-teslemetry": patch
---

Discovery no longer gives up when Teslemetry cannot be reached at start: it retries until it succeeds, waiting at most 5 minutes between tries. Until a cached accessory is set up, HomeKit writes to it fail instead of reporting success and sending nothing; after 5 minutes of failed discovery its tiles show No Response. A product that fails to set up no longer keeps the others out of HomeKit, and an empty vehicle or site name falls back to a default. A vehicle outside the subscription or unable to stream (unpaired virtual key, streaming toggle off, missing `vehicle_device_data` scope) gets one plain log line; if it was already in HomeKit its tiles show No Response, otherwise it is not added. The legacy 0.4.x config keys `ignore_vin` and `ignore_site` are read again.

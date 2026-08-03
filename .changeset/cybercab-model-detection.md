---
"@teslemetry/api": patch
"homebridge-teslemetry": patch
---

Add Cybercab ("A") to VIN-based model detection: `useTeslaModel` now decodes the 4th VIN character "A" to "Cybercab", and the Homebridge information service's model-name extraction recognizes "Cybercab" in the vehicle name.

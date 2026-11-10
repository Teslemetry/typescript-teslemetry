---
"@teslemetry/node-red-contrib-teslemetry": minor
---

The Vehicle Command node runs any Teslemetry API vehicle command given in `msg.command` by its route name, such as `set_charge_limit`, `closure` or `charge_on_solar`, with its arguments in `msg.payload`. Arguments are checked against the API's ranges and allowed values before sending. Existing command names and their arguments work as before.

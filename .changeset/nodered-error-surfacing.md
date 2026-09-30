---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Show the API's own reason when a vehicle command, energy command or energy history request fails. The node status and the Catch node's `msg.error.message` now carry the text the API returned (for example "Insufficient credits. Balance: 0" or "vehicle unavailable") instead of a blank status and the fixed text "Teslemetry API Error", and a network failure names its cause. A failed request no longer triggers Complete nodes. Messages are no longer dropped while the account check (`/api/metadata`) is failing: the request is sent and any failure reaches Catch nodes.

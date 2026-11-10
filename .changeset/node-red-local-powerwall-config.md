---
"@teslemetry/node-red-contrib-teslemetry": minor
---

New "Teslemetry Local Powerwall" config node, which connects Node-RED to a Powerwall gateway on your local network. Pick the energy site and press Pair: Node-RED creates its own key and registers it with the Powerwall, and you approve it once by flicking the On/Off switch on your primary Powerwall off and back on. Then enter the gateway's Wi-Fi password and press Verify. The gateway's address is filled in for you. The key and password are stored as Node-RED credentials, so they are never part of an exported flow, and "Remove key" takes the key off the gateway again.

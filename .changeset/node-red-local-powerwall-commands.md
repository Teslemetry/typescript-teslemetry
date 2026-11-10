---
"@teslemetry/node-red-contrib-teslemetry": minor
---

The Energy Command node has a new optional "Local gateway" field. Pick a Teslemetry Local Powerwall config node and backup reserve, operation mode, grid export, battery dispatch and resume go to the Powerwall gateway over your local network first, so they work without the internet. If the gateway does not answer, the command goes through the Teslemetry cloud instead; if the gateway answers and refuses, the node reports that error. The status under the node shows `local` or `cloud` for the path the command took. With a local gateway, dispatch and resume are signed with Node-RED's own key, so they also work for a site that is not paired with Teslemetry. Flows without a local gateway are unchanged.

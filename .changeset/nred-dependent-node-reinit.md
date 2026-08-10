---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Fix vehicle-command, energy-command, and energy-history nodes staying permanently inert when constructed while the config node's initial products fetch is still failing - they now re-check that error per message instead of once at construction, so a node built during that window becomes functional as soon as the fetch recovers, with no redeploy needed.

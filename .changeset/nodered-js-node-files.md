---
"@teslemetry/node-red-contrib-teslemetry": patch
---

Ship the node files as `.js` instead of `.cjs` so the nodes appear in the editor palette on Node-RED 3.x and 4.0.x. Those releases locate a node's editor file by replacing `.js` with `.html`, so the `.cjs` files left the palette empty on every Node-RED before 4.1.0 even though the package installed and its nodes ran.

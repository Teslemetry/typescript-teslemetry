---
"@teslemetry/n8n-nodes-teslemetry": patch
---

Fix n8n community node package loading error

- Build separate files for each node and credential instead of bundling into single file
- Update n8n configuration in package.json to point to individual node/credential files
- Move @teslemetry/api from devDependencies to dependencies (required at runtime)

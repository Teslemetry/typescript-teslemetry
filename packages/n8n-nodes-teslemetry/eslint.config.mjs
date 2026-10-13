import { config } from "@n8n/node-cli/eslint";
import { globalIgnores } from "eslint/config";

// Tests and dev scripts never ship (`files` is `["dist"]`), so they are outside
// n8n's community-node rules.
export default [...config, globalIgnores(["test", "scripts", "tsdown.config.ts", "eslint.config.mjs"])];

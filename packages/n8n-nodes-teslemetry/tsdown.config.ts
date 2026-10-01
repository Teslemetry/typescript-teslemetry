import { defineConfig } from "tsdown";

export default defineConfig({
  // n8n loads one class per file listed in package.json's `n8n` block and takes
  // the class name from the file name, so each node and credential is its own
  // entry: dist/nodes/<Class>.node.js, dist/credentials/<Class>.credentials.js.
  entry: ["src/nodes/*.node.ts", "src/credentials/*.credentials.ts"],
  format: "cjs",
  platform: "node",
  // n8n derives a node's codex path by appending "on" to the ".js" file name.
  outExtensions: () => ({ js: ".js" }),
});

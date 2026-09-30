import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const nodes: Record<string, string> = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
)["node-red"].nodes;

// Node-RED before 4.1.0 finds a node's editor file with
// `file.replace(/\.js$/, ".html")`, so any other extension (tsdown's default
// `.cjs`) leaves the editor without the node's registration script and the
// palette silently empty. Needs `pnpm build` first - it checks the build output.
for (const [name, file] of Object.entries(nodes)) {
  test(`${name} ships a .js node file with a sibling .html`, () => {
    assert.match(file, /\.js$/);
    assert.ok(existsSync(resolve(root, file)), `${file} is not in the build output`);
    const html = file.replace(/\.js$/, ".html");
    assert.ok(existsSync(resolve(root, html)), `${html} is not in the build output`);
  });
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
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

// The package installs with no dependencies, so everything a node needs must
// be in the build output: a `require` of anything else fails at load time.
test("the build output requires only Node built-ins and its own files", () => {
  const dir = resolve(root, "dist/nodes");
  const external = new Set<string>();
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".js"))) {
    const source = readFileSync(resolve(dir, file), "utf8");
    for (const [, target] of source.matchAll(/\brequire\(["']([^"']+)["']\)/g)) {
      if (target.startsWith(".")) {
        assert.ok(existsSync(resolve(dir, target)), `${file} requires missing ${target}`);
      } else if (!isBuiltin(target)) {
        external.add(target);
      }
    }
  }
  assert.deepEqual([...external], []);
});

// Node-RED serves a package's `resources/` folder to the editor; a script an
// editor file loads from there must exist and be published.
test("every editor resource a node loads ships in the package", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const prefix = `resources/${pkg.name}/`;
  for (const file of Object.values(nodes)) {
    const html = readFileSync(resolve(root, file.replace(/\.js$/, ".html")), "utf8");
    for (const [, src] of html.matchAll(/src="([^"]+)"/g)) {
      assert.ok(src.startsWith(prefix), `${src} is not a resource of this package`);
      const resource = `resources/${src.slice(prefix.length)}`;
      assert.ok(existsSync(resolve(root, resource)), `${resource} does not exist`);
      assert.ok(pkg.files.includes("resources"), "resources/ is not published");
    }
  }
});

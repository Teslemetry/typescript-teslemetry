// The committed client must only reference routes the live public spec serves:
// the internal-surface OpenAPI documents describe routes production never
// exposes, and generating from one would publish them in this package.

import { readFile } from "node:fs/promises";
import { fetchPublicSpec, packageRoot } from "./spec.js";

const CLIENT_FILES = ["src/client/sdk.gen.ts", "src/client/types.gen.ts"];

async function publicPaths(): Promise<Set<string>> {
  const spec = await fetchPublicSpec();
  return new Set(Object.keys(spec.paths));
}

async function clientPaths(): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const file of CLIENT_FILES) {
    const source = await readFile(`${packageRoot}${file}`, "utf8");
    for (const [, path] of source.matchAll(/url:\s*'([^']+)'/g)) {
      if (!found.has(path)) found.set(path, file);
    }
  }
  if (found.size === 0) {
    throw new Error(`no url literals found in ${CLIENT_FILES.join(" or ")}`);
  }
  return found;
}

const [published, used] = await Promise.all([publicPaths(), clientPaths()]);
const unpublished = [...used].filter(([path]) => !published.has(path)).sort();

if (unpublished.length > 0) {
  console.error(`${unpublished.length} route(s) in src/client are absent from the public spec:`);
  for (const [path, file] of unpublished) console.error(`  ${path} (${file})`);
  console.error("Regenerate with `pnpm client`, which reads the live public spec.");
  process.exit(1);
}

console.log(`All ${used.size} routes in src/client are served by the public spec.`);

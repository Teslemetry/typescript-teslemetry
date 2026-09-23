// The committed client must only reference routes the live public spec serves:
// the internal-surface OpenAPI documents describe routes production never
// exposes, and generating from one would publish them in this package.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const CLIENT_FILES = ["src/client/sdk.gen.ts", "src/client/types.gen.ts"];

async function specUrl(): Promise<string> {
  const config = await readFile(`${packageRoot}openapi-ts.config.ts`, "utf8");
  const input = /input:\s*"([^"]+)"/.exec(config)?.[1];
  if (!input) {
    throw new Error("openapi-ts.config.ts has no string `input:` to read the spec URL from");
  }
  // The same document openapi-ts generates from, as JSON so this needs no YAML
  // parser, and cache-busted because Cloudflare edge-caches the served spec.
  return `${input.replace(/\.yaml$/, ".json")}?cachebust=${Date.now()}`;
}

async function publicPaths(): Promise<Set<string>> {
  const url = await specUrl();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const spec = (await response.json()) as { paths?: Record<string, unknown> };
      const paths = Object.keys(spec.paths ?? {});
      if (paths.length === 0) throw new Error("spec contains no paths");
      return new Set(paths);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`could not read ${url}: ${lastError}`);
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

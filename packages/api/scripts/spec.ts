import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const packageRoot = fileURLToPath(new URL("..", import.meta.url));

/** The live public spec openapi-ts generates from, read as JSON so no YAML parser is needed. */
export async function fetchPublicSpec(): Promise<any> {
  const config = await readFile(`${packageRoot}openapi-ts.config.ts`, "utf8");
  const input = /input:\s*"([^"]+)"/.exec(config)?.[1];
  if (!input) {
    throw new Error("openapi-ts.config.ts has no string `input:` to read the spec URL from");
  }
  // Cache-busted because Cloudflare edge-caches the served spec.
  const url = `${input.replace(/\.yaml$/, ".json")}?cachebust=${Date.now()}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const spec = (await response.json()) as { paths?: Record<string, unknown> };
      if (Object.keys(spec.paths ?? {}).length === 0) throw new Error("spec contains no paths");
      return spec;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`could not read ${url}: ${lastError}`);
}

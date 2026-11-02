import { Teslemetry } from "../src/Teslemetry.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

export type Sent = { method: string; path: string; query: URLSearchParams; body: unknown };

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const ok = () => json({ response: { result: true, reason: "" } });

/** A Teslemetry with a stubbed fetch, so no call leaves the process. */
export function makeTeslemetry(reply: (request: Request) => Response | Promise<Response> = ok) {
  const sent: Sent[] = [];
  const teslemetry = new Teslemetry(async () => "token", { region: "na", logger: silentLogger });
  teslemetry.client.setConfig({
    fetch: (async (request: Request) => {
      const url = new URL(request.url);
      url.searchParams.delete("token");
      const text = await request.clone().text();
      sent.push({
        method: request.method,
        path: url.pathname,
        query: url.searchParams,
        body: text ? JSON.parse(text) : undefined,
      });
      return reply(request);
    }) as typeof fetch,
  });
  return { teslemetry, sent };
}

/** Awaits a promise expected to reject, and returns the rejection. */
export async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
}

type Named = Record<string, (...args: unknown[]) => Promise<unknown>>;

/**
 * Calls `compatName` with every SDK method stubbed, and returns the SDK methods
 * it reached. Going through stubs keeps the check on the name map alone.
 */
export async function sdkCallsOf(compat: object, api: object, compatName: string, args: unknown[]) {
  const calls: string[] = [];
  const stubbed = api as Named;
  for (let target = api; target !== Object.prototype; target = Object.getPrototypeOf(target)) {
    for (const name of Object.getOwnPropertyNames(target)) {
      if (name === "constructor" || typeof Object.getOwnPropertyDescriptor(target, name)?.value !== "function") continue;
      stubbed[name] = async () => {
        calls.push(name);
        return { response: {} };
      };
    }
  }
  await (compat as Named)[compatName](...args);
  return calls;
}

export function compatMethodNames(compat: object): string[] {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(compat)).filter((name) => name !== "constructor");
}

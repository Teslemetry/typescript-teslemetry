import { test } from "node:test";
import assert from "node:assert/strict";
import { TeslemetryTrigger } from "../src/nodes/TeslemetryTrigger.node.js";

function withMockedFetch<T>(
  handler: (request: Request) => Promise<Response> | Response,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(new Request(input, init))) as typeof fetch;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function fakeTriggerContext(params: Record<string, unknown>) {
  const emitted: unknown[] = [];
  const emittedErrors: Error[] = [];
  const warnings: string[] = [];
  const context = {
    getCredentials: async () => ({ accessToken: "token" }),
    getNodeParameter: (name: string, fallback?: unknown) =>
      name in params ? params[name] : fallback,
    emit: (data: unknown) => emitted.push(data),
    emitError: (error: Error) => emittedErrors.push(error),
    logger: {
      info: () => {},
      warn: (message: string) => warnings.push(message),
      error: () => {},
      debug: () => {},
    },
    helpers: {
      returnJsonArray: (data: unknown) => data,
    },
  };
  return { context: context as never, emitted, emittedErrors, warnings };
}

test("TeslemetryTrigger surfaces a terminal auth failure via emitError", async () => {
  const { context, emittedErrors } = fakeTriggerContext({
    resource: "vehicle",
    event: "all",
    vin: "",
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () => new Response(null, { status: 401, statusText: "Unauthorized" }),
    () => node.trigger.call(context),
  );

  await waitFor(() => emittedErrors.length > 0);
  assert.equal(emittedErrors.length, 1);
  assert.match(emittedErrors[0].message, /401|unauthorized/i);

  // Idempotent cleanup: calling closeFunction twice must not throw.
  await result.closeFunction!();
  await result.closeFunction!();
});

test("TeslemetryTrigger logs stream disconnects without surfacing them as trigger errors", async () => {
  const { context, emittedErrors, warnings } = fakeTriggerContext({
    resource: "vehicle",
    event: "all",
    vin: "",
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () => new Response(null, { status: 500, statusText: "Server Error" }),
    () => node.trigger.call(context),
  );

  await waitFor(() => warnings.some((w) => w.includes("disconnected")));
  assert.equal(emittedErrors.length, 0);

  await result.closeFunction!();
});

test("TeslemetryTrigger.closeFunction tears down listeners and stops the stream", async () => {
  const { context, emitted } = fakeTriggerContext({
    resource: "vehicle",
    event: "all",
    vin: "",
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () =>
      new Response(`data: ${JSON.stringify({ vin: "5YJSA1E14FF000000", state: "online" })}\n\n`, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    () => node.trigger.call(context),
  );

  await waitFor(() => emitted.length > 0);

  await result.closeFunction!();
  const countAfterClose = emitted.length;

  // A second close is a no-op, not a re-teardown attempt.
  await result.closeFunction!();
  assert.equal(emitted.length, countAfterClose);
});

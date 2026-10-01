import { test } from "node:test";
import assert from "node:assert/strict";
import { TeslemetryTrigger } from "../src/nodes/TeslemetryTrigger.node.js";
import { apiError, fakeLogger, fakeNode, withMockedFetch } from "./testHelpers.js";

const TOKEN = "secret-access-token";

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function fakeTriggerContext(params: Record<string, unknown>, mode = "trigger") {
  const emitted: unknown[] = [];
  const emittedErrors: Error[] = [];
  const { lines, logger } = fakeLogger();
  const context = {
    getCredentials: async () => ({ accessToken: TOKEN }),
    getNodeParameter: (name: string, fallback?: unknown) =>
      name in params ? params[name] : fallback,
    getNode: () => fakeNode,
    getMode: () => mode,
    emit: (data: unknown) => emitted.push(data),
    emitError: (error: Error) => emittedErrors.push(error),
    logger,
    helpers: {
      returnJsonArray: (data: unknown) => data,
    },
  };
  return { context: context as never, emitted, emittedErrors, lines };
}

const ALL_VEHICLE_EVENTS = { resource: "vehicle", event: "all", vin: "" };

/** Answers trigger()'s token check and the stream separately, counting stream attempts. */
function teslemetryServer(answers: { test?: () => Response; stream: () => Response }) {
  const seen = { test: 0, stream: 0 };
  const handler = (request: Request) => {
    if (new URL(request.url).pathname === "/api/test") {
      seen.test += 1;
      return (
        answers.test?.() ??
        new Response(JSON.stringify({ response: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    seen.stream += 1;
    return answers.stream();
  };
  return { handler, seen };
}

const streamStatus = (status: number, statusText: string) => () => new Response(null, { status, statusText });

for (const c of [
  {
    name: "a rejected token (401)",
    response: () => apiError(401, "invalid_token", "Invalid authentication token"),
    message: "Teslemetry rejected the access token: Invalid authentication token",
    httpCode: "401",
  },
  {
    name: "a lapsed subscription (402)",
    response: () => apiError(402, "subscription_required", "Active subscription required"),
    message: "Teslemetry requires an active subscription: Active subscription required",
    httpCode: "402",
  },
  {
    name: "the api's repeated-failure block (429)",
    response: () => apiError(429, "rate_limited", "Rate limit exceeded, retry after 5 seconds"),
    message:
      "Teslemetry is limiting requests or stream connections for this account: Rate limit exceeded, retry after 5 seconds",
    httpCode: "429",
  },
]) {
  test(`TeslemetryTrigger fails activation on ${c.name} without opening the stream`, async () => {
    const { context, emittedErrors } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
    const { handler, seen } = teslemetryServer({ test: c.response, stream: streamStatus(200, "OK") });
    const node = new TeslemetryTrigger();

    await assert.rejects(
      () => withMockedFetch(handler, () => node.trigger.call(context)),
      (error: Error & { httpCode?: string }) => {
        assert.equal(error.message, c.message);
        assert.equal(error.httpCode, c.httpCode);
        assert.ok(!JSON.stringify(error).includes(TOKEN), "the error must not carry the token");
        return true;
      },
    );
    assert.equal(seen.stream, 0);
    assert.equal(emittedErrors.length, 0);
  });
}

test("TeslemetryTrigger still connects when the token check fails for a reason that may clear", async () => {
  const { context, lines } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
  const { handler, seen } = teslemetryServer({
    test: () => new Response("Service Unavailable", { status: 503 }),
    stream: streamStatus(500, "Server Error"),
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(handler, async () => {
    const response = await node.trigger.call(context);
    await waitFor(() => seen.stream > 0);
    return response;
  });

  assert.ok(lines.includes("warn: Teslemetry check before connecting failed: Service Unavailable"), lines.join("\n"));
  await result.closeFunction!();
});

test("TeslemetryTrigger surfaces a terminal auth failure via emitError", async () => {
  const { context, emittedErrors } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
  const { handler } = teslemetryServer({ stream: streamStatus(401, "Unauthorized") });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(handler, async () => {
    const response = await node.trigger.call(context);
    await waitFor(() => emittedErrors.length > 0);
    return response;
  });

  assert.equal(emittedErrors.length, 1);
  assert.equal(emittedErrors[0].message, "Teslemetry rejected the access token (HTTP 401)");

  // Idempotent cleanup: calling closeFunction twice must not throw.
  await result.closeFunction!();
  await result.closeFunction!();
});

test("TeslemetryTrigger reports a subscription that lapses on the stream once, not per retry", async () => {
  const { context, emittedErrors } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
  const { handler, seen } = teslemetryServer({ stream: streamStatus(402, "Payment Required") });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(handler, async () => {
    const response = await node.trigger.call(context);
    // The SDK retries after 2 s; wait for that second refusal.
    await waitFor(() => seen.stream >= 2, 5000);
    return response;
  });

  assert.equal(emittedErrors.length, 1);
  assert.equal(emittedErrors[0].message, "Teslemetry requires an active subscription (HTTP 402)");
  await result.closeFunction!();
});

test("TeslemetryTrigger logs the stream's connection cap (429) once and keeps an active workflow retrying", async () => {
  const { context, emittedErrors, lines } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
  const { handler, seen } = teslemetryServer({ stream: streamStatus(429, "Too Many Requests") });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(handler, async () => {
    const response = await node.trigger.call(context);
    await waitFor(() => seen.stream >= 2, 5000);
    return response;
  });

  // emitError would make n8n reactivate the trigger straight back into the same 429.
  assert.equal(emittedErrors.length, 0);
  assert.deepEqual(
    lines.filter((line) => line.includes("limiting")),
    ["error: Teslemetry is limiting requests or stream connections for this account (HTTP 429). The stream keeps retrying."],
  );
  await result.closeFunction!();
});

test("TeslemetryTrigger fails a manual test run on the stream's connection cap (429) instead of waiting", async () => {
  const { context, emittedErrors } = fakeTriggerContext(ALL_VEHICLE_EVENTS, "manual");
  const { handler } = teslemetryServer({ stream: streamStatus(429, "Too Many Requests") });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(handler, async () => {
    const response = await node.trigger.call(context);
    await waitFor(() => emittedErrors.length > 0);
    return response;
  });

  assert.equal(
    emittedErrors[0].message,
    "Teslemetry is limiting requests or stream connections for this account (HTTP 429)",
  );
  await result.closeFunction!();
});

test("TeslemetryTrigger logs stream disconnects without surfacing them as trigger errors", async () => {
  const { context, emittedErrors, lines } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
  const { handler } = teslemetryServer({ stream: streamStatus(500, "Server Error") });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(handler, async () => {
    const response = await node.trigger.call(context);
    await waitFor(() => lines.some((line) => line.includes("disconnected")));
    return response;
  });

  assert.equal(emittedErrors.length, 0);
  await result.closeFunction!();
});

test("TeslemetryTrigger sends the SDK's log lines to n8n's logger, never the console, and never with the token", async () => {
  const { context, lines } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
  const { handler } = teslemetryServer({ stream: streamStatus(500, "Server Error") });
  const node = new TeslemetryTrigger();

  const consoleCalls: unknown[][] = [];
  const original = { debug: console.debug, info: console.info, warn: console.warn, error: console.error };
  for (const level of ["debug", "info", "warn", "error"] as const) {
    console[level] = (...args: unknown[]) => void consoleCalls.push(args);
  }
  try {
    const result = await withMockedFetch(handler, async () => {
      const response = await node.trigger.call(context);
      await waitFor(() => lines.some((line) => line.includes("SSE error")));
      return response;
    });
    await result.closeFunction!();
  } finally {
    Object.assign(console, original);
  }

  assert.deepEqual(consoleCalls, []);
  assert.ok(lines.includes("debug: Response from /api/test: 200"), lines.join("\n"));
  assert.ok(lines.includes("debug: Connected to stream"), lines.join("\n"));
  assert.ok(lines.includes("error: SSE error: Error: SSE failed: 500 Server Error"), lines.join("\n"));
  assert.ok(!lines.some((line) => line.includes(TOKEN) || line.includes("token=")), lines.join("\n"));
});

test("TeslemetryTrigger.closeFunction tears down listeners and stops the stream", async () => {
  const { context, emitted } = fakeTriggerContext(ALL_VEHICLE_EVENTS);
  // One event, then the stream stays open as the real one does.
  const { handler } = teslemetryServer({
    stream: () =>
      new Response(
        new ReadableStream({
          start(controller) {
            const event = { vin: "5YJSA1E14FF000000", state: "online" };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
          },
        }),
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      ),
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(handler, async () => {
    const response = await node.trigger.call(context);
    await waitFor(() => emitted.length > 0);
    return response;
  });

  await result.closeFunction!();
  const countAfterClose = emitted.length;

  // A second close is a no-op, not a re-teardown attempt.
  await result.closeFunction!();
  assert.equal(emitted.length, countAfterClose);
});

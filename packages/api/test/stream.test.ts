import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { Teslemetry } from "../src/Teslemetry.js";
import { TeslemetryStreamAuthError } from "../src/exceptions.js";
import type { TeslemetryStreamErrorEvent } from "../src/TeslemetryStream.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

function makeTeslemetry(
  fetchImpl: (request: Request) => Promise<Response>,
  token: () => Promise<string> = async () => "token",
): Teslemetry {
  const teslemetry = new Teslemetry(token, {
    region: "na",
    logger: silentLogger,
  });
  teslemetry.client.setConfig({ fetch: fetchImpl as typeof fetch });
  return teslemetry;
}

function sseResponse(events: object[]): Response {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("stops after a second consecutive 401 and emits auth_failure", async () => {
  let fetches = 0;
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    return new Response(null, { status: 401, statusText: "Unauthorized" });
  });

  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("stream_error", (event) => streamErrors.push(event));
  const authFailure = once(teslemetry.sse, "auth_failure");

  await teslemetry.sse.connect();
  const [error] = await authFailure;

  assert.ok(error instanceof TeslemetryStreamAuthError);
  assert.equal(error.status, 401);
  assert.equal(teslemetry.sse.active, false);
  assert.equal(teslemetry.sse.connected, false);
  assert.equal(fetches, 2);
  assert.equal(streamErrors.length, 2);
  assert.equal(streamErrors[0].status, 401);
  assert.ok(streamErrors[0].error instanceof TeslemetryStreamAuthError);

  // No further reconnect attempts once stopped
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(fetches, 2);
});

test("re-resolves the auth callback on every reconnect attempt", async () => {
  let currentToken = "stale";
  const authHeaders: (string | null)[] = [];
  const teslemetry = makeTeslemetry(
    async (request) => {
      authHeaders.push(request.headers.get("Authorization"));
      // Simulate the consumer refreshing its token after the first 401
      currentToken = "fresh";
      return new Response(null, { status: 401, statusText: "Unauthorized" });
    },
    async () => currentToken,
  );

  const authFailure = once(teslemetry.sse, "auth_failure");
  await teslemetry.sse.connect();
  await authFailure;

  // The retry must pick up the refreshed token, not reuse the first one
  assert.deepEqual(authHeaders, ["Bearer stale", "Bearer fresh"]);
});

test("non-auth failures keep retrying with backoff and never emit auth_failure", async () => {
  let fetches = 0;
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    if (fetches === 1) throw new TypeError("network down");
    return new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
  });

  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("stream_error", (event) => streamErrors.push(event));
  let authFailures = 0;
  teslemetry.sse.on("auth_failure", () => authFailures++);

  await teslemetry.sse.connect();

  // First failure is a thrown network error: no HTTP status
  await waitFor(() => streamErrors.length >= 1);
  assert.equal(streamErrors[0].status, undefined);
  assert.ok(streamErrors[0].error instanceof TypeError);
  assert.equal(streamErrors[0].retries, 1);

  // Second failure is a 500: status is parsed but it is not an auth failure,
  // so the stream stays active and keeps backing off
  await waitFor(() => streamErrors.length >= 2, 5000);
  assert.equal(streamErrors[1].status, 500);
  assert.equal(streamErrors[1].retries, 2);
  assert.equal(authFailures, 0);
  assert.equal(teslemetry.sse.active, true);

  teslemetry.sse.disconnect();
});

test("the 401 streak resets when genuine events arrive, not on connect", async () => {
  let fetches = 0;
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    if (fetches === 2) {
      return sseResponse([
        {
          createdAt: "2026-01-01T00:00:00.000Z",
          vin: "TESTVIN0000000000",
          state: "online",
        },
      ]);
    }
    return new Response(null, { status: 401, statusText: "Unauthorized" });
  });

  const states: string[] = [];
  teslemetry.sse.on("state", (event) => states.push(event.state));
  const authFailure = once(teslemetry.sse, "auth_failure");

  await teslemetry.sse.connect();
  await authFailure;

  // 401 (streak 1) -> data event (streak reset) -> 401 (streak 1) -> 401 (stop)
  assert.deepEqual(states, ["online"]);
  assert.equal(fetches, 4);
});

test("does not crash when nobody subscribes to error events", async () => {
  let fetches = 0;
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    return new Response(null, { status: 401, statusText: "Unauthorized" });
  });

  // No listeners at all: emitting a hypothetical "error" event would throw
  // ERR_UNHANDLED_ERROR and crash the process
  await teslemetry.sse.connect();
  await waitFor(() => teslemetry.sse.active === false);
  assert.equal(fetches, 2);
});

/** A never-closing SSE response, so the reader stays parked in `reader.read()`
 *  until something aborts it - lets tests observe close() cancelling a
 *  genuinely in-flight fetch/reader rather than one that already finished. */
function openSseResponse(
  event: object,
  onCancel?: () => void,
): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
      );
    },
    cancel() {
      onCancel?.();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

test("close() aborts an in-flight fetch/reader", async () => {
  let capturedSignal: AbortSignal | undefined;
  let readerCancelled = false;
  const teslemetry = makeTeslemetry(async (request) => {
    capturedSignal = request.signal;
    return openSseResponse(
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        vin: "TESTVIN0000000000",
        state: "online",
      },
      () => {
        readerCancelled = true;
      },
    );
  });

  const states: string[] = [];
  teslemetry.sse.on("state", (event) => states.push(event.state));

  await teslemetry.sse.connect();
  await waitFor(() => states.length >= 1);
  assert.equal(teslemetry.sse.connected, true);

  await teslemetry.sse.close();

  assert.equal(capturedSignal?.aborted, true);
  assert.equal(readerCancelled, true);
  assert.equal(teslemetry.sse.active, false);
  assert.equal(teslemetry.sse.connected, false);
});

test("close() during backoff cancels the pending reconnect timer immediately", async () => {
  let fetches = 0;
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    return new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
  });

  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("stream_error", (event) => streamErrors.push(event));

  await teslemetry.sse.connect();
  // First failure schedules a 2s backoff (2^1 seconds) before retrying
  await waitFor(() => streamErrors.length >= 1);
  const fetchesAtClose = fetches;

  const start = Date.now();
  await teslemetry.sse.close();
  const elapsed = Date.now() - start;

  // close() must not sit through the pending backoff wait
  assert.ok(elapsed < 500, `close() took ${elapsed}ms, expected < 500ms`);
  assert.equal(teslemetry.sse.active, false);

  // Give the (now-cancelled) 2s timer a chance to have fired if it wasn't
  // actually cancelled
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(fetches, fetchesAtClose);
});

test("connect() after close() reinitializes the stream", async () => {
  let fetches = 0;
  const cancels: boolean[] = [];
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    const vin = "TESTVIN0000000000";
    return openSseResponse(
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        vin,
        state: fetches === 1 ? "online" : "asleep",
      },
      () => cancels.push(true),
    );
  });

  const states: string[] = [];
  teslemetry.sse.on("state", (event) => states.push(event.state));

  await teslemetry.sse.connect();
  await waitFor(() => states.length >= 1);
  await teslemetry.sse.close();
  assert.equal(teslemetry.sse.active, false);
  assert.equal(fetches, 1);

  await teslemetry.sse.connect();
  await waitFor(() => states.length >= 2);
  assert.equal(teslemetry.sse.active, true);
  assert.deepEqual(states, ["online", "asleep"]);
  assert.equal(fetches, 2);

  await teslemetry.sse.close();
});

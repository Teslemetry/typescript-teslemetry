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

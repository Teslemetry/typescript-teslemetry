import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { Teslemetry } from "../src/Teslemetry.js";
import { TeslemetryStreamAuthError } from "../src/exceptions.js";
import { TeslemetryStream } from "../src/TeslemetryStream.js";
import type {
  TeslemetryStreamErrorEvent,
  TeslemetryStreamOptions,
} from "../src/TeslemetryStream.js";
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

test("any SSE traffic, even a keep-alive, resets the backoff before a later reset", async () => {
  let fetches = 0;
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    if (fetches <= 2) throw new TypeError("network down");
    if (fetches === 3) {
      // Connects, receives only a blank keep-alive, then the socket is reset
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(":\n\n"));
        },
        async pull(controller) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          controller.error(new TypeError("ECONNRESET"));
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    return new Response(null, { status: 500 });
  });

  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("stream_error", (event) => streamErrors.push(event));

  await teslemetry.sse.connect();
  await waitFor(() => streamErrors.length >= 3, 10000);

  assert.equal(streamErrors[1].retries, 2);
  // Without the reset this would be 3 (an 8 second wait)
  assert.equal(streamErrors[2].retries, 1);

  await teslemetry.sse.disconnect();
});

test("a clean end of the stream is a disconnect that backs off before reconnecting", async () => {
  let fetches = 0;
  // What the server does while shutting down: 200, the opening `retry:`
  // chunk, then a clean end of the response
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    return new Response("retry: 1000\n\n", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  });

  const events: string[] = [];
  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("connect", () => events.push("connect"));
  teslemetry.sse.on("disconnect", () => events.push("disconnect"));
  teslemetry.sse.on("stream_error", (event) => {
    events.push("stream_error");
    streamErrors.push(event);
  });

  await teslemetry.sse.connect();
  await waitFor(() => streamErrors.length >= 1);

  assert.deepEqual(events, ["connect", "disconnect", "stream_error"]);
  assert.equal(streamErrors[0].retries, 1);
  assert.equal(streamErrors[0].status, undefined);
  assert.equal(teslemetry.sse.connected, false);
  assert.equal(teslemetry.sse.active, true);

  // The base backoff is 2s: no tight reconnect loop in the meantime
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(fetches, 1);

  await teslemetry.sse.close();
});

test("connect is emitted on the first chunk, not before the server answers", async () => {
  let fetches = 0;
  let answer: (response: Response) => void = () => {};
  const teslemetry = makeTeslemetry(async () => {
    fetches++;
    if (fetches === 1) {
      return new Response(null, { status: 500 });
    }
    return new Promise<Response>((resolve) => {
      answer = resolve;
    });
  });

  let connects = 0;
  teslemetry.sse.on("connect", () => connects++);
  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("stream_error", (event) => streamErrors.push(event));

  await teslemetry.sse.connect();

  // A rejected attempt never announces a connection
  await waitFor(() => streamErrors.length >= 1);
  assert.equal(connects, 0);
  assert.equal(teslemetry.sse.connected, false);

  // Nor does a request that is still waiting for its response
  await waitFor(() => fetches >= 2, 5000);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(connects, 0);
  assert.equal(teslemetry.sse.connected, false);

  answer(
    openSseResponse({
      createdAt: "2026-01-01T00:00:00.000Z",
      vin: "TESTVIN0000000000",
      state: "online",
    }),
  );
  await waitFor(() => connects >= 1);
  assert.equal(connects, 1);
  assert.equal(teslemetry.sse.connected, true);

  await teslemetry.sse.close();
});

test("the reconnect backoff is capped at 60 seconds", async () => {
  const teslemetry = makeTeslemetry(
    async () => new Response(null, { status: 500 }),
  );
  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("stream_error", (event) => streamErrors.push(event));

  // Record each backoff wait and let it elapse at once, so the whole ramp
  // runs in milliseconds; shorter timers (this file's own polling) pass
  // through untouched.
  const realSetTimeout = globalThis.setTimeout;
  const waits: number[] = [];
  globalThis.setTimeout = ((fn: () => void, ms?: number) => {
    if (ms !== undefined && ms >= 1000) {
      waits.push(ms);
      return realSetTimeout(fn, 0);
    }
    return realSetTimeout(fn, ms);
  }) as typeof setTimeout;

  try {
    await teslemetry.sse.connect();
    await waitFor(() => streamErrors.length >= 8);
    await teslemetry.sse.close();
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }

  assert.deepEqual(
    waits.slice(0, 7),
    [2000, 4000, 8000, 16000, 32000, 60000, 60000],
  );
});

/** Opens a stream with the given options and returns the first request URL. */
async function streamRequestUrl(
  stream?: TeslemetryStreamOptions,
): Promise<URL> {
  let url: URL | undefined;
  const teslemetry = makeTeslemetry(async (request) => {
    url ??= new URL(request.url);
    // Held open until disconnect() aborts it, so the loop never reconnects
    return openSseResponse({
      createdAt: "2026-01-01T00:00:00.000Z",
      vin: "TESTVIN0000000000",
      state: "online",
    });
  });
  const sse = new TeslemetryStream(teslemetry, stream);

  await sse.connect();
  await waitFor(() => url !== undefined);
  await sse.disconnect();
  return url!;
}

test("the stream URL carries a well-formed cache query: true when unset", async () => {
  const url = await streamRequestUrl();

  assert.equal(url.pathname, "/sse/");
  assert.ok(!url.search.startsWith("??"), url.search);
  assert.equal(url.searchParams.get("cache"), "true");
  assert.equal(url.searchParams.has("?cache"), false);
});

test("the stream URL carries cache=true when cache is true", async () => {
  const url = await streamRequestUrl({ cache: true });

  assert.equal(url.searchParams.get("cache"), "true");
  assert.equal(url.searchParams.has("?cache"), false);
});

test("the stream URL carries cache=false when cache is false", async () => {
  const url = await streamRequestUrl({ cache: false });

  assert.equal(url.searchParams.get("cache"), "false");
  assert.equal(url.searchParams.has("?cache"), false);
});

test("cache.cloud alone decides the cache query, and a vin goes in the path", async () => {
  const url = await streamRequestUrl({
    vin: "5YJ3E1EA0KF000000",
    cache: { cloud: false, local: true },
    topics: ["state"],
  });

  assert.equal(url.pathname, "/sse/5YJ3E1EA0KF000000");
  assert.equal(url.searchParams.get("cache"), "false");
  assert.equal(url.searchParams.get("topics"), "state");
});

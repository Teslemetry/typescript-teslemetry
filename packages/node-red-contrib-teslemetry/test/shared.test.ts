import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { attachStreamStatus, createLogger } from "../src/shared.js";
import { TeslemetryStreamAuthError } from "@teslemetry/api";
import type { TeslemetryStream } from "@teslemetry/api";

function createFakeSse() {
  const emitter = new EventEmitter();
  const connectCalls: number[] = [];
  const sse = emitter as unknown as TeslemetryStream;
  (sse as any).connect = () => connectCalls.push(Date.now());
  return { sse, connectCalls };
}

function createFakeNode() {
  const statuses: any[] = [];
  const errors: string[] = [];
  return {
    node: {
      status: (s: any) => statuses.push(s),
      error: (msg: string) => errors.push(msg),
    } as any,
    statuses,
    errors,
  };
}

test("connect sets a green connected status", () => {
  const { sse } = createFakeSse();
  const { node, statuses } = createFakeNode();
  const detach = attachStreamStatus(sse, node);

  (sse as any).emit("connect");

  assert.equal(statuses.length, 1);
  assert.match(statuses[0].fill, /green/);
  assert.match(statuses[0].text, /connected/);
  detach();
});

test("disconnect sets a red ring status, distinct from a stream_error", () => {
  const { sse } = createFakeSse();
  const { node, statuses } = createFakeNode();
  const detach = attachStreamStatus(sse, node);

  (sse as any).emit("disconnect");

  assert.equal(statuses[0].fill, "red");
  assert.equal(statuses[0].shape, "ring");
  assert.match(statuses[0].text, /disconnected/);
  detach();
});

test("a non-auth stream_error shows a transient reconnecting status", () => {
  const { sse } = createFakeSse();
  const { node, statuses } = createFakeNode();
  const detach = attachStreamStatus(sse, node);

  (sse as any).emit("stream_error", { error: new Error("network blip"), retries: 3 });

  assert.equal(statuses[0].fill, "yellow");
  assert.match(statuses[0].text, /reconnecting/);
  assert.match(statuses[0].text, /3/);
  detach();
});

test("an auth-flavored stream_error is distinguishable from an ordinary one", () => {
  const { sse } = createFakeSse();
  const { node, statuses } = createFakeNode();
  const detach = attachStreamStatus(sse, node);

  (sse as any).emit("stream_error", {
    error: new TeslemetryStreamAuthError("bad token", 401),
    retries: 1,
  });

  assert.equal(statuses[0].fill, "yellow");
  assert.match(statuses[0].text, /auth error/);
  detach();
});

test("a refused connection names the reason the API gave", () => {
  const { sse } = createFakeSse();
  const { node, statuses } = createFakeNode();
  const detach = attachStreamStatus(sse, node);

  const refuse = (status: number) =>
    (sse as any).emit("stream_error", {
      error: new Error(`SSE failed: ${status}`),
      status,
      retries: 2,
    });
  refuse(402);
  refuse(429);
  refuse(500);

  assert.deepEqual(
    statuses.map((s) => s.text),
    [
      "subscription required, retrying (attempt 2)",
      "too many connections, retrying (attempt 2)",
      "HTTP 500, retrying (attempt 2)",
    ],
  );
  detach();
});

test("the disconnect that follows auth_failure does not replace the auth failed status", () => {
  const { sse } = createFakeSse();
  const { node, statuses } = createFakeNode();

  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const detach = attachStreamStatus(sse, node);

    (sse as any).emit("auth_failure", new TeslemetryStreamAuthError("expired token", 401));
    (sse as any).emit("disconnect");

    assert.equal(statuses.length, 1);
    assert.match(statuses[0].text, /auth failed/);

    // Once the stream is retried, a disconnect is an ordinary one again.
    (sse as any).emit("connect");
    (sse as any).emit("disconnect");
    assert.match(statuses[statuses.length - 1].text, /^disconnected$/);

    detach();
  } finally {
    mock.timers.reset();
  }
});

test("a node joining a stream that is already up takes its status from the stream", () => {
  const { sse } = createFakeSse();
  (sse as any).active = true;
  (sse as any).connected = true;
  const { node, statuses } = createFakeNode();

  attachStreamStatus(sse, node)();

  assert.deepEqual(statuses, [{ fill: "green", shape: "dot", text: "connected" }]);
});

test("a node joining a stream that is between attempts shows it is connecting", () => {
  const { sse } = createFakeSse();
  (sse as any).active = true;
  (sse as any).connected = false;
  const { node, statuses } = createFakeNode();

  attachStreamStatus(sse, node)();

  assert.deepEqual(statuses, [{ fill: "yellow", shape: "ring", text: "connecting" }]);
});

function createFakeLog() {
  const lines: string[] = [];
  const at = (level: string) => (msg: string) => lines.push(`[${level}] ${msg}`);
  return {
    log: { debug: at("debug"), info: at("info"), warn: at("warn"), error: at("error") },
    lines,
  };
}

test("createLogger keeps the reason the SDK passes as an extra argument", () => {
  const { log, lines } = createFakeLog();
  const logger = createLogger(log);

  logger.error("SSE error:", new Error("SSE failed: 402 Payment Required"));
  logger.error("Failed to update streaming config for VIN:", {
    response: null,
    error: "subscription_required",
    error_description: "Active subscription required",
  });
  logger.info("Connected to stream");

  assert.deepEqual(lines, [
    "[error] SSE error: SSE failed: 402 Payment Required",
    "[error] Failed to update streaming config for VIN: Active subscription required",
    "[info] Connected to stream",
  ]);
});

test("createLogger works when the SDK calls a method detached, with the error first", async () => {
  const { log, lines } = createFakeLog();
  const { warn } = createLogger(log);

  await Promise.reject(new Error("fetch failed")).catch(warn);

  assert.deepEqual(lines, ["[warn] fetch failed"]);
});

test("createLogger never lets a URL's query string, which carries the token, reach the log", () => {
  const { log, lines } = createFakeLog();
  const logger = createLogger(log);

  logger.error(
    "Request failed:",
    new Error("GET https://api.teslemetry.com/sse/?cache=false&token=SECRET failed"),
  );
  logger.debug("Response", { url: "/api/test?token=SECRET&x=1" });

  assert.equal(lines.length, 2);
  assert.equal(lines[0], "[error] Request failed: GET https://api.teslemetry.com/sse/ failed");
  for (const line of lines) assert.doesNotMatch(line, /SECRET/);
});

test("auth_failure sets a persistent red status, surfaces node.error, and schedules a retry connect", () => {
  const { sse, connectCalls } = createFakeSse();
  const { node, statuses, errors } = createFakeNode();

  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const detach = attachStreamStatus(sse, node);

    (sse as any).emit("auth_failure", new TeslemetryStreamAuthError("expired token", 401));

    assert.equal(statuses[0].fill, "red");
    assert.equal(statuses[0].shape, "dot");
    assert.match(statuses[0].text, /auth failed/);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /expired token/);

    assert.equal(connectCalls.length, 0);
    mock.timers.runAll();
    assert.equal(connectCalls.length, 1);

    detach();
  } finally {
    mock.timers.reset();
  }
});

test("detach stops further status updates and cancels a pending auth retry", () => {
  const { sse, connectCalls } = createFakeSse();
  const { node, statuses } = createFakeNode();

  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const detach = attachStreamStatus(sse, node);
    (sse as any).emit("auth_failure", new TeslemetryStreamAuthError("bad", 401));
    detach();

    mock.timers.runAll();
    assert.equal(connectCalls.length, 0);

    (sse as any).emit("connect");
    assert.equal(statuses.length, 1);
  } finally {
    mock.timers.reset();
  }
});

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { attachStreamStatus } from "../src/shared.js";
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

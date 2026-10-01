import { test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import historyNodeModule from "../src/nodes/teslemetry-energy-history.js";
import { instances } from "../src/shared.js";
import type { Instance } from "../src/shared.js";
import type { Msg } from "../src/types.js";

interface FakeNode {
  handlers: Record<string, (...args: any[]) => any>;
  on(event: string, cb: (...args: any[]) => any): void;
  status(): void;
  error(msg?: string): void;
  [key: string]: any;
}

function createFakeNode(errors: string[] = []): FakeNode {
  return {
    handlers: {},
    on(event, cb) {
      this.handlers[event] = cb;
    },
    status() {},
    error(msg) {
      if (msg !== undefined) errors.push(msg);
    },
  };
}

/** Node-RED's `done(err)` raises `err` through `node.error(err, msg)`. */
function failTo(node: FakeNode) {
  return (err?: unknown) => {
    if (err !== undefined) node.error(err as string);
  };
}

function createFakeRED(): { RED: NodeAPI; registered: Record<string, Function> } {
  const registered: Record<string, Function> = {};
  const RED = {
    nodes: {
      createNode() {},
      registerType(type: string, ctor: Function) {
        registered[type] = ctor;
      },
    },
  } as unknown as NodeAPI;
  return { RED, registered };
}

test("a node constructed while the products fetch is failing still sends the message to the API", async () => {
  const { RED, registered } = createFakeRED();
  historyNodeModule(RED);
  const ctor = registered["teslemetry-energy-history"];

  let called = false;
  const site = {
    getCalendarHistory: async () => {
      called = true;
      return { response: {} };
    },
  };

  const configId = "cfg-recovery-test";
  const instance: Instance = {
    teslemetry: { api: { getEnergySite: () => site } } as any,
    products: Promise.resolve({} as any),
    error: "invalid token",
  };
  instances.set(configId, instance);

  const errors: string[] = [];
  const node = createFakeNode(errors);
  ctor.call(node, {
    teslemetryConfig: configId,
    siteId: "12345",
    historyType: "energy",
    period: "day",
  });

  // The failed account check must not swallow the command: the API gives
  // its own answer.
  let sent = false;
  await node.handlers.input(
    {} as Msg,
    () => {
      sent = true;
    },
    failTo(node),
  );
  assert.equal(called, true);
  assert.equal(sent, true);
  // Only the construction-time report of the failed check, no input error.
  assert.deepEqual(errors, ["Teslemetry error: invalid token"]);
});

test("msg.historyType and msg.period are used when the node's selects are 'From msg…' (empty)", async () => {
  const { RED, registered } = createFakeRED();
  historyNodeModule(RED);
  const ctor = registered["teslemetry-energy-history"];

  const calls: unknown[][] = [];
  const site = {
    getCalendarHistory: async (...args: unknown[]) => {
      calls.push(args);
      return { response: {} };
    },
  };

  const configId = "cfg-from-msg-test";
  instances.set(configId, {
    teslemetry: { api: { getEnergySite: () => site } } as any,
    products: Promise.resolve({} as any),
  });

  const errors: string[] = [];
  const node = createFakeNode(errors);
  ctor.call(node, {
    teslemetryConfig: configId,
    siteId: "12345",
    historyType: "",
    period: "",
  });

  await node.handlers.input(
    { historyType: "backup", period: "month" } as Partial<Msg> as Msg,
    () => {},
    () => {},
  );
  // No msg values: falls back to the documented energy/day defaults.
  await node.handlers.input({} as Msg, () => {}, () => {});

  assert.deepEqual(errors, []);
  assert.deepEqual(
    calls.map(([kind, period]) => [kind, period]),
    [
      ["backup", "month"],
      ["energy", "day"],
    ],
  );
});

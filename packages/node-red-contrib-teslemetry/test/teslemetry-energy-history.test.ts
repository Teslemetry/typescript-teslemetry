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

test("a node constructed while the products fetch is failing processes messages once it recovers", async () => {
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

  let sentWhileFailing = false;
  await node.handlers.input(
    {} as Msg,
    () => {
      sentWhileFailing = true;
    },
    () => {},
  );
  assert.equal(sentWhileFailing, false);
  assert.equal(called, false);
  assert.ok(errors.some((e) => e.includes("invalid token")));

  instance.error = undefined;

  let sentAfterRecovery = false;
  await node.handlers.input(
    {} as Msg,
    () => {
      sentAfterRecovery = true;
    },
    () => {},
  );
  assert.equal(sentAfterRecovery, true);
  assert.equal(called, true);
});

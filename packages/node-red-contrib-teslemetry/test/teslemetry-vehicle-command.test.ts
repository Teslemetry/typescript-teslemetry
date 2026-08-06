import { test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import commandNodeModule from "../src/nodes/teslemetry-vehicle-command.js";
import { instances } from "../src/shared.js";
import type { Msg } from "../src/types.js";

interface FakeNode {
  handlers: Record<string, (...args: any[]) => any>;
  on(event: string, cb: (...args: any[]) => any): void;
  status(): void;
  error(): void;
  [key: string]: any;
}

function createFakeNode(): FakeNode {
  return {
    handlers: {},
    on(event, cb) {
      this.handlers[event] = cb;
    },
    status() {},
    error() {},
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

async function runCommand(
  vehicle: Record<string, (...args: any[]) => Promise<{ response: unknown }>>,
  msg: Partial<Msg>,
) {
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-test";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  const send = () => {};
  const done = () => {};
  await node.handlers.input(msg as Msg, send, done);
}

test("setSeatCooler coerces a numeric-string msg.level to a number before calling the SDK", async () => {
  let receivedLevel: unknown;
  const vehicle = {
    setSeatCooler: async (_seat: string, level: number) => {
      receivedLevel = level;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "setSeatCooler",
    seat: "front_left",
    level: "2" as any,
  });

  assert.strictEqual(receivedLevel, 2);
  assert.strictEqual(typeof receivedLevel, "number");
});

test("setClimateKeeperMode coerces a numeric-string msg.mode to a number before calling the SDK", async () => {
  let receivedMode: unknown;
  const vehicle = {
    setClimateKeeperMode: async (mode: number) => {
      receivedMode = mode;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "setClimateKeeperMode",
    mode: "3" as any,
  });

  assert.strictEqual(receivedMode, 3);
  assert.strictEqual(typeof receivedMode, "number");
});

test("navigationGpsRequest coerces numeric-string msg.lat/lon/order to numbers before calling the SDK", async () => {
  let received: unknown;
  const vehicle = {
    navigationGpsRequest: async (body: unknown) => {
      received = body;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "navigationGpsRequest",
    lat: "37.7749" as any,
    lon: "-122.4194" as any,
    order: "1" as any,
  });

  assert.deepStrictEqual(received, { lat: 37.7749, lon: -122.4194, order: 1 });
});

test("navigationSuperchargerRequest coerces a numeric-string msg.order to a number before calling the SDK", async () => {
  let received: unknown;
  const vehicle = {
    navigationSuperchargerRequest: async (body: unknown) => {
      received = body;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "navigationSuperchargerRequest",
    id: "sc-123",
    order: "1" as any,
  });

  assert.deepStrictEqual(received, { id: "sc-123", order: 1 });
});

test("navigationWaypointsRequest passes msg.waypoints through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    navigationWaypointsRequest: async (body: unknown) => {
      received = body;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "navigationWaypointsRequest",
    waypoints: "37.7749,-122.4194;37.3382,-121.8863",
  });

  assert.deepStrictEqual(received, {
    waypoints: "37.7749,-122.4194;37.3382,-121.8863",
  });
});

test("navigationGpsRequest rejects a missing msg.order", async () => {
  const vehicle = {
    navigationGpsRequest: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-test-2";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  const msg: Partial<Msg> = {
    command: "navigationGpsRequest",
    lat: 37.7749,
    lon: -122.4194,
  };
  await node.handlers.input(msg as Msg, () => {}, () => {});

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /order/i);
});

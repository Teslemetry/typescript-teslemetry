import { test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import commandNodeModule from "../src/nodes/teslemetry-vehicle-command.js";
import { instances } from "../src/shared.js";
import type { Instance } from "../src/shared.js";
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

async function runCommandExpectError(
  vehicle: Record<string, (...args: any[]) => Promise<{ response: unknown }>>,
  msg: Partial<Msg>,
): Promise<string[]> {
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = `cfg-test-${Math.random()}`;
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  const errors: string[] = [];
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  await node.handlers.input(msg as Msg, () => {}, () => {});
  return errors;
}

test("a node constructed while the products fetch is failing processes messages once it recovers", async () => {
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  let receivedVin: unknown;
  const vehicle = {
    wakeUp: async () => {
      receivedVin = "called";
      return { response: {} };
    },
  };

  const configId = "cfg-recovery-test";
  const instance: Instance = {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
    error: "invalid token",
  };
  instances.set(configId, instance);

  const errors: string[] = [];
  const node = createFakeNode();
  node.error = (msg?: string) => {
    if (msg !== undefined) errors.push(msg);
  };
  ctor.call(node, {
    teslemetryConfig: configId,
    vin: "TEST_VIN",
    command: "wakeUp",
  });

  // Still failing: the message is rejected, not processed.
  let sentWhileFailing = false;
  await node.handlers.input(
    {} as Msg,
    () => {
      sentWhileFailing = true;
    },
    () => {},
  );
  assert.equal(sentWhileFailing, false);
  assert.equal(receivedVin, undefined);
  assert.ok(errors.some((e) => e.includes("invalid token")));

  // The products fetch recovers in the background, without a redeploy.
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
  assert.equal(receivedVin, "called");
});

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

test("setSeatCooler rejects an out-of-range level", async () => {
  const vehicle = {
    setSeatCooler: async () => {
      throw new Error("should not be called");
    },
  };

  const errors = await runCommandExpectError(vehicle, {
    command: "setSeatCooler",
    seat: "front_left",
    level: 4,
  });

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /level/i);
});

test("setSeatCooler rejects a seat position with no cooling hardware", async () => {
  const vehicle = {
    setSeatCooler: async () => {
      throw new Error("should not be called");
    },
  };

  const errors = await runCommandExpectError(vehicle, {
    command: "setSeatCooler",
    seat: "rear_left",
    level: 1,
  });

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /seat/i);
});

test("setPreconditioningMaxOn passes msg.manualOverride through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    setPreconditioningMax: async (on: boolean, manualOverride: boolean) => {
      received = { on, manualOverride };
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "setPreconditioningMaxOn",
    manualOverride: true,
  });

  assert.deepStrictEqual(received, { on: true, manualOverride: true });
});

test("setPreconditioningMaxOff defaults msg.manualOverride to false when omitted", async () => {
  let received: unknown;
  const vehicle = {
    setPreconditioningMax: async (on: boolean, manualOverride: boolean) => {
      received = { on, manualOverride };
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "setPreconditioningMaxOff" });

  assert.deepStrictEqual(received, { on: false, manualOverride: false });
});

test("setClimateKeeperMode rejects an out-of-range mode", async () => {
  const vehicle = {
    setClimateKeeperMode: async () => {
      throw new Error("should not be called");
    },
  };

  const errors = await runCommandExpectError(vehicle, {
    command: "setClimateKeeperMode",
    mode: 4,
  });

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /mode/i);
});

test("setBioweaponDefenseModeOn passes msg.manualOverride through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    setBioweaponDefenseMode: async (on: boolean, manualOverride: boolean) => {
      received = { on, manualOverride };
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "setBioweaponDefenseModeOn",
    manualOverride: true,
  });

  assert.deepStrictEqual(received, { on: true, manualOverride: true });
});

test("setBioweaponDefenseModeOff defaults msg.manualOverride to false when omitted", async () => {
  let received: unknown;
  const vehicle = {
    setBioweaponDefenseMode: async (on: boolean, manualOverride: boolean) => {
      received = { on, manualOverride };
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "setBioweaponDefenseModeOff" });

  assert.deepStrictEqual(received, { on: false, manualOverride: false });
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

test("setValetModeOn passes msg.password through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    setValetMode: async (on: boolean, password: string) => {
      received = { on, password };
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "setValetModeOn", password: "hunter2" });

  assert.deepStrictEqual(received, { on: true, password: "hunter2" });
});

test("setValetModeOn rejects a missing msg.password without echoing it, and never surfaces it in node status", async () => {
  const vehicle = {
    setValetMode: async () => {
      throw new Error("should not be called");
    },
  };

  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-valet-missing-password";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  const errors: string[] = [];
  const statuses: any[] = [];
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  node.status = (...args: unknown[]) => {
    statuses.push(args[0]);
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  const msg: Partial<Msg> = { command: "setValetModeOn" };
  await node.handlers.input(msg as Msg, () => {}, () => {});

  assert.strictEqual(errors.length, 1);
  assert.doesNotMatch(errors[0], /hunter2/);
  assert.match(errors[0], /password/i);
  for (const s of statuses) {
    assert.doesNotMatch(JSON.stringify(s), /hunter2/);
  }
});

test("speedLimitActivate/Deactivate/ClearPin pass msg.pin through to the SDK", async () => {
  const calls: Record<string, unknown> = {};
  const vehicle = {
    speedLimitActivate: async (pin: string) => {
      calls.activate = pin;
      return { response: {} };
    },
    speedLimitDeactivate: async (pin: string) => {
      calls.deactivate = pin;
      return { response: {} };
    },
    speedLimitClearPin: async (pin: string) => {
      calls.clearPin = pin;
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "speedLimitActivate", pin: "1234" });
  await runCommand(vehicle, { command: "speedLimitDeactivate", pin: "1234" });
  await runCommand(vehicle, { command: "speedLimitClearPin", pin: "1234" });

  assert.deepStrictEqual(calls, {
    activate: "1234",
    deactivate: "1234",
    clearPin: "1234",
  });
});

test("speedLimitActivate rejects a missing msg.pin without echoing it", async () => {
  const vehicle = {
    speedLimitActivate: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-speedlimit-missing-pin";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  const msg: Partial<Msg> = { command: "speedLimitActivate" };
  await node.handlers.input(msg as Msg, () => {}, () => {});

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /pin/i);
});

test("speedLimitSetLimit rejects an out-of-range msg.limitMph", async () => {
  const vehicle = {
    speedLimitSetLimit: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-speedlimit-range";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  const msg: Partial<Msg> = { command: "speedLimitSetLimit", limitMph: 10 };
  await node.handlers.input(msg as Msg, () => {}, () => {});

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /limitMph/);
});

test("setGuestModeOn/Off call the SDK with the right boolean", async () => {
  const calls: boolean[] = [];
  const vehicle = {
    setGuestMode: async (on: boolean) => {
      calls.push(on);
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "setGuestModeOn" });
  await runCommand(vehicle, { command: "setGuestModeOff" });

  assert.deepStrictEqual(calls, [true, false]);
});

test("addChargeSchedule converts HH:mm times and passes days_of_week/enabled flags through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    addChargeSchedule: async (body: unknown) => {
      received = body;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "addChargeSchedule",
    id: 5,
    name: "Weeknights",
    daysOfWeek: "Weekdays",
    enabled: true,
    startEnabled: true,
    endEnabled: true,
    startTime: "23:00",
    endTime: "06:00",
    lat: 37.7749,
    lon: -122.4194,
  } as any);

  assert.deepStrictEqual(received, {
    id: 5,
    name: "Weeknights",
    days_of_week: "Weekdays",
    enabled: true,
    start_enabled: true,
    end_enabled: true,
    start_time: 1380,
    end_time: 360,
    lat: 37.7749,
    lon: -122.4194,
    one_time: undefined,
  });
});

test("addChargeSchedule rejects a missing msg.lat", async () => {
  const vehicle = {
    addChargeSchedule: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-add-charge-schedule";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  await node.handlers.input(
    {
      command: "addChargeSchedule",
      daysOfWeek: "Weekdays",
      enabled: true,
      startEnabled: true,
      endEnabled: true,
      lon: -122.4194,
    } as any,
    () => {},
    () => {},
  );

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /lat/i);
});

test("addChargeSchedule rejects an out-of-range msg.startTime", async () => {
  const vehicle = {
    addChargeSchedule: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-add-charge-schedule-bad-time";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  await node.handlers.input(
    {
      command: "addChargeSchedule",
      daysOfWeek: "Weekdays",
      enabled: true,
      startEnabled: true,
      endEnabled: true,
      startTime: "25:99",
      lat: 37.7749,
      lon: -122.4194,
    } as any,
    () => {},
    () => {},
  );

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /HH:mm/i);
});

test("removeChargeSchedule passes msg.id through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    removeChargeSchedule: async (id: number) => {
      received = id;
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "removeChargeSchedule", id: 5 } as any);

  assert.strictEqual(received, 5);
});

test("removeChargeSchedule rejects a missing msg.id", async () => {
  const vehicle = {
    removeChargeSchedule: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-remove-charge-schedule";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  await node.handlers.input(
    { command: "removeChargeSchedule" } as any,
    () => {},
    () => {},
  );

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /id/i);
});

test("addPreconditionSchedule converts msg.preconditionTime and passes fields through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    addPreconditionSchedule: async (body: unknown) => {
      received = body;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "addPreconditionSchedule",
    id: 2,
    name: "Ready by 7am",
    daysOfWeek: "Weekdays",
    enabled: true,
    lat: 37.7749,
    lon: -122.4194,
    preconditionTime: "07:00",
  } as any);

  assert.deepStrictEqual(received, {
    id: 2,
    name: "Ready by 7am",
    days_of_week: "Weekdays",
    enabled: true,
    lat: 37.7749,
    lon: -122.4194,
    precondition_time: 420,
    one_time: undefined,
  });
});

test("addPreconditionSchedule rejects a missing msg.preconditionTime", async () => {
  const vehicle = {
    addPreconditionSchedule: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-add-precondition-schedule";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  await node.handlers.input(
    {
      command: "addPreconditionSchedule",
      daysOfWeek: "Weekdays",
      enabled: true,
      lat: 37.7749,
      lon: -122.4194,
    } as any,
    () => {},
    () => {},
  );

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /preconditionTime/i);
});

test("removePreconditionSchedule passes msg.id through to the SDK", async () => {
  let received: unknown;
  const vehicle = {
    removePreconditionSchedule: async (id: number) => {
      received = id;
      return { response: {} };
    },
  };

  await runCommand(vehicle, {
    command: "removePreconditionSchedule",
    id: 2,
  } as any);

  assert.strictEqual(received, 2);
});

test("removePreconditionSchedule rejects a non-integer msg.id", async () => {
  const vehicle = {
    removePreconditionSchedule: async () => {
      throw new Error("should not be called");
    },
  };

  const errors: string[] = [];
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-vehicle-command"];

  const configId = "cfg-remove-precondition-schedule";
  instances.set(configId, {
    teslemetry: { api: { getVehicle: () => vehicle } } as any,
    products: Promise.resolve({} as any),
  });

  const node = createFakeNode();
  node.error = (msg?: string) => {
    errors.push(msg || "");
  };
  ctor.call(node, { teslemetryConfig: configId, vin: "TEST_VIN", command: "" });

  await node.handlers.input(
    { command: "removePreconditionSchedule", id: 2.5 } as any,
    () => {},
    () => {},
  );

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /integer/i);
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

test("mediaTogglePlayback dispatches to the SDK with no arguments", async () => {
  let called = false;
  const vehicle = {
    mediaTogglePlayback: async () => {
      called = true;
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "mediaTogglePlayback" });

  assert.strictEqual(called, true);
});

test("mediaNextTrack dispatches to the SDK with no arguments", async () => {
  let called = false;
  const vehicle = {
    mediaNextTrack: async () => {
      called = true;
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "mediaNextTrack" });

  assert.strictEqual(called, true);
});

test("mediaPreviousTrack dispatches to the SDK with no arguments", async () => {
  let called = false;
  const vehicle = {
    mediaPreviousTrack: async () => {
      called = true;
      return { response: {} };
    },
  };

  await runCommand(vehicle, { command: "mediaPreviousTrack" });

  assert.strictEqual(called, true);
});

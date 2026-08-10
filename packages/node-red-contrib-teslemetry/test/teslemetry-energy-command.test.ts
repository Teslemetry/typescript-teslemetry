import { test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import commandNodeModule from "../src/nodes/teslemetry-energy-command.js";
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

let nextConfigId = 0;

async function runCommand(
  site: Record<string, (...args: any[]) => Promise<{ response: unknown }>>,
  msg: Partial<Msg>,
): Promise<string[]> {
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-energy-command"];

  const configId = `cfg-test-${nextConfigId++}`;
  instances.set(configId, {
    teslemetry: { api: { getEnergySite: () => site } } as any,
    products: Promise.resolve({} as any),
  });

  const errors: string[] = [];
  const node = createFakeNode(errors);
  ctor.call(node, { teslemetryConfig: configId, siteId: "12345", command: "" });

  const send = () => {};
  const done = () => {};
  await node.handlers.input(msg as Msg, send, done);
  return errors;
}

const VALID_TARIFF = {
  version: 1,
  utility: "Example Utility",
  code: "FLAT-RATE",
  name: "Flat Rate Plan",
  currency: "USD",
  daily_charges: [{ name: "Charge", amount: 0 }],
  demand_charges: { ALL: { ALL: 0 } },
  energy_charges: { ALL: { rates: { ALL: 0.15 } } },
  seasons: {
    "All Year": {
      fromMonth: 1,
      toMonth: 12,
      tou_periods: { ALL: { periods: [{ fromDayOfWeek: 0, toDayOfWeek: 6 }] } },
    },
  },
};

test("a node constructed while the products fetch is failing processes messages once it recovers", async () => {
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-energy-command"];

  let called = false;
  const site = {
    getLiveStatus: async () => {
      called = true;
      return { response: {} };
    },
  };

  const configId = `cfg-recovery-test-${nextConfigId++}`;
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
    command: "getLiveStatus",
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

test("setTimeOfUseSettings coerces a numeric-string version to a number before calling the SDK", async () => {
  let receivedBody: any;
  const site = {
    setTimeOfUseSettings: async (body: any) => {
      receivedBody = body;
      return { response: {} };
    },
  };

  await runCommand(site, {
    command: "setTimeOfUseSettings",
    tariffContentV2: { ...VALID_TARIFF, version: "1" } as any,
  });

  assert.strictEqual(receivedBody.tou_settings.tariff_content_v2.version, 1);
  assert.strictEqual(
    typeof receivedBody.tou_settings.tariff_content_v2.version,
    "number",
  );
});

test("setTimeOfUseSettings forwards a valid tariff document unchanged (other than numeric coercion)", async () => {
  let receivedBody: any;
  const site = {
    setTimeOfUseSettings: async (body: any) => {
      receivedBody = body;
      return { response: {} };
    },
  };

  await runCommand(site, {
    command: "setTimeOfUseSettings",
    tariffContentV2: VALID_TARIFF as any,
  });

  assert.deepStrictEqual(receivedBody, {
    tou_settings: { tariff_content_v2: VALID_TARIFF },
  });
});

test("setTimeOfUseSettings rejects a missing tariffContentV2", async () => {
  const site = {
    setTimeOfUseSettings: async () => ({ response: {} }),
  };

  const errors = await runCommand(site, { command: "setTimeOfUseSettings" });

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /tariffContentV2/);
});

test("setTimeOfUseSettings rejects a tariff document missing required fields", async () => {
  const site = {
    setTimeOfUseSettings: async () => ({ response: {} }),
  };

  const errors = await runCommand(site, {
    command: "setTimeOfUseSettings",
    tariffContentV2: { version: 1, utility: "Example Utility" } as any,
  });

  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /code/);
  assert.match(errors[0], /daily_charges/);
});

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

let nextConfigId = 0;

async function runCommand(
  site: Record<string, (...args: any[]) => Promise<{ response: unknown }>>,
  msg: Partial<Msg>,
  paired: boolean | null = true,
): Promise<string[]> {
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-energy-command"];

  const configId = `cfg-test-${nextConfigId++}`;
  instances.set(configId, {
    teslemetry: { api: { getEnergySite: () => site } } as any,
    products: Promise.resolve({
      vehicles: {},
      energySites: { "12345": { metadata: { paired } } },
    } as any),
  });

  const errors: string[] = [];
  const node = createFakeNode(errors);
  ctor.call(node, { teslemetryConfig: configId, siteId: "12345", command: "" });

  const send = () => {};
  await node.handlers.input(msg as Msg, send, failTo(node));
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

test("a node constructed while the products fetch is failing still sends the message to the API", async () => {
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

test("msg.command is used when the node's Command is 'From msg.command' (empty)", async () => {
  let stormMode: unknown;
  const site = {
    setStormMode: async (enabled: boolean) => {
      stormMode = enabled;
      return { response: {} };
    },
    getLiveStatus: async () => {
      throw new Error("getLiveStatus must not run");
    },
  };

  const errors = await runCommand(site, { command: "setStormModeOn" });
  assert.deepEqual(errors, []);
  assert.equal(stormMode, true);
});

test("dispatchBatteryPower sends signed watts and seconds to a paired site", async () => {
  let received: unknown[] = [];
  const site = {
    dispatchBatteryPower: async (...args: unknown[]) => {
      received = args;
      return { response: {} };
    },
  };

  const errors = await runCommand(site, {
    command: "dispatchBatteryPower",
    powerWatts: "-5000",
    durationSeconds: 3600,
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(received, [-5000, 3600]);
});

test("goOffGrid and reconnectGrid send the island mode to a paired site", async () => {
  const received: unknown[][] = [];
  const site = {
    setIslandMode: async (...args: unknown[]) => {
      received.push(args);
      return { response: {} };
    },
  };

  const errors = [
    ...(await runCommand(site, { command: "goOffGrid" })),
    ...(await runCommand(site, { command: "reconnectGrid" })),
  ];

  assert.deepEqual(errors, []);
  assert.deepEqual(received, [
    [6, true],
    [1, undefined],
  ]);
});

test("dispatchBatteryPower rejects power and duration outside the api's bounds", async () => {
  const site = {
    dispatchBatteryPower: async () => {
      throw new Error("must not be sent");
    },
  };

  const errors = await runCommand(site, {
    command: "dispatchBatteryPower",
    powerWatts: 100001,
    durationSeconds: 1.5,
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /powerWatts' must be at most 100000/);
  assert.match(errors[0], /durationSeconds' must be an integer/);
});

test("resumeBatteryOperation is sent to a paired site", async () => {
  let called = false;
  const site = {
    resumeBatteryOperation: async () => {
      called = true;
      return { response: {} };
    },
  };

  const errors = await runCommand(site, { command: "resumeBatteryOperation" });
  assert.deepEqual(errors, []);
  assert.equal(called, true);
});

const CLOUD_METHODS: Record<string, string> = {
  dispatchBatteryPower: "dispatchBatteryPower",
  resumeBatteryOperation: "resumeBatteryOperation",
  goOffGrid: "setIslandMode",
  reconnectGrid: "setIslandMode",
};

for (const [command, method] of Object.entries(CLOUD_METHODS)) {
  for (const paired of [false, null]) {
    test(`${command} is refused before sending when the site's paired is ${paired}`, async () => {
      const site = {
        [method]: async () => {
          throw new Error("must not be sent");
        },
      };

      const errors = await runCommand(
        site,
        { command, powerWatts: 1000, durationSeconds: 60 },
        paired,
      );

      assert.equal(errors.length, 1);
      assert.match(errors[0], /verify Teslemetry's key on the gateway/);
    });
  }
}

test("the paired check reads the products fetched after the node was created", async () => {
  const { RED, registered } = createFakeRED();
  commandNodeModule(RED);
  const ctor = registered["teslemetry-energy-command"];

  let called = false;
  const site = {
    resumeBatteryOperation: async () => {
      called = true;
      return { response: {} };
    },
  };

  const configId = `cfg-retry-test-${nextConfigId++}`;
  const instance: Instance = {
    teslemetry: { api: { getEnergySite: () => site } } as any,
    products: Promise.resolve({ vehicles: {}, energySites: {} }),
    error: "fetch failed",
  };
  instances.set(configId, instance);

  const node = createFakeNode();
  ctor.call(node, { teslemetryConfig: configId, siteId: "12345", command: "" });

  // A later retry of the products fetch succeeds.
  instance.products = Promise.resolve({
    vehicles: {},
    energySites: { "12345": { metadata: { paired: true } } },
  } as any);
  instance.error = undefined;

  await node.handlers.input(
    { command: "resumeBatteryOperation" } as unknown as Msg,
    () => {},
    failTo(node),
  );
  assert.equal(called, true);
});

import { after, test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import { TEGSetIslandModeResult } from "@teslemetry/tesla-protocol/energy_device/teg_api";
import commandNodeModule from "../src/nodes/teslemetry-energy-command.js";
import { createLocalSite, type LocalSite } from "../src/localPowerwall.js";
import { instances } from "../src/shared.js";
import type { Msg } from "../src/types.js";
import {
  createTestKey,
  DEAD_HOST,
  FakeGateway,
  GATEWAY_PASSWORD,
} from "./helpers/fakeGateway.js";

const key = createTestKey();
const gateways: FakeGateway[] = [];
const sites: LocalSite[] = [];

after(async () => {
  sites.forEach((site) => site.powerwall.close());
  await Promise.all(gateways.map((gateway) => gateway.stop()));
});

async function startGateway(): Promise<FakeGateway> {
  const gateway = await FakeGateway.start(key.publicKeyDer);
  gateways.push(gateway);
  return gateway;
}

let nextConfigId = 0;

/** Run one command on a node whose Local gateway is `host`, for site 12345. */
async function runCommand(
  msg: Partial<Msg>,
  options: { host?: string; paired?: boolean; gatewaySiteId?: string },
) {
  const cloudCalls: unknown[][] = [];
  const cloud = new Proxy(
    {},
    {
      get:
        (_target, method) =>
        async (...args: unknown[]) => {
          cloudCalls.push([method, ...args]);
          return { response: { via: "cloud" } };
        },
    },
  );
  const configId = `cfg-local-command-${nextConfigId++}`;
  instances.set(configId, {
    teslemetry: { api: { getEnergySite: () => cloud } } as any,
    products: Promise.resolve({
      vehicles: {},
      energySites: { "12345": { metadata: { paired: options.paired ?? true } } },
    } as any),
  });

  let gatewayNode: object | undefined;
  if (options.host) {
    const site = createLocalSite({
      host: options.host,
      password: GATEWAY_PASSWORD,
      privateKey: key.privateKey,
    });
    sites.push(site);
    gatewayNode = {
      siteId: options.gatewaySiteId ?? "12345",
      local: async () => site,
    };
  }

  const registered: Record<string, Function> = {};
  commandNodeModule({
    nodes: {
      createNode() {},
      getNode: () => gatewayNode,
      registerType: (type: string, ctor: Function) => {
        registered[type] = ctor;
      },
    },
  } as unknown as NodeAPI);

  const run = {
    cloudCalls,
    errors: [] as string[],
    warnings: [] as string[],
    statuses: [] as { text?: string }[],
    /** The status left under the node. */
    get status() {
      return this.statuses[this.statuses.length - 1];
    },
    payload: undefined as unknown,
  };
  const node = {
    handlers: {} as Record<string, (...args: any[]) => any>,
    on(event: string, cb: (...args: any[]) => any) {
      this.handlers[event] = cb;
    },
    status: (status: { text?: string }) => run.statuses.push(status),
    warn: (message: string) => run.warnings.push(message),
    error: (message: string) => run.errors.push(message),
  };
  registered["teslemetry-energy-command"].call(node, {
    teslemetryConfig: configId,
    siteId: "12345",
    command: "",
    localGateway: options.host ? "gateway-1" : undefined,
  });
  await node.handlers.input(
    msg as Msg,
    (sent: Msg) => {
      run.payload = sent.payload;
    },
    (err?: unknown) => {
      if (err !== undefined) run.errors.push(err as string);
    },
  );
  return run;
}

test("a command with a local form goes to a healthy gateway and not to the cloud", async () => {
  const gateway = await startGateway();

  const run = await runCommand(
    { command: "setBackupReserve", percentage: 40 },
    { host: gateway.host },
  );

  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.cloudCalls, []);
  assert.notEqual(gateway.configJson.site_info.backup_reserve_percent, 24);
  assert.deepEqual(run.payload, { code: 201, message: "", result: true });
  assert.equal(run.status.text, "local");
});

test("operation mode and the export rule are written to the gateway", async () => {
  const gateway = await startGateway();

  await runCommand({ command: "setOperationModeAutonomous" }, { host: gateway.host });
  await runCommand({ command: "gridExportSolar" }, { host: gateway.host });

  assert.equal(gateway.configJson.default_real_mode, "autonomous");
  assert.equal(
    gateway.configJson.site_info.customer_preferred_export_rule,
    "pv_only",
  );
});

test("a gateway that does not answer sends the command to the cloud", async () => {
  const run = await runCommand(
    { command: "setBackupReserve", percentage: 40 },
    { host: DEAD_HOST },
  );

  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.cloudCalls, [["setBackupReserve", 40]]);
  assert.deepEqual(run.payload, { via: "cloud" });
  assert.equal(run.status.text, "cloud");
  assert.match(run.warnings[0], /local gateway did not answer/);
});

test("a gateway that answers and refuses is final: the cloud is not tried", async () => {
  const gateway = await startGateway();
  gateway.respond = (envelope) =>
    envelope.teg
      ? { common: { errorResponse: { status: { code: 7, message: "refused" } } } }
      : undefined;

  const run = await runCommand(
    { command: "dispatchBatteryPower", powerWatts: 1000, durationSeconds: 60 },
    { host: gateway.host },
  );

  assert.equal(run.errors.length, 1);
  assert.match(run.errors[0], /refused/);
  assert.deepEqual(run.cloudCalls, []);
});

test("a command with no local form goes to the cloud and skips the gateway", async () => {
  const gateway = await startGateway();

  const run = await runCommand({ command: "setStormModeOn" }, { host: gateway.host });

  assert.deepEqual(run.cloudCalls, [["setStormMode", true]]);
  assert.equal(gateway.logins.length, 0);
  assert.equal(run.status.text, "cloud");
});

test("dispatch and resume are signed locally for a site the cloud cannot dispatch", async () => {
  const gateway = await startGateway();

  const dispatch = await runCommand(
    { command: "dispatchBatteryPower", powerWatts: -5000, durationSeconds: 60 },
    { host: gateway.host, paired: false },
  );
  const resume = await runCommand(
    { command: "resumeBatteryOperation" },
    { host: gateway.host, paired: false },
  );

  assert.deepEqual([...dispatch.errors, ...resume.errors], []);
  assert.deepEqual([...dispatch.cloudCalls, ...resume.cloudCalls], []);
  assert.equal(dispatch.status.text, "local");
  const requests = gateway.requests.map((envelope) =>
    Object.entries(envelope.teg ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([name]) => name),
  );
  assert.equal(requests.flat().length, 2);
});

test("dispatch is never sent to the cloud for a site that is not paired with it", async () => {
  const run = await runCommand(
    { command: "dispatchBatteryPower", powerWatts: 1000, durationSeconds: 60 },
    { host: DEAD_HOST, paired: false },
  );

  assert.equal(run.errors.length, 1);
  assert.deepEqual(run.cloudCalls, []);
});

test("dispatch falls back to the cloud for a paired site when the gateway does not answer", async () => {
  const run = await runCommand(
    { command: "dispatchBatteryPower", powerWatts: 1000, durationSeconds: 60 },
    { host: DEAD_HOST, paired: true },
  );

  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.cloudCalls, [["dispatchBatteryPower", 1000, 60]]);
});

test("off-grid and reconnect are signed locally with the island mode and force", async () => {
  const gateway = await startGateway();

  const offGrid = await runCommand(
    { command: "goOffGrid" },
    { host: gateway.host, paired: false },
  );
  const reconnect = await runCommand(
    { command: "reconnectGrid" },
    { host: gateway.host, paired: false },
  );

  assert.deepEqual([...offGrid.errors, ...reconnect.errors], []);
  assert.deepEqual([...offGrid.cloudCalls, ...reconnect.cloudCalls], []);
  assert.equal(offGrid.status.text, "local");
  assert.deepEqual(
    gateway.requests.map(({ teg }) => {
      const request = teg?.setIslandModeRequest;
      return [request?.mode, request?.force];
    }),
    [
      [6, true],
      [1, false],
    ],
  );
});

test("a gateway that refuses to go off-grid is final: the cloud is not tried", async () => {
  const gateway = await startGateway();
  gateway.respond = (envelope) =>
    envelope.teg
      ? {
          teg: {
            setIslandModeResponse: {
              result:
                TEGSetIslandModeResult.TEG_SET_ISLAND_MODE_RESULT_REJECTED_LOW_ENERGY,
            },
          },
        }
      : undefined;

  const run = await runCommand({ command: "goOffGrid" }, { host: gateway.host });

  assert.equal(run.errors.length, 1);
  assert.match(run.errors[0], /REJECTED_LOW_ENERGY/);
  assert.deepEqual(run.cloudCalls, []);
});

test("off-grid falls back to the cloud for a paired site when the gateway does not answer", async () => {
  const run = await runCommand({ command: "goOffGrid" }, { host: DEAD_HOST });

  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.cloudCalls, [["setIslandMode", 6, true]]);
  assert.equal(run.status.text, "cloud");
});

test("off-grid is never sent to the cloud for a site that is not paired with it", async () => {
  const run = await runCommand(
    { command: "goOffGrid" },
    { host: DEAD_HOST, paired: false },
  );

  assert.equal(run.errors.length, 1);
  assert.deepEqual(run.cloudCalls, []);
});

test("a gateway paired for another site is not sent this site's commands", async () => {
  const gateway = await startGateway();

  const run = await runCommand(
    { command: "setBackupReserve", percentage: 40 },
    { host: gateway.host, gatewaySiteId: "99999" },
  );

  assert.deepEqual(run.cloudCalls, [["setBackupReserve", 40]]);
  assert.equal(gateway.logins.length, 0);
  assert.deepEqual(run.status, {});
});

import { after, test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import readNodeModule from "../src/nodes/teslemetry-local-powerwall-read.js";
import { pollInterval } from "../src/validation.js";
import { createLocalSite, type LocalSite } from "../src/localPowerwall.js";
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

const AGGREGATES = {
  site: { instant_power: -1200 },
  battery: { instant_power: 3000 },
  load: { instant_power: 1800 },
  solar: { instant_power: 0 },
};

async function startGateway(): Promise<FakeGateway> {
  const gateway = await FakeGateway.start(key.publicKeyDer);
  gateway.rest = {
    "/api/meters/aggregates": AGGREGATES,
    "/api/system_status/grid_status": { grid_status: "SystemGridConnected" },
    "/api/system_status/soe": { percentage: 52.5 },
  };
  gateways.push(gateway);
  return gateway;
}

/** A Local Powerwall Read node on a gateway at `host`, or on no gateway. */
function createNode(config: { host?: string; read: string; interval?: unknown }) {
  let gatewayNode: object | undefined;
  if (config.host) {
    const site = createLocalSite({
      host: config.host,
      password: GATEWAY_PASSWORD,
      privateKey: key.privateKey,
    });
    sites.push(site);
    gatewayNode = { local: async () => site };
  }

  const registered: Record<string, Function> = {};
  readNodeModule({
    nodes: {
      createNode() {},
      getNode: () => gatewayNode,
      registerType: (type: string, ctor: Function) => {
        registered[type] = ctor;
      },
    },
  } as unknown as NodeAPI);

  const node = {
    handlers: {} as Record<string, (...args: any[]) => any>,
    sent: [] as Msg[],
    errors: [] as string[],
    statuses: [] as { fill?: string; text?: string }[],
    on(event: string, cb: (...args: any[]) => any) {
      this.handlers[event] = cb;
    },
    send(msg: Msg) {
      this.sent.push(msg);
    },
    status(status: { fill?: string; text?: string }) {
      this.statuses.push(status);
    },
    error(message: string) {
      this.errors.push(message);
    },
    /** Run one input message and return what was sent and any error. */
    async input(msg: Partial<Msg>) {
      let out: Msg | undefined;
      let error: unknown;
      await this.handlers.input(
        msg as Msg,
        (sent: Msg) => {
          out = sent;
        },
        (err?: unknown) => {
          error = err;
        },
      );
      return { out, error };
    },
    close: () =>
      new Promise<void>((resolve) => node.handlers.close(resolve)),
  };
  registered["teslemetry-local-powerwall-read"].call(node, {
    localGateway: config.host ? "gateway-1" : "",
    read: config.read,
    interval: config.interval ?? 0,
  });
  return node;
}

/** Wait until `check` passes, or fail after two seconds. Works under mocked timers. */
async function eventually(check: () => boolean) {
  const start = Date.now();
  while (!check() && Date.now() - start < 2000) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.ok(check());
}

test("an input message reads the meters aggregates as the gateway returns them", async () => {
  const gateway = await startGateway();
  const node = createNode({ host: gateway.host, read: "meters_aggregates" });

  const { out, error } = await node.input({ payload: "go", _msgid: "m1" });

  assert.equal(error, undefined);
  assert.deepEqual(out?.payload, AGGREGATES);
  assert.equal(out?.topic, "meters_aggregates");
  assert.equal(out?._msgid, "m1");
  assert.equal(node.statuses[node.statuses.length - 1]?.fill, "green");
  await node.close();
});

test("live status is built from the gateway's meters, status and grid status", async () => {
  const gateway = await startGateway();
  const node = createNode({ host: gateway.host, read: "live_status" });

  const { out, error } = await node.input({});

  assert.equal(error, undefined);
  const payload = out?.payload as Record<string, unknown>;
  assert.equal(payload.grid_power, -1200);
  assert.equal(payload.battery_power, 3000);
  assert.equal(payload.load_power, 1800);
  assert.equal(payload.island_status, "on_grid");
  await node.close();
});

test("scalar reads send the value itself", async () => {
  const gateway = await startGateway();
  const grid = createNode({ host: gateway.host, read: "grid_status" });
  const soe = createNode({ host: gateway.host, read: "battery_soe_raw" });
  const config = createNode({ host: gateway.host, read: "config" });

  assert.equal((await grid.input({})).out?.payload, "SystemGridConnected");
  assert.equal((await soe.input({})).out?.payload, 52.5);
  const { out } = await config.input({});
  assert.equal((out!.payload as any).default_real_mode, "self_consumption");
  await Promise.all([grid.close(), soe.close(), config.close()]);
});

test("a failed read on input goes to catch with the reason", async () => {
  const node = createNode({ host: DEAD_HOST, read: "grid_status" });

  const { out, error } = await node.input({});

  assert.equal(out, undefined);
  assert.equal(typeof error, "string");
  assert.equal(node.statuses[node.statuses.length - 1]?.fill, "red");
  await node.close();
});

test("a node without a set-up gateway fails each read", async () => {
  const node = createNode({ read: "grid_status" });

  const { error } = await node.input({});

  assert.match(String(error), /Set up the Local gateway/);
  await node.close();
});

test("the node polls on its own and stops when closed", async () => {
  const gateway = await startGateway();
  const node = createNode({ host: gateway.host, read: "grid_status", interval: 2 });

  await eventually(() => node.sent.length === 1);
  assert.deepEqual(node.sent[0], {
    payload: "SystemGridConnected",
    topic: "grid_status",
  });
  await node.close();
  const logins = gateway.logins.length;
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(node.sent.length, 1);
  assert.equal(gateway.logins.length, logins);
});

test("a gateway that stays down is logged once, not on every poll", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const node = createNode({ host: DEAD_HOST, read: "grid_status", interval: 2 });

  for (let poll = 0; poll < 3; poll++) {
    t.mock.timers.tick(poll === 0 ? 0 : 2000);
    await eventually(() => node.statuses.length === poll + 1);
  }

  assert.equal(node.errors.length, 1);
  assert.deepEqual(node.sent, []);
  await node.close();
});

test("the poll interval defaults to 10 s, stays within 2 s to 24 h and 0 turns it off", () => {
  assert.equal(pollInterval(undefined), 10_000);
  assert.equal(pollInterval(""), 10_000);
  assert.equal(pollInterval("abc"), 10_000);
  assert.equal(pollInterval(-5), 10_000);
  assert.equal(pollInterval(0), 0);
  assert.equal(pollInterval("0"), 0);
  assert.equal(pollInterval(1), 2_000);
  assert.equal(pollInterval("30"), 30_000);
  assert.equal(pollInterval(3_000_000), 86_400_000);
});

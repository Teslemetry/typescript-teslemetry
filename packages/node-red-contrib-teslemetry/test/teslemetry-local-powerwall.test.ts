import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import registerLocalPowerwall from "../src/nodes/teslemetry-local-powerwall.js";
import {
  findGatewayAddress,
  pairGateway,
  removeGatewayKey,
  verifyGateway,
} from "../src/localPowerwall.js";
import { instances } from "../src/shared.js";
import {
  createTestKey,
  DEAD_HOST,
  FakeGateway,
  GATEWAY_PASSWORD,
} from "./helpers/fakeGateway.js";

const key = createTestKey();
const gateways: FakeGateway[] = [];

async function startGateway(registeredKey?: Buffer): Promise<FakeGateway> {
  const gateway = await FakeGateway.start(registeredKey);
  gateways.push(gateway);
  return gateway;
}

after(() => Promise.all(gateways.map((gateway) => gateway.stop())));

/** A cloud that reports this key in `state`, or does not know it. */
function createCloud(state?: number) {
  const added: any[] = [];
  return {
    added,
    getCommandAuthorizedClients: async () =>
      ({
        response: {
          authorized_clients:
            state === undefined
              ? [{ public_key: "someone-else", state: 3 }]
              : [{ public_key: key.publicKeyDer.toString("base64"), state }],
        },
      }) as any,
    addAuthorizedClient: async (body: unknown) => {
      added.push(body);
      return {} as any;
    },
  };
}

test("pairing registers a key the gateway does not know and waits for approval", async () => {
  const cloud = createCloud();

  assert.equal(await pairGateway(cloud, key.privateKey), "pending");
  assert.deepEqual(cloud.added, [
    {
      public_key: key.publicKeyDer.toString("base64"),
      description: "Node-RED",
      key_type: 1,
      authorized_client_type: 1,
    },
  ]);
});

test("pairing never registers a pending key again", async () => {
  const cloud = createCloud(1);

  assert.equal(await pairGateway(cloud, key.privateKey), "pending");
  assert.deepEqual(cloud.added, []);
});

test("pairing reports an approved key as verified without registering it", async () => {
  const cloud = createCloud(3);

  assert.equal(await pairGateway(cloud, key.privateKey), "verified");
  assert.deepEqual(cloud.added, []);
});

test("pairing registers again once the approval window has expired", async () => {
  const cloud = createCloud(2);

  assert.equal(await pairGateway(cloud, key.privateKey), "pending");
  assert.equal(cloud.added.length, 1);
});

test("a failed key lookup is not mistaken for an unknown key", async () => {
  const cloud = createCloud();
  cloud.getCommandAuthorizedClients = async () => null as any;

  await assert.rejects(pairGateway(cloud, key.privateKey));
  assert.deepEqual(cloud.added, []);
});

test("the gateway address comes from the interface with the active route", async () => {
  const cloud = {
    getCommandNetworkingStatus: async () =>
      ({
        response: {
          wifi: { ipv4_config: { address: "192.168.1.60" } },
          eth: { active_route: true, ipv4_config: { address: "192.168.1.50" } },
        },
      }) as any,
  };

  assert.equal(await findGatewayAddress(cloud), "192.168.1.50");
});

test("verify logs in and sends a signed request the gateway accepts", async () => {
  const gateway = await startGateway(key.publicKeyDer);

  const result = await verifyGateway({
    host: gateway.host,
    password: GATEWAY_PASSWORD,
    privateKey: key.privateKey,
  });

  assert.deepEqual(result, { ok: true });
  // Only the last 5 characters of the password are sent.
  assert.equal(gateway.logins[0].password, "KLMNO");
  // The gateway checked the RSA signature before recording the request.
  assert.equal(gateway.requests.length, 1);
  assert.ok(gateway.requests[0].graphql?.queryRequest);
});

test("verify reports a wrong password", async () => {
  const gateway = await startGateway(key.publicKeyDer);

  const result = await verifyGateway({
    host: gateway.host,
    password: "wrong-password",
    privateKey: key.privateKey,
  });

  assert.equal(result.ok, false);
  assert.equal((result as any).reason, "wrong_password");
  assert.equal(gateway.requests.length, 0);
});

test("verify reports a key the gateway has not approved, apart from the password", async () => {
  const gateway = await startGateway(createTestKey().publicKeyDer);

  const result = await verifyGateway({
    host: gateway.host,
    password: GATEWAY_PASSWORD,
    privateKey: key.privateKey,
  });

  assert.equal(result.ok, false);
  assert.equal((result as any).reason, "key_not_approved");
});

test("verify reports a gateway that does not answer", async () => {
  const result = await verifyGateway({
    host: DEAD_HOST,
    password: GATEWAY_PASSWORD,
    privateKey: key.privateKey,
  });

  assert.equal(result.ok, false);
  assert.equal((result as any).reason, "unreachable");
});

test("removing the key asks the gateway to remove this node's own key", async () => {
  const gateway = await startGateway(key.publicKeyDer);

  await removeGatewayKey({
    host: gateway.host,
    password: GATEWAY_PASSWORD,
    privateKey: key.privateKey,
  });

  const removed =
    gateway.requests[0].authorization?.removeAuthorizedClientRequest;
  assert.deepEqual(Buffer.from(removed!.publicKey), key.publicKeyDer);
});

type Handler = (req: any, res: any) => Promise<void>;

/** Register the node against a fake Node-RED and collect its admin routes. */
function createAdmin(saved: Record<string, Record<string, string>> = {}) {
  const routes = new Map<string, Function[]>();
  const record =
    (method: string) =>
    (path: string, ...handlers: Function[]) =>
      routes.set(`${method} ${path}`, handlers);
  const errors: string[] = [];
  const registered: any[] = [];
  registerLocalPowerwall({
    nodes: {
      registerType: (...args: unknown[]) => registered.push(args),
      getCredentials: (id: string) => saved[id],
    },
    auth: {
      needsPermission: (permission: string) =>
        Object.assign(() => {}, { permission }),
    },
    httpAdmin: { get: record("GET"), post: record("POST") },
    log: { error: (message: string) => errors.push(message) },
  } as any);

  async function call(route: string, req: object) {
    const reply: { status: number; body?: any; headers: Record<string, string> } =
      { status: 200, headers: {} };
    const res = {
      set: (name: string, value: string) => {
        reply.headers[name] = value;
      },
      status(code: number) {
        reply.status = code;
        return res;
      },
      json(body: unknown) {
        reply.body = body;
      },
    };
    const handlers = routes.get(route)!;
    await (handlers[handlers.length - 1] as Handler)(req, res);
    return reply;
  }

  return { routes, errors, registered, call };
}

function deployCloud(cloud: object): string {
  const id = `cfg-local-${instances.size}`;
  instances.set(id, {
    teslemetry: { api: { getEnergySite: () => cloud } } as any,
    products: Promise.resolve({ vehicles: {}, energySites: {} }),
  });
  return id;
}

test("every admin route requires a Node-RED editor permission", () => {
  const { routes } = createAdmin();

  const permissions = Object.fromEntries(
    [...routes].map(([route, handlers]) => [
      route,
      (handlers[0] as any).permission,
    ]),
  );
  assert.deepEqual(permissions, {
    "POST /teslemetry/local-powerwall/pair": "teslemetry-local-powerwall.write",
    "GET /teslemetry/local-powerwall/address": "teslemetry-local-powerwall.read",
    "POST /teslemetry/local-powerwall/verify": "teslemetry-local-powerwall.write",
    "POST /teslemetry/local-powerwall/remove-key":
      "teslemetry-local-powerwall.write",
  });
});

test("the key and password are password credentials, kept out of the flow", () => {
  const { registered } = createAdmin();
  assert.deepEqual(registered[0][2], {
    credentials: {
      password: { type: "password" },
      privateKey: { type: "password" },
    },
  });

  // A property in the editor's `defaults` is saved in the flow and exported.
  const html = readFileSync(
    resolve(__dirname, "../src/nodes/teslemetry-local-powerwall.html"),
    "utf8",
  );
  const defaults = /defaults: \{([\s\S]*?)\n {8}\},/.exec(html)![1];
  assert.match(defaults, /siteId/);
  assert.doesNotMatch(defaults, /password|privateKey/);
});

test("Pair creates a key once and hands it to the editor, never to the log", async () => {
  const cloud = createCloud();
  const admin = createAdmin();
  const config = deployCloud(cloud);

  const reply = await admin.call("POST /teslemetry/local-powerwall/pair", {
    body: { id: "node-1", config, siteId: "12345" },
  });

  assert.equal(reply.status, 200);
  assert.equal(reply.headers["Cache-Control"], "no-store");
  assert.equal(reply.body.state, "pending");
  // One line: the editor keeps it in a password input, which drops line breaks.
  assert.match(reply.body.privateKey, /^[A-Za-z0-9+/=]{3000,}$/);
  assert.equal(
    cloud.added[0].public_key,
    createPublicKey({
      key: Buffer.from(reply.body.privateKey, "base64"),
      format: "der",
      type: "pkcs1",
    })
      .export({ type: "pkcs1", format: "der" })
      .toString("base64"),
  );
  assert.equal(cloud.added.length, 1);
  assert.deepEqual(admin.errors, []);
});

test("Pair uses the saved key and never returns it", async () => {
  const cloud = createCloud(3);
  const admin = createAdmin({ "node-1": { privateKey: key.privateKey } });
  const config = deployCloud(cloud);

  const reply = await admin.call("POST /teslemetry/local-powerwall/pair", {
    body: { id: "node-1", config, siteId: "12345", privateKey: "__PWRD__" },
  });

  assert.deepEqual(reply.body, { state: "verified" });
});

test("Pair reports a cloud failure without the key", async () => {
  const cloud = createCloud();
  cloud.getCommandAuthorizedClients = async () => {
    throw { error: "energy_gateway_unreachable" };
  };
  const admin = createAdmin({ "node-1": { privateKey: key.privateKey } });
  const config = deployCloud(cloud);

  const reply = await admin.call("POST /teslemetry/local-powerwall/pair", {
    body: { id: "node-1", config, siteId: "12345" },
  });

  assert.equal(reply.status, 500);
  assert.deepEqual(reply.body, { message: "energy_gateway_unreachable" });
  assert.deepEqual(admin.errors, [
    "Local Powerwall pairing failed: energy_gateway_unreachable",
  ]);
});

test("Pair needs a deployed Teslemetry config", async () => {
  const admin = createAdmin();

  const reply = await admin.call("POST /teslemetry/local-powerwall/pair", {
    body: { id: "node-1", config: "not-deployed", siteId: "12345" },
  });

  assert.equal(reply.status, 400);
  assert.deepEqual(admin.errors, []);
});

test("Verify uses the saved key and password when the editor sends placeholders", async () => {
  const gateway = await startGateway(key.publicKeyDer);
  const admin = createAdmin({
    "node-1": { privateKey: key.privateKey, password: GATEWAY_PASSWORD },
  });

  const reply = await admin.call("POST /teslemetry/local-powerwall/verify", {
    body: {
      id: "node-1",
      host: gateway.host,
      password: "__PWRD__",
      privateKey: "__PWRD__",
    },
  });

  assert.deepEqual(reply.body, { ok: true });
});

test("Verify refuses to run before a key exists", async () => {
  const admin = createAdmin();

  const reply = await admin.call("POST /teslemetry/local-powerwall/verify", {
    body: { id: "node-1", host: "192.168.1.50", password: "abcde" },
  });

  assert.equal(reply.status, 400);
  assert.deepEqual(reply.body, { message: "Press Pair first" });
});

test("Find returns the address the cloud reports", async () => {
  const admin = createAdmin();
  const config = deployCloud({
    getCommandNetworkingStatus: async () => ({
      response: { eth: { ipv4_config: { address: "192.168.1.50" } } },
    }),
  });

  const reply = await admin.call("GET /teslemetry/local-powerwall/address", {
    query: { config, siteId: "12345" },
  });

  assert.deepEqual(reply.body, { host: "192.168.1.50" });
});

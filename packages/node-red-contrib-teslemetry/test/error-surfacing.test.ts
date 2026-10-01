import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { NodeAPI } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import vehicleCommandModule from "../src/nodes/teslemetry-vehicle-command.js";
import energyCommandModule from "../src/nodes/teslemetry-energy-command.js";
import energyHistoryModule from "../src/nodes/teslemetry-energy-history.js";
import { getErrorMessage, instances } from "../src/shared.js";
import type { Msg } from "../src/types.js";

// These tests run the real SDK client against a local HTTP server, so the
// value each node catches is exactly what the generated client throws - a
// hand-built error object would not have caught the empty `error_description`
// or the raw-text body.

const TOKEN = "test-token-SECRET";

type Reply = { status: number; contentType: string; body: string };
let reply: Reply;
let requests: string[] = [];

const server = createServer((req, res) => {
  requests.push(`${req.method} ${req.url}`);
  res.writeHead(reply.status, { "content-type": reply.contentType });
  res.end(reply.body);
});

const realFetch = globalThis.fetch;
let target = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  target = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // The SDK always calls fetch with a Request for https://api.teslemetry.com
  globalThis.fetch = ((input: Request) =>
    realFetch(
      new Request(input.url.replace(/^https:\/\/[a-z]+\.teslemetry\.com/, target), {
        method: input.method,
        headers: input.headers,
        body: input.method === "GET" ? undefined : input.body,
        ...(input.method === "GET" ? {} : { duplex: "half" }),
      } as RequestInit),
    )) as typeof fetch;
});

after(async () => {
  globalThis.fetch = realFetch;
  await new Promise((resolve) => server.close(resolve));
});

const json = (status: number, body: unknown): Reply => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const NODES = [
  {
    type: "teslemetry-vehicle-command",
    module: vehicleCommandModule,
    config: { vin: "5YJ3E1EA7KF000001", command: "lockDoors" },
  },
  {
    type: "teslemetry-energy-command",
    module: energyCommandModule,
    config: { siteId: "12345", command: "setStormModeOn" },
  },
  {
    type: "teslemetry-energy-history",
    module: energyHistoryModule,
    config: { siteId: "12345", historyType: "energy", period: "day" },
  },
];

let nextConfigId = 0;

const last = (statuses: any[]) => statuses[statuses.length - 1];

/** Sends one message through a node wired to a real `Teslemetry` client. */
async function runNode({ module, config }: (typeof NODES)[number]) {
  let ctor!: Function;
  module({
    nodes: {
      createNode() {},
      registerType(_type: string, registered: Function) {
        ctor = registered;
      },
    },
  } as unknown as NodeAPI);

  const configId = `cfg-error-surfacing-${nextConfigId++}`;
  const silent = { debug() {}, info() {}, warn() {}, error() {} };
  instances.set(configId, {
    teslemetry: new Teslemetry(TOKEN, { logger: silent as any }),
    products: Promise.resolve({ vehicles: {}, energySites: {} } as any),
  });

  const statuses: any[] = [];
  const doneArgs: unknown[] = [];
  const sent: unknown[] = [];
  const nodeErrors: unknown[] = [];
  const handlers: Record<string, (...args: any[]) => any> = {};
  const node = {
    on: (event: string, cb: (...args: any[]) => any) => (handlers[event] = cb),
    status: (status: unknown) => statuses.push(status),
    error: (...args: unknown[]) => nodeErrors.push(args),
  };
  ctor.call(node, { teslemetryConfig: configId, ...config });

  requests = [];
  await handlers.input(
    {} as Msg,
    (msg: unknown) => sent.push(msg),
    (...args: unknown[]) => doneArgs.push(args),
  );
  return { statuses, doneArgs, sent, nodeErrors };
}

const CASES: { name: string; reply: Reply; expected: string }[] = [
  {
    name: "402 out of credits",
    reply: json(402, {
      response: null,
      error: "insufficient_credits",
      error_description: "Insufficient credits. Balance: 0",
    }),
    expected: "Insufficient credits. Balance: 0",
  },
  {
    // Tesla's own error shape: the reason is in `error`, the description is empty
    name: "408 vehicle offline",
    reply: json(408, {
      response: null,
      error: 'vehicle unavailable: {:error=>"vehicle unavailable:"}',
      error_description: "",
    }),
    expected: 'vehicle unavailable: {:error=>"vehicle unavailable:"}',
  },
  {
    name: "plain-text 500",
    reply: { status: 500, contentType: "text/plain", body: "Internal Server Error" },
    expected: "Internal Server Error",
  },
  {
    name: "500 with an empty body",
    reply: { status: 500, contentType: "text/plain", body: "" },
    expected: "Unknown error",
  },
];

for (const nodeCase of NODES) {
  for (const { name, reply: caseReply, expected } of CASES) {
    test(`${nodeCase.type}: ${name} reaches the status and done() as the API's own text`, async () => {
      reply = caseReply;
      const { statuses, doneArgs, sent, nodeErrors } = await runNode(nodeCase);

      assert.equal(requests.length, 1, "the request reached the API");
      assert.deepEqual(last(statuses), {
        fill: "red",
        shape: "ring",
        text: expected,
      });
      // done(err) is what makes Node-RED fire Catch nodes and skip Complete
      // nodes; a node.error() + bare done() would fire both.
      assert.deepEqual(doneArgs, [[expected]]);
      assert.deepEqual(nodeErrors, []);
      assert.deepEqual(sent, []);
    });
  }

  test(`${nodeCase.type}: a network error names its cause and never the request URL`, async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
    const closedPort = (closed.address() as AddressInfo).port;
    await new Promise((resolve) => closed.close(resolve));

    const liveTarget = target;
    target = `http://127.0.0.1:${closedPort}`;
    try {
      const { statuses, doneArgs, sent } = await runNode(nodeCase);

      assert.equal(doneArgs.length, 1);
      const [text] = doneArgs[0] as [string];
      assert.match(text, /^fetch failed: .*ECONNREFUSED/);
      assert.equal(last(statuses).text, text);
      assert.equal(last(statuses).fill, "red");
      assert.deepEqual(sent, []);
      assert.doesNotMatch(JSON.stringify([statuses, doneArgs]), /token/i);
    } finally {
      target = liveTarget;
    }
  });

  test(`${nodeCase.type}: a success clears the status and completes without an error`, async () => {
    reply = json(200, { response: { result: true, reason: "" } });
    const { statuses, doneArgs, sent } = await runNode(nodeCase);

    assert.deepEqual(last(statuses), {});
    assert.deepEqual(doneArgs, [[]]);
    assert.equal(sent.length, 1);
  });
}

test("a long error text is shortened in the status but not in the error", async () => {
  const page = `<html>${"x".repeat(500)}</html>`;
  reply = { status: 502, contentType: "text/html", body: page };
  const { statuses, doneArgs } = await runNode(NODES[0]);

  assert.equal(last(statuses).text.length, 100);
  assert.ok(page.startsWith(last(statuses).text.slice(0, -1)));
  assert.deepEqual(doneArgs, [[page]]);
});

test("getErrorMessage strips the query string from any URL in the text", () => {
  const url = `https://api.teslemetry.com/api/1/vehicles/VIN/command/door_lock?token=${TOKEN}&x=1`;

  assert.equal(
    getErrorMessage(new Error(`Request to ${url} failed`)),
    "Request to https://api.teslemetry.com/api/1/vehicles/VIN/command/door_lock failed",
  );
  assert.doesNotMatch(getErrorMessage({ url }), /SECRET|token/);
  assert.doesNotMatch(
    getErrorMessage(
      Object.assign(new TypeError("fetch failed"), { cause: new Error(url) }),
    ),
    /SECRET|token/,
  );
});

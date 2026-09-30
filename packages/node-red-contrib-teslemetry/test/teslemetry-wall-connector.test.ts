import { test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import energyEventNodeModule from "../src/nodes/teslemetry-energy-event.js";
import wallConnectorNodeModule from "../src/nodes/teslemetry-wall-connector.js";
import { instances } from "../src/shared.js";
import type { Msg } from "../src/types.js";

interface FakeNode {
  handlers: Record<string, (...args: any[]) => any>;
  on(event: string, cb: (...args: any[]) => any): void;
  status(): void;
  error(msg?: string): void;
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

function buildNode(config: Record<string, unknown> = {}) {
  const { RED, registered } = createFakeRED();
  wallConnectorNodeModule(RED);
  const ctor = registered["teslemetry-wall-connector"];
  const node = createFakeNode();
  ctor.call(node, config);
  return node;
}

// Returns what leaves the node's single output, using Node-RED's send()
// semantics: a top-level array is one entry per output, and an entry may
// itself be an array of messages for that output.
async function runInput(node: FakeNode, msg: Partial<Msg>): Promise<any[]> {
  let sent: any[] = [];
  await node.handlers.input(
    msg as Msg,
    (out: any) => {
      const firstOutput = Array.isArray(out) ? out[0] : out;
      sent = Array.isArray(firstOutput) ? firstOutput : firstOutput ? [firstOutput] : [];
    },
    () => {},
  );
  return sent;
}

test("fans out wall_connectors[] from a live_status-shaped payload into per-DIN messages", async () => {
  const node = buildNode();
  const sent = await runInput(node, {
    payload: {
      wall_connectors: [
        { din: "AAA-111", wall_connector_state: 1, wall_connector_power: 5000 },
        { din: "BBB-222", wall_connector_state: 2, wall_connector_power: 0 },
      ],
    },
  } as any);

  assert.equal(sent.length, 2);
  assert.equal(sent[0].din, "AAA-111");
  assert.equal(sent[0].topic, "AAA-111");
  assert.deepEqual(sent[0].payload, {
    din: "AAA-111",
    wall_connector_state: 1,
    wall_connector_power: 5000,
  });
  assert.equal(sent[1].din, "BBB-222");
});

// Regression: the node used to be tested only against hand-written payloads
// and missed that the Energy Event node nests the array under
// `payload.live_status`. This drives the real Energy Event node off the real
// SDK stream parser and pipes whatever it sends straight into this node.
test("fans out the Energy Event node's real live_status output", async () => {
  const siteId = "12345";
  const configId = "wall-connector-upstream";
  const encoder = new TextEncoder();
  const teslemetry = new Teslemetry(async () => "token", {
    region: "na",
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  });
  // Left open after the fixture event: a closed body makes the SDK reconnect.
  teslemetry.client.setConfig({
    fetch: (async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            const event = {
              createdAt: "2026-01-01T00:00:00.000Z",
              site_id: siteId,
              live_status: {
                solar_power: 0,
                wall_connectors: [
                  { din: "AAA-111", wall_connector_state: 1, wall_connector_power: 5000 },
                  { din: "BBB-222", wall_connector_state: 2, wall_connector_power: 0 },
                ],
              },
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          },
        }),
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      )) as typeof fetch,
  });
  instances.set(configId, {
    teslemetry,
    products: Promise.resolve({ vehicles: {}, energySites: {} }),
  });

  const { RED, registered } = createFakeRED();
  energyEventNodeModule(RED);
  const upstreamSent: Msg[] = [];
  const upstream = createFakeNode();
  upstream.send = (msg: Msg) => upstreamSent.push(msg);

  try {
    registered["teslemetry-energy-event"].call(upstream, {
      teslemetryConfig: configId,
      siteId,
      event: "live_status",
    });
    const deadline = Date.now() + 2000;
    while (upstreamSent.length === 0) {
      assert.ok(Date.now() < deadline, "Energy Event node never sent a message");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const sent = await runInput(buildNode(), upstreamSent[0]);

    assert.deepEqual(
      sent.map((msg) => msg.din),
      ["AAA-111", "BBB-222"],
    );
    assert.deepEqual(sent[0].payload, {
      din: "AAA-111",
      wall_connector_state: 1,
      wall_connector_power: 5000,
    });
    assert.equal(sent[0].topic, "AAA-111");
    assert.equal(sent[0].siteId, siteId);
  } finally {
    await new Promise<void>((resolve) => upstream.handlers.close(resolve));
    await teslemetry.sse.disconnect();
    instances.delete(configId);
  }
});

test("accepts the wall_connectors array directly as payload", async () => {
  const node = buildNode();
  const sent = await runInput(node, {
    payload: [{ din: "AAA-111", wall_connector_state: 1 }],
  } as any);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].din, "AAA-111");
});

test("config DIN filter restricts output to the matching connector", async () => {
  const node = buildNode({ din: "BBB-222" });
  const sent = await runInput(node, {
    payload: {
      wall_connectors: [
        { din: "AAA-111", wall_connector_state: 1 },
        { din: "BBB-222", wall_connector_state: 2 },
      ],
    },
  } as any);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].din, "BBB-222");
});

test("msg.din filters when no config filter is set", async () => {
  const node = buildNode();
  const sent = await runInput(node, {
    din: "AAA-111",
    payload: {
      wall_connectors: [
        { din: "AAA-111", wall_connector_state: 1 },
        { din: "BBB-222", wall_connector_state: 2 },
      ],
    },
  } as any);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].din, "AAA-111");
});

test("emits nothing for an empty wall_connectors array", async () => {
  const node = buildNode();
  const sent = await runInput(node, { payload: { wall_connectors: [] } } as any);
  assert.deepEqual(sent, []);
});

test("emits nothing when wall_connectors is missing (connector disappeared)", async () => {
  const node = buildNode();
  const sent = await runInput(node, { payload: { site_id: "123" } } as any);
  assert.deepEqual(sent, []);
});

test("emits nothing for a malformed payload without throwing", async () => {
  const node = buildNode();
  const sent = await runInput(node, { payload: "not an object" } as any);
  assert.deepEqual(sent, []);
});

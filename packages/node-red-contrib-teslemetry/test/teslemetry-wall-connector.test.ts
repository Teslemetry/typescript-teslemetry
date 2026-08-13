import { test } from "node:test";
import assert from "node:assert/strict";
import type { NodeAPI } from "node-red";
import wallConnectorNodeModule from "../src/nodes/teslemetry-wall-connector.js";
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

async function runInput(node: FakeNode, msg: Partial<Msg>): Promise<any[]> {
  let sent: any[] = [];
  await node.handlers.input(
    msg as Msg,
    (out: any) => {
      sent = Array.isArray(out) ? out : [out];
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

import { test } from "node:test";
import assert from "node:assert/strict";
import { TeslemetryTrigger } from "../src/nodes/TeslemetryTrigger.node.js";
import { withMockedFetch } from "./testHelpers.js";

function sseResponse(events: Array<Record<string, unknown>>) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function fakeTriggerContext(params: Record<string, unknown>) {
  const emitted: unknown[] = [];
  const context = {
    getCredentials: async () => ({ accessToken: "token" }),
    getNodeParameter: (name: string, fallback?: unknown) =>
      name in params ? params[name] : fallback,
    emit: (data: unknown) => emitted.push(data),
    emitError: () => {},
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    helpers: { returnJsonArray: (data: unknown) => data },
  };
  return { context: context as never, emitted };
}

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const VIN_A = "5YJSA1E14FF000001";
const VIN_B = "5YJSA1E14FF000002";

test("TeslemetryTrigger vehicle events filter by VIN when one is configured", async () => {
  const { context, emitted } = fakeTriggerContext({
    resource: "vehicle",
    event: "data",
    vin: VIN_A,
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () =>
      sseResponse([
        { vin: VIN_B, data: { Soc: 50 }, createdAt: "2026-08-14T00:00:00.000000000Z" },
        { vin: VIN_A, data: { Soc: 60 }, createdAt: "2026-08-14T00:00:00.000000000Z" },
      ]),
    () => node.trigger.call(context),
  );

  await waitFor(() => emitted.length > 0);
  assert.equal(emitted.length, 1);
  assert.equal((emitted[0] as [{ vin: string }])[0].vin, VIN_A);

  await result.closeFunction!();
});

test("TeslemetryTrigger vehicle events pass through all VINs when none is configured", async () => {
  const { context, emitted } = fakeTriggerContext({
    resource: "vehicle",
    event: "data",
    vin: "",
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () =>
      sseResponse([
        { vin: VIN_A, data: { Soc: 60 }, createdAt: "2026-08-14T00:00:00.000000000Z" },
        { vin: VIN_B, data: { Soc: 50 }, createdAt: "2026-08-14T00:00:00.000000000Z" },
      ]),
    () => node.trigger.call(context),
  );

  await waitFor(() => emitted.length >= 2);
  assert.equal(emitted.length, 2);

  await result.closeFunction!();
});

test("TeslemetryTrigger energy events filter by site_id for live_status", async () => {
  const { context, emitted } = fakeTriggerContext({
    resource: "energySite",
    event: "live_status",
    siteId: "123",
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () =>
      sseResponse([
        { site_id: 999, live_status: { soc: 1 } },
        { site_id: 123, live_status: { soc: 2 } },
      ]),
    () => node.trigger.call(context),
  );

  await waitFor(() => emitted.length > 0);
  assert.equal(emitted.length, 1);
  assert.equal((emitted[0] as [{ site_id: number }])[0].site_id, 123);

  await result.closeFunction!();
});

test("TeslemetryTrigger energy events filter by id (not site_id) for energy_totals", async () => {
  const { context, emitted } = fakeTriggerContext({
    resource: "energySite",
    event: "energy_totals",
    siteId: "123",
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () =>
      sseResponse([
        { id: 999, totals: { generated: 1 } },
        { id: 123, totals: { generated: 2 } },
      ]),
    () => node.trigger.call(context),
  );

  await waitFor(() => emitted.length > 0);
  assert.equal(emitted.length, 1);
  assert.equal((emitted[0] as [{ id: number }])[0].id, 123);

  await result.closeFunction!();
});

test("TeslemetryTrigger energy events pass through all sites when none is configured", async () => {
  const { context, emitted } = fakeTriggerContext({
    resource: "energySite",
    event: "site_info",
    siteId: "",
  });
  const node = new TeslemetryTrigger();

  const result = await withMockedFetch(
    () =>
      sseResponse([
        { site_id: 1, site_info: {} },
        { site_id: 2, site_info: {} },
      ]),
    () => node.trigger.call(context),
  );

  await waitFor(() => emitted.length >= 2);
  assert.equal(emitted.length, 2);

  await result.closeFunction!();
});

test("TeslemetryTrigger signal events require a VIN and a field", async () => {
  const node = new TeslemetryTrigger();

  const { context: noVin } = fakeTriggerContext({
    resource: "vehicle",
    event: "signal",
    vin: "",
    field: "Soc",
  });
  await assert.rejects(() => node.trigger.call(noVin), /VIN is required/);

  const { context: noField } = fakeTriggerContext({
    resource: "vehicle",
    event: "signal",
    vin: VIN_A,
    field: "",
  });
  await assert.rejects(() => node.trigger.call(noField), /Field is required/);
});

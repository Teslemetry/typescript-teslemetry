import { test } from "node:test";
import assert from "node:assert/strict";
import { TeslemetryTrigger } from "../nodes/TeslemetryTrigger/TeslemetryTrigger.node.js";
import { apiError, fakeHelpers, fakeNode, withMockedFetch } from "./testHelpers.js";

const VIN = "5YJSA1E14FF000000";
const SITE_ID = 123;

/** Minimal IPollFunctions stand-in; `staticData` persists across polls like n8n's node static data. */
function fakePollContext(params: Record<string, unknown>, mode = "trigger", staticData: Record<string, unknown> = {}) {
  const context = {
    getNodeParameter: (name: string, fallback?: unknown) => (name in params ? params[name] : fallback),
    getNode: () => fakeNode,
    getMode: () => mode,
    getWorkflowStaticData: () => staticData,
    helpers: fakeHelpers,
  };
  return { context: context as never, staticData };
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

/** Answers each request with the next body and records the requests. */
function server(...bodies: unknown[]) {
  const requests: URL[] = [];
  const handler = (request: Request) => {
    requests.push(new URL(request.url));
    return json(bodies[Math.min(requests.length, bodies.length) - 1]);
  };
  return { handler, requests };
}

const leaf = (value: unknown, createdAt = "2026-10-22T00:00:00Z") => ({ value, createdAt });

/** Polls once per body against one persisted static data, returning each poll's items. */
async function pollEach(params: Record<string, unknown>, ...bodies: unknown[]) {
  const { handler, requests } = server(...bodies);
  const { context } = fakePollContext(params);
  const node = new TeslemetryTrigger();
  const results = [];
  for (let i = 0; i < bodies.length; i++) {
    const result = await withMockedFetch(handler, () => node.poll.call(context));
    results.push(result ? result[0].map((item: { json: unknown }) => item.json) : null);
  }
  return { results, requests };
}

test("TeslemetryTrigger records a baseline on the first poll and then emits only changed fields", async () => {
  const snapshot = (soc: number) => ({
    response: { vin: VIN, state: leaf("online"), data: { BatteryLevel: leaf(soc), Locked: leaf(true) } },
  });
  const { results, requests } = await pollEach({ resource: "vehicle", vin: VIN, event: "data" }, snapshot(80), snapshot(80), snapshot(81));

  assert.equal(requests[0].pathname, `/api/1/vehicles/${VIN}/telemetry`);
  assert.equal(requests[0].searchParams.get("topics"), "data");
  assert.deepEqual(results, [null, null, [{ vin: VIN, topic: "data", data: { BatteryLevel: leaf(81) } }]]);
});

test("TeslemetryTrigger Any Change reads the full snapshot and emits one item per changed topic", async () => {
  const { results, requests } = await pollEach(
    { resource: "vehicle", vin: VIN, event: "all" },
    { response: { state: leaf("asleep"), data: { Locked: leaf(true) }, alerts: null } },
    { response: { state: leaf("online"), data: { Locked: leaf(false) }, alerts: null } },
  );

  assert.equal(requests[0].search, "");
  assert.deepEqual(results[1], [
    { vin: VIN, topic: "data", data: { Locked: leaf(false) } },
    { vin: VIN, topic: "state", state: leaf("online") },
  ]);
});

test("TeslemetryTrigger Signal reads one field and emits its value", async () => {
  const { results, requests } = await pollEach(
    { resource: "vehicle", vin: VIN, event: "signal", field: "BatteryLevel" },
    { response: { data: { BatteryLevel: leaf(50, "t1") } } },
    { response: { data: { BatteryLevel: leaf(51, "t2") } } },
  );

  assert.equal(requests[0].searchParams.get("fields"), "BatteryLevel");
  assert.deepEqual(results[1], [{ vin: VIN, topic: "signal", field: "BatteryLevel", value: 51, createdAt: "t2" }]);
});

test("TeslemetryTrigger Signal requires a VIN and a field", async () => {
  const node = new TeslemetryTrigger();
  await assert.rejects(
    () => node.poll.call(fakePollContext({ resource: "vehicle", vin: "", event: "signal", field: "Soc" }).context),
    /Choose the vehicle to watch/,
  );
  await assert.rejects(
    () => node.poll.call(fakePollContext({ resource: "vehicle", vin: VIN, event: "signal" }).context),
    /Choose the field to watch/,
  );
});

test("TeslemetryTrigger starts a new baseline when the watched vehicle changes", async () => {
  const { handler } = server({ response: { data: { Locked: leaf(true) } } }, { response: { data: { Locked: leaf(false) } } });
  const staticData = {};
  const node = new TeslemetryTrigger();

  await withMockedFetch(handler, () =>
    node.poll.call(fakePollContext({ resource: "vehicle", vin: VIN, event: "data" }, "trigger", staticData).context),
  );
  const result = await withMockedFetch(handler, () =>
    node.poll.call(fakePollContext({ resource: "vehicle", vin: "OTHERVIN", event: "data" }, "trigger", staticData).context),
  );

  assert.equal(result, null);
});

test("TeslemetryTrigger shows the current values on a manual run without moving the baseline", async () => {
  const { handler } = server({ response: { state: leaf("online") } });
  const { context, staticData } = fakePollContext({ resource: "vehicle", vin: VIN, event: "state" }, "manual");

  const result = await withMockedFetch(handler, () => new TeslemetryTrigger().poll.call(context));

  assert.deepEqual(result?.[0].map((item: { json: unknown }) => item.json), [{ vin: VIN, topic: "state", state: leaf("online") }]);
  assert.deepEqual(staticData, {});
});

test("TeslemetryTrigger energy Live Status emits the site's status when it changes", async () => {
  const { results, requests } = await pollEach(
    { resource: "energySite", siteId: SITE_ID, event: "live_status" },
    { response: { solar_power: 100, timestamp: "t1" } },
    { response: { solar_power: 200, timestamp: "t2" } },
  );

  assert.equal(requests[0].pathname, `/api/1/energy_sites/${SITE_ID}/live_status`);
  assert.deepEqual(results[1], [{ site_id: SITE_ID, solar_power: 200, timestamp: "t2" }]);
});

test("TeslemetryTrigger energy Tariff Content reports a removed tariff (null) as a change", async () => {
  const { results, requests } = await pollEach(
    { resource: "energySite", siteId: SITE_ID, event: "tariff_content_v2" },
    { response: { tariff_content_v2: { name: "TOU" } } },
    { response: { tariff_content_v2: null } },
    { response: {} },
  );

  assert.equal(requests[0].pathname, `/api/1/energy_sites/${SITE_ID}/site_info`);
  assert.deepEqual(results.slice(1), [[{ site_id: SITE_ID, tariff_content_v2: null }], null]);
});

test("TeslemetryTrigger fails the poll with the api's text and no credential", async () => {
  const { context } = fakePollContext({ resource: "vehicle", vin: VIN, event: "all" });

  await assert.rejects(
    () =>
      withMockedFetch(
        () => apiError(402, "subscription_required", "Active subscription required"),
        () => new TeslemetryTrigger().poll.call(context),
      ),
    (error: Error & { httpCode?: string }) => {
      assert.equal(error.name, "NodeApiError");
      assert.equal(error.message, "Active subscription required");
      assert.equal(error.httpCode, "402");
      assert.ok(!JSON.stringify(error).includes("Bearer"));
      return true;
    },
  );
});

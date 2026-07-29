import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import { ENERGY_HISTORY_TOTAL_FIELDS } from "../src/const.js";
import type { EnergyHistoryTotals } from "../src/const.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

function makeTotals(
  overrides: Partial<EnergyHistoryTotals>,
): EnergyHistoryTotals {
  return Object.fromEntries(
    ENERGY_HISTORY_TOTAL_FIELDS.map((field) => [
      field,
      overrides[field] ?? null,
    ]),
  ) as EnergyHistoryTotals;
}

function makeTeslemetry(
  fetchImpl: (request: Request) => Promise<Response>,
): Teslemetry {
  const teslemetry = new Teslemetry(async () => "token", {
    region: "na",
    logger: silentLogger,
  });
  teslemetry.client.setConfig({ fetch: fetchImpl as typeof fetch });
  return teslemetry;
}

// A real SSE connection stays open indefinitely; closing the mock body after
// the fixture events would exhaust the client's async iterator and trigger
// an immediate, unthrottled reconnect loop, so the stream is left open.
function sseResponse(events: object[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("emits live_status and site_info events on the stream and the scoped energy site", async () => {
  const siteId = "12345";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        live_status: { battery_power: 100 },
      },
      {
        createdAt: "2026-01-01T00:00:01.000Z",
        site_id: siteId,
        site_info: { site_name: "Home" },
      },
    ]),
  );

  const siteStream = teslemetry.sse.getEnergySite(siteId);

  const streamLiveStatus: unknown[] = [];
  const siteLiveStatus: unknown[] = [];
  const siteSiteInfo: unknown[] = [];
  teslemetry.sse.on("live_status", (event) =>
    streamLiveStatus.push(event.live_status),
  );
  siteStream.on("live_status", (event) =>
    siteLiveStatus.push(event.live_status),
  );
  siteStream.on("site_info", (event) => siteSiteInfo.push(event.site_info));

  await teslemetry.sse.connect();
  await waitFor(() => siteSiteInfo.length > 0);
  teslemetry.sse.disconnect();

  assert.deepEqual(streamLiveStatus, [{ battery_power: 100 }]);
  assert.deepEqual(siteLiveStatus, [{ battery_power: 100 }]);
  assert.deepEqual(siteSiteInfo, [{ site_name: "Home" }]);
});

test("does not route energy site events to a vehicle stream, or vice versa", async () => {
  const vin = "TESTVIN0000000000";
  const siteId = "999";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      { createdAt: "2026-01-01T00:00:00.000Z", vin, state: "online" },
      {
        createdAt: "2026-01-01T00:00:01.000Z",
        site_id: siteId,
        live_status: { battery_power: 1 },
      },
    ]),
  );

  const vehicleStream = teslemetry.sse.getVehicle(vin);
  const siteStream = teslemetry.sse.getEnergySite(siteId);

  let vehicleLiveStatus = 0;
  let siteState = 0;
  // @ts-expect-error live_status is not part of the vehicle stream's event map
  vehicleStream.on("live_status", () => vehicleLiveStatus++);
  // @ts-expect-error state is not part of the energy site stream's event map
  siteStream.on("state", () => siteState++);

  const states: string[] = [];
  vehicleStream.on("state", (event) => states.push(event.state));

  await teslemetry.sse.connect();
  await waitFor(() => states.length > 0);
  teslemetry.sse.disconnect();

  assert.deepEqual(states, ["online"]);
  assert.equal(vehicleLiveStatus, 0);
  assert.equal(siteState, 0);
});

test("startLocalCache replays cached live_status/site_info to new listeners", async () => {
  const siteId = "42";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        live_status: { battery_power: 5 },
      },
    ]),
  );

  await teslemetry.sse.connect();
  await waitFor(() => teslemetry.sse.energyCache[siteId]?.live_status !== undefined);
  teslemetry.sse.disconnect();

  const replayed: unknown[] = [];
  const siteStream = teslemetry.sse.getEnergySite(siteId);
  siteStream.on("live_status", (event) => replayed.push(event.live_status));

  assert.deepEqual(replayed, [{ battery_power: 5 }]);
});

test("local caching can be stopped and restarted once an energy event has been cached", async () => {
  const siteId = "7";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        live_status: { battery_power: 3 },
      },
    ]),
  );

  await teslemetry.sse.connect();
  await waitFor(() => teslemetry.sse.energyCache[siteId]?.live_status !== undefined);
  teslemetry.sse.disconnect();

  teslemetry.sse.stopLocalCache();
  // Previously threw: the internal cache handlers were plain unbound method
  // references, and re-registering them replays the now-populated energy
  // cache through a bare call that leaves `this` undefined mid-handler.
  assert.doesNotThrow(() => teslemetry.sse.startLocalCache());
});

test("once() on a cached event fires exactly once and does not leak a dead listener", async () => {
  const siteId = "8";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        live_status: { battery_power: 4 },
      },
    ]),
  );

  await teslemetry.sse.connect();
  await waitFor(() => teslemetry.sse.energyCache[siteId]?.live_status !== undefined);
  teslemetry.sse.disconnect();

  const siteStream = teslemetry.sse.getEnergySite(siteId);
  const received: unknown[] = [];
  siteStream.once("live_status", (event) => received.push(event.live_status));

  // The cached replay must satisfy the once() subscription immediately...
  assert.deepEqual(received, [{ battery_power: 4 }]);
  // ...and leave no dead listener behind (regression: once() previously
  // replayed into its self-removing wrapper before the wrapper was
  // registered, so the self-removal was a no-op and the wrapper stuck
  // around permanently, inert).
  assert.equal(siteStream.listenerCount("live_status"), 0);

  // A later live event must not re-fire the already-satisfied once().
  siteStream.emit("live_status", {
    createdAt: "2026-01-01T00:00:01.000Z",
    site_id: siteId,
    live_status: { battery_power: 999 },
  });
  assert.deepEqual(received, [{ battery_power: 4 }]);
});

test("emits energy_totals on the stream and the scoped energy site, routed by id not site_id", async () => {
  const siteId = "5150";
  const totals = makeTotals({ total_home_usage: 12, total_solar_generation: 34 });
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        id: siteId,
        totals,
      },
    ]),
  );

  const siteStream = teslemetry.sse.getEnergySite(siteId);

  const streamTotals: unknown[] = [];
  const siteTotals: unknown[] = [];
  teslemetry.sse.on("energy_totals", (event) => streamTotals.push(event.totals));
  siteStream.on("energy_totals", (event) => siteTotals.push(event.totals));

  await teslemetry.sse.connect();
  await waitFor(() => siteTotals.length > 0);
  teslemetry.sse.disconnect();

  assert.deepEqual(streamTotals, [totals]);
  assert.deepEqual(siteTotals, [totals]);
});

test("startLocalCache replays a cached energy_totals event to new listeners", async () => {
  const siteId = "43";
  const totals = makeTotals({ total_home_usage: 7 });
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        id: siteId,
        totals,
      },
    ]),
  );

  await teslemetry.sse.connect();
  await waitFor(() => teslemetry.sse.energyCache[siteId]?.energy_totals !== undefined);
  teslemetry.sse.disconnect();

  const replayed: unknown[] = [];
  const siteStream = teslemetry.sse.getEnergySite(siteId);
  siteStream.on("energy_totals", (event) => replayed.push(event.totals));

  assert.deepEqual(replayed, [totals]);
});

test("once() on a cached energy_totals event fires exactly once and does not leak a dead listener", async () => {
  const siteId = "9";
  const totals = makeTotals({ total_home_usage: 1 });
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        id: siteId,
        totals,
      },
    ]),
  );

  await teslemetry.sse.connect();
  await waitFor(() => teslemetry.sse.energyCache[siteId]?.energy_totals !== undefined);
  teslemetry.sse.disconnect();

  const siteStream = teslemetry.sse.getEnergySite(siteId);
  const received: unknown[] = [];
  siteStream.once("energy_totals", (event) => received.push(event.totals));

  assert.deepEqual(received, [totals]);
  assert.equal(siteStream.listenerCount("energy_totals"), 0);

  siteStream.emit("energy_totals", {
    createdAt: "2026-01-01T00:00:01.000Z",
    id: siteId,
    totals: makeTotals({ total_home_usage: 999 }),
  });
  assert.deepEqual(received, [totals]);
});

test("emits tariff_content_v2 on the stream and the scoped energy site", async () => {
  const siteId = "555";
  const tariff = { code: "PGE-EV2-A" };
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        tariff_content_v2: tariff,
      },
    ]),
  );

  const siteStream = teslemetry.sse.getEnergySite(siteId);
  const streamTariffs: unknown[] = [];
  const siteTariffs: unknown[] = [];
  teslemetry.sse.on("tariff_content_v2", (event) =>
    streamTariffs.push(event.tariff_content_v2),
  );
  siteStream.on("tariff_content_v2", (event) =>
    siteTariffs.push(event.tariff_content_v2),
  );

  await teslemetry.sse.connect();
  await waitFor(() => siteTariffs.length > 0);
  teslemetry.sse.disconnect();

  assert.deepEqual(streamTariffs, [tariff]);
  assert.deepEqual(siteTariffs, [tariff]);
});

test("a null tariff_content_v2 body is the explicit removal signal and is cached/replayed as null, not skipped", async () => {
  const siteId = "556";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        tariff_content_v2: null,
      },
    ]),
  );

  await teslemetry.sse.connect();
  await waitFor(
    () => teslemetry.sse.energyCache[siteId]?.tariff_content_v2 !== undefined,
  );
  teslemetry.sse.disconnect();

  assert.equal(teslemetry.sse.energyCache[siteId].tariff_content_v2, null);

  const replayed: unknown[] = [];
  const siteStream = teslemetry.sse.getEnergySite(siteId);
  siteStream.on("tariff_content_v2", (event) =>
    replayed.push(event.tariff_content_v2),
  );
  assert.deepEqual(replayed, [null]);
});

test("once() on a cached tariff_content_v2 event fires exactly once and does not leak a dead listener", async () => {
  const siteId = "557";
  const tariff = { code: "PGE-EV2-A" };
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        tariff_content_v2: tariff,
      },
    ]),
  );

  await teslemetry.sse.connect();
  await waitFor(
    () => teslemetry.sse.energyCache[siteId]?.tariff_content_v2 !== undefined,
  );
  teslemetry.sse.disconnect();

  const siteStream = teslemetry.sse.getEnergySite(siteId);
  const received: unknown[] = [];
  siteStream.once("tariff_content_v2", (event) =>
    received.push(event.tariff_content_v2),
  );

  assert.deepEqual(received, [tariff]);
  assert.equal(siteStream.listenerCount("tariff_content_v2"), 0);

  siteStream.emit("tariff_content_v2", {
    createdAt: "2026-01-01T00:00:01.000Z",
    site_id: siteId,
    tariff_content_v2: { code: "OTHER" },
  });
  assert.deepEqual(received, [tariff]);
});

test("siteInfoDocument composes the cached slim site_info with the last tariff_content_v2 piece", async () => {
  const siteId = "558";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        site_info: { site_name: "Home" },
      },
      {
        createdAt: "2026-01-01T00:00:01.000Z",
        site_id: siteId,
        tariff_content_v2: { code: "PGE-EV2-A" },
      },
    ]),
  );

  const siteStream = teslemetry.sse.getEnergySite(siteId);

  await teslemetry.sse.connect();
  await waitFor(
    () => teslemetry.sse.energyCache[siteId]?.tariff_content_v2 !== undefined,
  );
  teslemetry.sse.disconnect();

  assert.deepEqual(siteStream.siteInfoDocument, {
    site_name: "Home",
    tariff_content_v2: { code: "PGE-EV2-A" },
  });
});

test("siteInfoDocument omits tariff_content_v2 until a tariff event has been cached, and is undefined before site_info arrives", async () => {
  const siteId = "559";
  const teslemetry = makeTeslemetry(async () =>
    sseResponse([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        site_id: siteId,
        site_info: { site_name: "Home" },
      },
    ]),
  );

  const siteStream = teslemetry.sse.getEnergySite(siteId);
  assert.equal(siteStream.siteInfoDocument, undefined);

  await teslemetry.sse.connect();
  await waitFor(() => teslemetry.sse.energyCache[siteId]?.site_info !== undefined);
  teslemetry.sse.disconnect();

  assert.deepEqual(siteStream.siteInfoDocument, { site_name: "Home" });
});

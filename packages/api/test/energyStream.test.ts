import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

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

  const siteStream = teslemetry.sse.getSite(siteId);

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
  const siteStream = teslemetry.sse.getSite(siteId);

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
  const siteStream = teslemetry.sse.getSite(siteId);
  siteStream.on("live_status", (event) => replayed.push(event.live_status));

  assert.deepEqual(replayed, [{ battery_power: 5 }]);
});

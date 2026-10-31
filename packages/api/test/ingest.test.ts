import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import type { SseData } from "../src/const.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const vin = "5YJSA1E14FF000000";

function makeTeslemetry(
  options: { cache?: boolean; vin?: string } = {},
): { teslemetry: Teslemetry; fetches: string[] } {
  const fetches: string[] = [];
  const teslemetry = new Teslemetry(async () => "token", {
    region: "na",
    logger: silentLogger,
    stream: options,
  });
  teslemetry.client.setConfig({
    fetch: (async (request: Request) => {
      fetches.push(new URL(request.url).pathname);
      return new Response(JSON.stringify({ updated_vehicles: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
  });
  return { teslemetry, fetches };
}

test("an ingested event reaches data listeners and onSignal like a native event, with no connection", async () => {
  const { teslemetry, fetches } = makeTeslemetry();
  const vehicle = teslemetry.sse.getVehicle(vin);

  const rootEvents: SseData[] = [];
  const allEvents: unknown[] = [];
  const vehicleEvents: SseData[] = [];
  const gears: unknown[] = [];
  teslemetry.sse.on("data", (event) => rootEvents.push(event));
  teslemetry.sse.on("all", (event) => allEvents.push(event));
  vehicle.on("data", (event) => vehicleEvents.push(event));
  const off = vehicle.onSignal("Gear", (value) => gears.push(value));

  const returned = teslemetry.sse.ingest(
    { Gear: "ShiftStateD", VehicleSpeed: 12 },
    vin,
    { source: "ble" },
    "2026-01-01T00:00:00.000Z",
  );

  const expected = {
    source: "ble",
    vin,
    data: { Gear: "ShiftStateD", VehicleSpeed: 12 },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  assert.deepEqual(returned, expected);
  assert.deepEqual(rootEvents, [expected]);
  assert.deepEqual(allEvents, [expected]);
  assert.deepEqual(vehicleEvents, [expected]);
  assert.deepEqual(gears, ["ShiftStateD"]);
  assert.equal(teslemetry.sse.connected, false);
  assert.equal(teslemetry.sse.active, false);
  // Only the onSignal field-config update hit the network, never /sse.
  off();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.ok(fetches.every((path) => !path.startsWith("/sse")));
});

test("TeslemetryVehicleStream.ingest targets its own vin and defaults createdAt", () => {
  const { teslemetry } = makeTeslemetry();
  const vehicle = teslemetry.sse.getVehicle(vin);
  const events: SseData[] = [];
  vehicle.on("data", (event) => events.push(event));

  const before = Date.now();
  vehicle.ingest({ Soc: 80 });

  assert.equal(events.length, 1);
  assert.equal(events[0].vin, vin);
  assert.deepEqual(events[0].data, { Soc: 80 });
  assert.ok(Date.parse(events[0].createdAt) >= before - 1);
});

test("metadata cannot override the core wire fields", () => {
  const { teslemetry } = makeTeslemetry();
  const event = teslemetry.sse.ingest({ Soc: 1 }, vin, {
    vin: "OTHER",
    data: {},
    createdAt: "bogus",
  });
  assert.equal(event.vin, vin);
  assert.deepEqual(event.data, { Soc: 1 });
  assert.notEqual(event.createdAt, "bogus");
});

test("ingest updates the local cache like a native event and replays it", () => {
  const { teslemetry } = makeTeslemetry();
  teslemetry.sse.ingest({ Soc: 50, Gear: "ShiftStateP" }, vin);
  teslemetry.sse.ingest({ Soc: 51 }, vin);
  assert.deepEqual(teslemetry.sse.cache[vin].data, {
    Soc: 51,
    Gear: "ShiftStateP",
  });

  const replayed: unknown[] = [];
  teslemetry.sse.getVehicle(vin).onSignal("Gear", (v) => replayed.push(v));
  assert.deepEqual(replayed, ["ShiftStateP"]);
});

test("ingest skips the cache when the local cache is disabled", () => {
  const { teslemetry } = makeTeslemetry({ cache: false });
  const events: SseData[] = [];
  teslemetry.sse.on("data", (event) => events.push(event));
  teslemetry.sse.ingest({ Soc: 50 }, vin);
  assert.equal(events.length, 1);
  assert.equal(teslemetry.sse.cache[vin], undefined);
});

test("ingest defaults to the stream's vin option and throws without one", () => {
  const scoped = makeTeslemetry({ vin }).teslemetry;
  assert.equal(scoped.sse.ingest({ Soc: 1 }).vin, vin);

  const unscoped = makeTeslemetry().teslemetry;
  assert.throws(() => unscoped.sse.ingest({ Soc: 1 }), /requires a vin/);
});

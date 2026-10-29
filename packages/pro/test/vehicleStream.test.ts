import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import type { Logger } from "../src/logger.js";

function makeTeslemetry(
  fetchImpl: (request: Request) => Promise<Response>,
  logger: Logger,
): Teslemetry {
  const teslemetry = new Teslemetry(async () => "token", {
    region: "na",
    logger,
  });
  teslemetry.client.setConfig({ fetch: fetchImpl as typeof fetch });
  return teslemetry;
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

test("logs the VIN and full error when a streaming field update fails, not a bare message", async () => {
  const vin = "5YJSA1E14FF000000";
  const errorLogs: unknown[][] = [];
  const logger: Logger = {
    info: () => {},
    warn: () => {},
    debug: () => {},
    error: (message, ...args) => errorLogs.push([message, ...args]),
  };

  const teslemetry = makeTeslemetry(async (request) => {
    if (request.url.includes(`/api/config/${vin}`)) {
      // A generic API 404 body, as returned when the config route/VIN
      // isn't found: a plain object with a "message" field, not an Error.
      return new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, logger);

  const vehicleStream = teslemetry.sse.getVehicle(vin);
  vehicleStream.onSignal("VehicleSpeed", () => {});

  await waitFor(() => errorLogs.length > 0, 3000);

  // The first log is from the batch flush itself, not from a per-signal
  // caller: it must name the VIN it failed for rather than repeating the
  // bare API error text with no context.
  const [message] = errorLogs[0];
  assert.match(String(message), new RegExp(vin));
  assert.notEqual(String(message), "Not Found");
});

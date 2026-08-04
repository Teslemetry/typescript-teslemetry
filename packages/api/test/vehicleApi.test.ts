import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import type { Logger } from "../src/logger.js";
import type { VehicleDataEndpoints } from "../src/TeslemetryVehicleApi.js";

// Endpoints documented in the generated client's
// GetApi1VehiclesByVinVehicleDataData query.endpoints comment (types.gen.ts).
type GeneratedVehicleDataEndpoint =
  | "charge_state"
  | "climate_state"
  | "closures_state"
  | "drive_state"
  | "gui_settings"
  | "location_data"
  | "charge_schedule_data"
  | "preconditioning_schedule_data"
  | "vehicle_config"
  | "vehicle_state";

// Fails to typecheck if VehicleDataEndpoints drops any endpoint the generated client documents.
const generatedEndpoints: VehicleDataEndpoints[] = [
  "charge_state",
  "climate_state",
  "closures_state",
  "drive_state",
  "gui_settings",
  "location_data",
  "charge_schedule_data",
  "preconditioning_schedule_data",
  "vehicle_config",
  "vehicle_state",
] satisfies GeneratedVehicleDataEndpoint[];

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

test("speedLimitClearPinAdmin sends a JSON body, not an empty request", async () => {
  const vin = "5YJSA1E14FF000000";
  let receivedContentType: string | null | undefined;
  let receivedBody: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedContentType = request.headers.get("Content-Type");
    receivedBody = await request.text();
    return new Response(JSON.stringify({ response: { result: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  await teslemetry.vehicle(vin).speedLimitClearPinAdmin();

  // Sending no body strips the Content-Type header client-side, which the
  // Fleet API rejects for this endpoint even though every body field is optional.
  assert.equal(receivedContentType, "application/json");
  assert.equal(receivedBody, "{}");
});

test("VehicleDataEndpoints covers every endpoint the generated client documents", () => {
  assert.equal(generatedEndpoints.length, 10);
});

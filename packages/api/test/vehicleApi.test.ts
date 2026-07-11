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

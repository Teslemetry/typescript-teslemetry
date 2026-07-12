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

test("setTimeOfUseSettings posts the tou_settings body to the site's time_of_use_settings endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({ response: { code: 200, message: "Updated" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const touSettings = {
    tariff_content_v2: {
      code: "PGE-EV2-A",
      utility: "PG&E",
      currency: "USD",
    },
  };

  const result = await teslemetry
    .energySite(siteId)
    .setTimeOfUseSettings({ tou_settings: touSettings });

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/time_of_use_settings$`),
  );
  assert.deepEqual(receivedBody, { tou_settings: touSettings });
  assert.deepEqual(result, { response: { code: 200, message: "Updated" } });
});

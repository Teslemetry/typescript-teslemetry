import { test } from "node:test";
import assert from "node:assert/strict";
import { TeslemetryVehicle } from "../src/nodes/TeslemetryVehicle.node.js";
import { TeslemetryEnergy } from "../src/nodes/TeslemetryEnergy.node.js";
import { TeslemetryTrigger } from "../src/nodes/TeslemetryTrigger.node.js";

// Minimal ILoadOptionsFunctions stand-in: these loadOptions methods only use getCredentials.
const fakeLoadOptionsContext = {
  getCredentials: async () => ({ accessToken: "token" }),
} as never;

function withMockedFetch<T>(
  handler: (request: Request) => Promise<Response> | Response,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(new Request(input, init))) as typeof fetch;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

test("TeslemetryVehicle.getVins calls a real TeslemetryApi method (regression: api.vehicles() is not a function)", async () => {
  const node = new TeslemetryVehicle();
  const options = await withMockedFetch(
    () =>
      new Response(
        JSON.stringify({
          response: [{ vin: "5YJSA1E14FF000000", display_name: "My Tesla" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    () => node.methods.loadOptions.getVins.call(fakeLoadOptionsContext),
  );

  assert.deepEqual(options, [
    { name: "My Tesla (5YJSA1E14FF000000)", value: "5YJSA1E14FF000000" },
  ]);
});

test("TeslemetryEnergy.getSites calls a real TeslemetryApi method (regression: api.products() is not a function)", async () => {
  const node = new TeslemetryEnergy();
  const options = await withMockedFetch(
    () =>
      new Response(
        JSON.stringify({
          response: [
            { energy_site_id: 123, site_name: "Home", resource_type: "battery" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    () => node.methods.loadOptions.getSites.call(fakeLoadOptionsContext),
  );

  assert.deepEqual(options, [{ name: "Home (123)", value: 123 }]);
});

test("TeslemetryTrigger.getVins calls a real TeslemetryApi method (regression: api.vehicles() is not a function)", async () => {
  const node = new TeslemetryTrigger();
  const options = await withMockedFetch(
    () =>
      new Response(
        JSON.stringify({
          response: [{ vin: "5YJSA1E14FF000000", display_name: "My Tesla" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    () => node.methods.loadOptions.getVins.call(fakeLoadOptionsContext),
  );

  assert.deepEqual(options, [
    { name: "All Vehicles", value: "" },
    { name: "My Tesla (5YJSA1E14FF000000)", value: "5YJSA1E14FF000000" },
  ]);
});

test("TeslemetryTrigger.getFields calls a real TeslemetryApi method (regression: api.fields() is not a function)", async () => {
  const node = new TeslemetryTrigger();
  const options = await withMockedFetch(
    () =>
      new Response(JSON.stringify({ Soc: { type: "int" }, Locked: { type: "bool" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    () => node.methods.loadOptions.getFields.call(fakeLoadOptionsContext),
  );

  assert.deepEqual(options, [
    { name: "Soc", value: "Soc" },
    { name: "Locked", value: "Locked" },
  ]);
});

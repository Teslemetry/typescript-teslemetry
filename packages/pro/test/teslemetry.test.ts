import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry, useTeslaModel } from "../src/Teslemetry.js";

test("response interceptor does not log the access token from the response URL", async () => {
  const logged: string[] = [];
  const teslemetry = new Teslemetry("fake-access-token", {
    logger: {
      debug: (...args: unknown[]) => logged.push(args.join(" ")),
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  const responseInterceptor = teslemetry.client.interceptors.response.fns[0];
  assert.ok(responseInterceptor);

  const fakeResponse = {
    url: "https://api.teslemetry.pro/api/1/vehicles?token=super-secret-fake-token-value",
    status: 200,
    headers: new Headers(),
  };

  await responseInterceptor(fakeResponse as never, {} as never, {} as never);

  assert.ok(logged.length > 0);
  for (const line of logged) {
    assert.ok(
      !line.includes("token") && !line.includes("secret"),
      `logged line leaked query string: ${line}`,
    );
  }
});

test("useTeslaModel decodes the 4th VIN character to a model name", () => {
  assert.equal(useTeslaModel("5YJ3E1EA1KF000000"), "Model 3");
  assert.equal(useTeslaModel("5YJSA1E11KF000000"), "Model S");
  assert.equal(useTeslaModel("5YJXA1E11KF000000"), "Model X");
  assert.equal(useTeslaModel("5YJYGDEE1LF000000"), "Model Y");
  assert.equal(useTeslaModel("7SACGDEE1PF000000"), "Cybertruck");
  assert.equal(useTeslaModel("7SATGDEE1PF000000"), "Semi");
  assert.equal(useTeslaModel("7SAAGDEE1PF000000"), "Cybercab");
  assert.equal(useTeslaModel("0000000000000000"), "Unknown");
});

const product = (fields: Record<string, unknown>) => ({
  customer: "q3V1d8sXbE2mJ0kZp4R7aA",
  granted_at: "2026-10-05T00:00:00.000Z",
  ref: null,
  available: true,
  access: "allowed",
  ...fields,
});

test("createProducts falls back when the api sends an empty product name", async (t) => {
  // The api sends "" for a product without a name, not null.
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      response: [
        product({ type: "vehicle", vin: "5YJ3E1EA1KF000000", name: "" }),
        product({ type: "vehicle", vin: "7SACGDEE1PF000000", name: "Pearl" }),
        product({ type: "energy", energy_site_id: 1234567890, name: "" }),
      ],
      count: 3,
      next_cursor: null,
    }),
  );
  const teslemetry = new Teslemetry("fake-access-token", {
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  });

  const { vehicles, energySites } = await teslemetry.createProducts();

  assert.equal(vehicles["5YJ3E1EA1KF000000"].name, "Model 3");
  assert.equal(vehicles["7SACGDEE1PF000000"].name, "Pearl");
  assert.equal(energySites["1234567890"].name, "Unnamed");
});

test("createProducts follows next_cursor across every page", async (t) => {
  const cursors: (string | null)[] = [];
  t.mock.method(globalThis, "fetch", async (request: Request) => {
    const url = new URL(request.url);
    assert.equal(url.pathname, "/api/business/products");
    cursors.push(url.searchParams.get("cursor"));
    return url.searchParams.get("cursor") === "page2"
      ? Response.json({
          response: [product({ type: "energy", energy_site_id: 42, name: "Home" })],
          count: 2,
          next_cursor: null,
        })
      : Response.json({
          response: [product({ type: "vehicle", vin: "5YJ3E1EA1KF000000", name: "Sonic" })],
          count: 2,
          next_cursor: "page2",
        });
  });
  const teslemetry = new Teslemetry("fake-access-token", {
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  });

  const { vehicles, energySites } = await teslemetry.createProducts();

  assert.deepEqual(cursors, [null, "page2"]);
  assert.equal(vehicles["5YJ3E1EA1KF000000"].name, "Sonic");
  assert.equal(energySites["42"].name, "Home");
});

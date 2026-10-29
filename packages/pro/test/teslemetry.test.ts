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

const quietLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

test("a stream vin option creates that vehicle's stream during construction", () => {
  const teslemetry = new Teslemetry("fake-access-token", {
    logger: quietLogger,
    stream: { vin: "5YJ3E1EA1KF000000" },
  });

  assert.ok(teslemetry.sse.vehicles.has("5YJ3E1EA1KF000000"));
});

test("getRegion returns null for a missing or unrecognized x-region header", async (t) => {
  const regions = [null, "us"];
  t.mock.method(globalThis, "fetch", async () => {
    const region = regions.shift();
    return Response.json(
      { response: [], count: 0, next_cursor: null },
      { headers: region ? { "x-region": region } : {} },
    );
  });

  for (let i = 0; i < 2; i++) {
    const teslemetry = new Teslemetry("fake-access-token", { logger: quietLogger });
    assert.equal(await teslemetry.getRegion(), null);
    assert.equal(teslemetry.region, null);
  }
});

test("getRegion accepts a recognized x-region header", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ response: [], count: 0, next_cursor: null }, { headers: { "x-region": "eu" } }),
  );
  const teslemetry = new Teslemetry("fake-access-token", { logger: quietLogger });

  assert.equal(await teslemetry.getRegion(), "eu");
});

test("getConfig uses the root client and logs a 404 instead of throwing", async (t) => {
  const requested: string[] = [];
  t.mock.method(globalThis, "fetch", async (request: Request) => {
    requested.push(new URL(request.url).origin);
    return Response.json({ error: "not found" }, { status: 404 });
  });
  const warnings: string[] = [];
  const teslemetry = new Teslemetry("fake-access-token", {
    region: "eu",
    logger: { ...quietLogger, warn: (message: string) => warnings.push(message) },
  });

  await teslemetry.sse.getVehicle("5YJ3E1EA1KF000000").getConfig();

  assert.deepEqual(requested, ["https://eu.teslemetry.pro"]);
  assert.deepEqual(warnings, ["Config for VIN 5YJ3E1EA1KF000000 not found (404)."]);
});

test("vehicle() and energySite() reuse an instance registered earlier", () => {
  const teslemetry = new Teslemetry("fake-access-token");
  const vin = "5YJ3E1EA1KF000000";

  const registered = teslemetry.api.getVehicle(vin);
  assert.equal(teslemetry.vehicle(vin), registered);
  assert.equal(teslemetry.vehicle(vin), teslemetry.getVehicle(vin).api);

  const site = teslemetry.api.getEnergySite(12345);
  assert.equal(teslemetry.energySite(12345), site);
});

test("X-Library identifies @teslemetry/pro", async () => {
  const teslemetry = new Teslemetry("fake-access-token", { region: "na" });
  let sent: string | null = null;
  teslemetry.client.setConfig({
    fetch: (async (request: Request) => {
      sent = request.headers.get("X-Library");
      return new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch,
  });
  await teslemetry.api.getProducts();
  assert.match(sent ?? "", /^typescript teslemetry-pro \d/);
});

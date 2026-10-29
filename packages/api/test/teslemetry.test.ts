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
    url: "https://api.teslemetry.com/api/1/vehicles?token=super-secret-fake-token-value",
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

test("createProducts falls back when the api sends an empty product name", async (t) => {
  // The api sends "" for a product without a name, not null.
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      vehicles: {
        "5YJ3E1EA1KF000000": { name: "" },
        "7SACGDEE1PF000000": { name: "Pearl" },
      },
      energy_sites: { "1234567890": { name: "" } },
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

  assert.deepEqual(requested, ["https://eu.teslemetry.com"]);
  assert.deepEqual(warnings, ["Config for VIN 5YJ3E1EA1KF000000 not found (404)."]);
});

test("vehicle() and energySite() return the already registered instance", () => {
  const teslemetry = new Teslemetry("fake-access-token");
  const registeredVehicle = teslemetry.getVehicle("5YJ3E1EA1KF000000").api;
  const registeredSite = teslemetry.getEnergySite(12345).api;

  assert.equal(teslemetry.vehicle("5YJ3E1EA1KF000000"), registeredVehicle);
  assert.equal(teslemetry.energySite(12345), registeredSite);
  // Repeated calls must not throw "already exists" either.
  assert.equal(teslemetry.vehicle("5YJ3E1EA1KF000000"), registeredVehicle);
  assert.equal(teslemetry.energySite(12345), registeredSite);
});

test("vehicle() and energySite() create the product when it is not registered yet", () => {
  const teslemetry = new Teslemetry("fake-access-token");

  assert.equal(
    teslemetry.vehicle("5YJ3E1EA1KF000001"),
    teslemetry.getVehicle("5YJ3E1EA1KF000001").api,
  );
  assert.equal(teslemetry.energySite(678), teslemetry.getEnergySite(678).api);
});

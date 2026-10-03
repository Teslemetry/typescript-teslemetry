import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import { isBusinessKey } from "../src/business.js";
import {
  BusinessAuthUnavailableError,
  BusinessProductNotConsentedError,
  BusinessRouteNotAllowedError,
  TeslemetryBusinessError,
} from "../src/exceptions.js";
import type { TeslemetryStreamErrorEvent } from "../src/TeslemetryStream.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const KEY = "sk_live_example";
const VIN_NA = "5YJ3E1EA1JF000001";
const VIN_EU = "5YJ3E1EA1JF000002";
const SITE_EU = "1234567";

const PRODUCTS = [
  {
    product_type: "vehicle",
    product_id: VIN_NA,
    region: "NA",
    customer: { id: "c1", ref: "acct-1" },
    granted_at: "2026-10-01T00:00:00.000Z",
  },
  {
    product_type: "vehicle",
    product_id: VIN_EU,
    region: "EU",
    customer: { id: "c2", ref: null },
    granted_at: "2026-10-01T00:00:01.000Z",
  },
  {
    product_type: "energy",
    product_id: SITE_EU,
    region: "EU",
    customer: { id: "c2", ref: null },
    granted_at: "2026-10-01T00:00:02.000Z",
  },
];

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function makeBusiness(
  fetchImpl: (request: Request) => Promise<Response>,
): Teslemetry {
  const teslemetry = new Teslemetry(KEY, { logger: silentLogger });
  teslemetry.client.setConfig({ fetch: fetchImpl as typeof fetch });
  return teslemetry;
}

/** An SSE response that sends `chunks`, then stays open until aborted. */
function openStream(chunks: string[] = ["retry: 1000\n\n"]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

async function waitFor(condition: () => boolean, attempts = 300): Promise<void> {
  for (let i = 0; !condition(); i++) {
    if (i >= attempts) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("isBusinessKey matches the api's sk_ shape and nothing else", () => {
  assert.equal(isBusinessKey("sk_live_abc"), true);
  assert.equal(isBusinessKey("sk_test_abc.def"), false);
  assert.equal(isBusinessKey("abc123"), false);
});

test("a business key turns on business mode; a consumer token does not", () => {
  assert.equal(new Teslemetry(KEY, { logger: silentLogger }).isBusiness, true);
  assert.equal(new Teslemetry("token", { logger: silentLogger }).isBusiness, false);
  const fromCallback = new Teslemetry(async () => KEY, {
    logger: silentLogger,
    business: true,
  });
  assert.equal(fromCallback.isBusiness, true);
});

test("products() lists consented products and routes each product to its region host", async () => {
  const requests: Request[] = [];
  const teslemetry = makeBusiness(async (request) => {
    requests.push(request);
    if (new URL(request.url).pathname === "/api/business/products") {
      return json({ response: PRODUCTS }, 200, { "x-region": "na" });
    }
    return json({ response: { vin: VIN_EU } }, 200, { "x-region": "eu" });
  });

  const { response } = await teslemetry.business.products();
  assert.equal(response.length, 3);
  assert.equal(teslemetry.business.regions.get(VIN_EU), "eu");
  assert.equal(teslemetry.business.regions.get(SITE_EU), "eu");

  await teslemetry.api.getVehicle(VIN_EU).state();

  const [listing, vehicle] = requests;
  assert.equal(listing.url, "https://api.teslemetry.com/api/business/products");
  assert.equal(listing.headers.get("Authorization"), `Bearer ${KEY}`);
  // The key goes only in the header, never in the URL.
  assert.equal(new URL(vehicle.url).searchParams.has("token"), false);
  assert.equal(new URL(vehicle.url).hostname, "eu.teslemetry.com");
  assert.equal(vehicle.headers.get("Authorization"), `Bearer ${KEY}`);
  // A business response's x-region never pins the whole client.
  assert.equal(teslemetry.region, null);
});

test("business.createProducts() builds vehicle and energy site instances", async () => {
  const teslemetry = makeBusiness(async () => json({ response: PRODUCTS }));
  const { vehicles, energySites } = await teslemetry.business.createProducts();
  assert.deepEqual(Object.keys(vehicles), [VIN_NA, VIN_EU]);
  assert.equal(vehicles[VIN_NA].product.customer.ref, "acct-1");
  assert.equal(vehicles[VIN_NA].name, "Model 3");
  assert.equal(energySites[SITE_EU].id, Number(SITE_EU));
  assert.equal(teslemetry.sse.vehicles.has(VIN_EU), true);
  assert.equal(teslemetry.sse.energySites.has(SITE_EU), true);
});

test("createProducts() refuses a business key instead of calling /api/metadata", async () => {
  let fetches = 0;
  const teslemetry = makeBusiness(async () => {
    fetches++;
    return json({});
  });
  await assert.rejects(teslemetry.createProducts(), BusinessRouteNotAllowedError);
  assert.equal(fetches, 0);
});

test("business error codes are thrown as typed errors", async () => {
  const teslemetry = makeBusiness(async () =>
    json(
      {
        response: null,
        error: "business_product_not_consented",
        error_description: "No customer has shared this product with this business",
      },
      403,
    ),
  );
  await assert.rejects(teslemetry.api.getVehicle(VIN_NA).state(), (error) => {
    assert.ok(error instanceof BusinessProductNotConsentedError);
    assert.ok(error instanceof TeslemetryBusinessError);
    assert.equal(error.code, "business_product_not_consented");
    assert.equal(error.status, 403);
    return true;
  });
});

test("business_auth_unavailable carries Retry-After", async () => {
  const teslemetry = makeBusiness(async () =>
    json(
      { response: null, error: "business_auth_unavailable", error_description: "retry" },
      503,
      { "Retry-After": "5" },
    ),
  );
  await assert.rejects(teslemetry.business.products(), (error) => {
    assert.ok(error instanceof BusinessAuthUnavailableError);
    assert.equal(error.retryAfter, 5);
    return true;
  });
});

test("other errors are unchanged", async () => {
  const body = { response: null, error: "subscription_required" };
  const teslemetry = new Teslemetry("token", { region: "na", logger: silentLogger });
  teslemetry.client.setConfig({ fetch: (async () => json(body, 402)) as typeof fetch });
  await assert.rejects(teslemetry.api.getVehicle(VIN_NA).state(), (error) => {
    assert.deepEqual(error, body);
    return true;
  });
});

test("a business key streams each product on its own region host, never the account-wide /sse", async () => {
  const streamUrls: string[] = [];
  const teslemetry = makeBusiness(async (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/business/products") return json({ response: PRODUCTS });
    streamUrls.push(`${url.hostname}${url.pathname}`);
    const id = url.pathname.split("/")[2];
    return openStream([
      "retry: 1000\n\n",
      `data: ${JSON.stringify({ createdAt: "2026-10-03T00:00:00.000", vin: id, state: "online" })}\n\n`,
    ]);
  });

  await teslemetry.business.createProducts();
  const states: string[] = [];
  teslemetry.sse.getVehicle(VIN_EU).on("state", (event) => states.push(event.vin));
  let connects = 0;
  teslemetry.sse.on("connect", () => connects++);

  await teslemetry.sse.connect();
  await waitFor(() => streamUrls.length === 3 && states.length > 0);

  assert.deepEqual(streamUrls.sort(), [
    `eu.teslemetry.com/sse/${SITE_EU}`,
    `eu.teslemetry.com/sse/${VIN_EU}`,
    `na.teslemetry.com/sse/${VIN_NA}`,
  ]);
  assert.deepEqual(states, [VIN_EU]);
  assert.equal(teslemetry.sse.connected, true);
  assert.equal(connects, 1);

  // A product added while connected gets its own stream.
  teslemetry.sse.getVehicle("5YJ3E1EA1JF000009");
  await waitFor(() => streamUrls.length === 4);
  assert.equal(streamUrls[3], "api.teslemetry.com/sse/5YJ3E1EA1JF000009");

  await teslemetry.sse.close();
  assert.equal(teslemetry.sse.connected, false);
});

test("a product refusal stops only that product's stream", async () => {
  const fetchedIds: string[] = [];
  const teslemetry = makeBusiness(async (request) => {
    const id = new URL(request.url).pathname.split("/")[2];
    fetchedIds.push(id);
    if (id === VIN_EU) {
      return json(
        { response: null, error: "business_product_not_consented", error_description: "no" },
        403,
      );
    }
    return openStream();
  });
  teslemetry.sse.getVehicle(VIN_NA);
  teslemetry.sse.getVehicle(VIN_EU);

  const streamErrors: TeslemetryStreamErrorEvent[] = [];
  teslemetry.sse.on("stream_error", (event) => streamErrors.push(event));
  let authFailures = 0;
  teslemetry.sse.on("auth_failure", () => authFailures++);

  await teslemetry.sse.connect();
  await waitFor(() => streamErrors.length === 1 && teslemetry.sse.connected);
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(streamErrors[0].id, VIN_EU);
  assert.ok(streamErrors[0].error instanceof BusinessProductNotConsentedError);
  assert.equal(authFailures, 0);
  assert.equal(fetchedIds.filter((id) => id === VIN_EU).length, 1);
  assert.equal(teslemetry.sse.active, true);
  assert.equal(teslemetry.sse.connected, true);

  await teslemetry.sse.close();
});

test("a rejected business key stops every product stream with one auth_failure", async () => {
  let fetches = 0;
  const teslemetry = makeBusiness(async () => {
    fetches++;
    return json({ response: null, error: "invalid_token" }, 401);
  });
  teslemetry.sse.getVehicle(VIN_NA);
  teslemetry.sse.getVehicle(VIN_EU);
  let authFailures = 0;
  teslemetry.sse.on("auth_failure", () => authFailures++);

  await teslemetry.sse.connect();
  await waitFor(() => !teslemetry.sse.active);
  await teslemetry.sse.close();

  assert.equal(authFailures, 1);
  assert.ok(fetches <= 4);
});

test("the api's planned end of a business stream reconnects quickly without a disconnect", async (t) => {
  // Each Date.now() call moves a minute on, so any stream looks old enough
  // to be the api's 5-minute planned end.
  let now = 0;
  t.mock.method(Date, "now", () => (now += 61_000));

  let fetches = 0;
  const teslemetry = makeBusiness(async () => {
    fetches++;
    // The first stream ends cleanly; the reconnect stays open.
    return fetches === 1 ? new Response("retry: 1000\n\n", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    }) : openStream();
  });
  teslemetry.sse.getVehicle(VIN_NA);

  let disconnects = 0;
  let streamErrors = 0;
  teslemetry.sse.on("disconnect", () => disconnects++);
  teslemetry.sse.on("stream_error", () => streamErrors++);

  await teslemetry.sse.connect();
  await waitFor(() => fetches === 2);

  assert.equal(disconnects, 0);
  assert.equal(streamErrors, 0);
  assert.equal(teslemetry.sse.connected, true);

  mock.restoreAll();
  await teslemetry.sse.close();
});

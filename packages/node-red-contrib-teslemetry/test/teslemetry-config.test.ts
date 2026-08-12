import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  createProductsFetcher,
  PRODUCTS_RETRY_DELAY_MS,
  testCredentials,
} from "../src/nodes/teslemetry-config.js";
import type { Instance } from "../src/shared.js";
import type { Products, Teslemetry } from "@teslemetry/api";

function createFakeTeslemetryClient(
  status: number | undefined,
  apiTest: () => Promise<unknown>,
): Pick<Teslemetry, "client" | "api"> {
  let responseFn: ((response: unknown) => unknown) | undefined;
  return {
    client: {
      interceptors: {
        response: {
          use: (fn: (response: unknown) => unknown) => {
            responseFn = fn;
          },
        },
      },
    } as any,
    api: {
      test: async () => {
        responseFn?.({ status });
        return apiTest();
      },
    } as any,
  };
}

function createFakeInstance(createProducts: () => Promise<Products>): Instance {
  return {
    teslemetry: { createProducts } as any,
    products: Promise.resolve({ vehicles: {}, energySites: {} }),
    error: undefined,
  };
}

test("a failed products fetch records the error and a later retry clears it", async () => {
  let calls = 0;
  const instance = createFakeInstance(() => {
    calls += 1;
    if (calls === 1) {
      return Promise.reject(new Error("invalid token"));
    }
    return Promise.resolve({
      vehicles: { v1: { name: "My Car" } },
      energySites: {},
    } as unknown as Products);
  });

  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const stop = createProductsFetcher({ error() {} }, instance);
    await instance.products;
    assert.equal(instance.error, "invalid token");

    mock.timers.tick(PRODUCTS_RETRY_DELAY_MS);
    await instance.products;

    assert.equal(instance.error, undefined);
    assert.equal(calls, 2);
    const { vehicles } = await instance.products;
    assert.deepEqual(vehicles, { v1: { name: "My Car" } });

    stop();
  } finally {
    mock.timers.reset();
  }
});

test("stop() cancels the pending retry so no further fetch is attempted", async () => {
  let calls = 0;
  const instance = createFakeInstance(() => {
    calls += 1;
    return Promise.reject(new Error("still bad"));
  });

  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const stop = createProductsFetcher({ error() {} }, instance);
    await instance.products;
    assert.equal(calls, 1);

    stop();
    mock.timers.tick(PRODUCTS_RETRY_DELAY_MS);

    assert.equal(calls, 1);
  } finally {
    mock.timers.reset();
  }
});

test("a successful fetch needs no retry", async () => {
  const instance = createFakeInstance(() =>
    Promise.resolve({ vehicles: {}, energySites: {} } as unknown as Products),
  );

  const stop = createProductsFetcher({ error() {} }, instance);
  await instance.products;

  assert.equal(instance.error, undefined);
  stop();
});

test("testCredentials reports ok when the test call succeeds", async () => {
  const teslemetry = createFakeTeslemetryClient(200, () =>
    Promise.resolve({ response: true }),
  );

  const result = await testCredentials(teslemetry);

  assert.deepEqual(result, { ok: true });
});

test("testCredentials distinguishes a 401 as an auth failure", async () => {
  const teslemetry = createFakeTeslemetryClient(401, () =>
    Promise.reject(new Error("invalid_token")),
  );

  const result = await testCredentials(teslemetry);

  assert.equal(result.ok, false);
  assert.equal((result as any).auth, true);
  assert.match((result as any).message, /Invalid or expired access token/);
});

test("testCredentials distinguishes a 403 as an auth failure", async () => {
  const teslemetry = createFakeTeslemetryClient(403, () =>
    Promise.reject(new Error("forbidden")),
  );

  const result = await testCredentials(teslemetry);

  assert.equal(result.ok, false);
  assert.equal((result as any).auth, true);
});

test("testCredentials treats a non-auth failure as recoverable, not an auth error", async () => {
  const teslemetry = createFakeTeslemetryClient(500, () =>
    Promise.reject(new Error("upstream unavailable")),
  );

  const result = await testCredentials(teslemetry);

  assert.equal(result.ok, false);
  assert.equal((result as any).auth, false);
  assert.match((result as any).message, /upstream unavailable/);
});

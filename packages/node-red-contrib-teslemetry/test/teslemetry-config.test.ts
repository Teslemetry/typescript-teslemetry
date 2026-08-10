import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  createProductsFetcher,
  PRODUCTS_RETRY_DELAY_MS,
} from "../src/nodes/teslemetry-config.js";
import type { Instance } from "../src/shared.js";
import type { Products } from "@teslemetry/api";

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

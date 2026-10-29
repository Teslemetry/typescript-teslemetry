import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import type { SseProduct } from "../src/const.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Left open, as in energyStream.test.ts, so the client does not reconnect.
function sseResponse(events: object[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("emits product.joined and product.left business events as product", async () => {
  const joined = {
    event: "product.joined",
    type: "vehicle",
    vin: "5YJ3E1EA1KF000000",
    customer: "q3V1d8sXbE2mJ0kZp4R7aA",
    timestamp: "2026-10-05T00:00:00.000Z",
  };
  const left = {
    event: "product.left",
    type: "energy",
    energy_site_id: 1234567890,
    customer: "q3V1d8sXbE2mJ0kZp4R7aA",
    cause: "customer_left",
    timestamp: "2026-10-06T00:00:00.000Z",
  };
  const teslemetry = new Teslemetry(async () => "token", {
    region: "na",
    logger: silentLogger,
  });
  teslemetry.client.setConfig({
    fetch: (async () => sseResponse([joined, left])) as typeof fetch,
  });

  const products: SseProduct[] = [];
  teslemetry.sse.on("product", (event) => products.push(event));

  await teslemetry.sse.connect();
  await waitFor(() => products.length === 2);
  await teslemetry.sse.disconnect();

  assert.deepEqual(products, [joined, left]);
});

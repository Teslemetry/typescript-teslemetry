import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SSE_TOPICS,
  SSE_TOPIC_PRESETS,
  expandSseTopics,
} from "../src/sseTopics.js";
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

test("expandSseTopics resolves a preset to its exact wire names", () => {
  assert.deepEqual(
    expandSseTopics(["vehicleCore"]),
    [...SSE_TOPIC_PRESETS.vehicleCore],
  );
});

test("expandSseTopics deduplicates across mixed exact names and presets", () => {
  const expanded = expandSseTopics(["live_status", "energyLive", "site_info"]);
  assert.deepEqual(expanded.sort(), ["live_status", "site_info"].sort());
});

test("expandSseTopics passes through exact topic names untouched", () => {
  assert.deepEqual(expandSseTopics(["credits"]), ["credits"]);
});

test("every preset only expands to recognized wire topics", () => {
  for (const topics of Object.values(SSE_TOPIC_PRESETS)) {
    for (const topic of topics) {
      assert.ok(
        (SSE_TOPICS as readonly string[]).includes(topic),
        `${topic} is not a recognized SSE_TOPICS entry`,
      );
    }
  }
});

test("omitting topics never sends a topics query parameter (legacy-all mode)", async () => {
  let receivedUrl: string | undefined;
  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    return new Response(null, { status: 200 });
  });

  await teslemetry.sse.connect();
  await new Promise((resolve) => setTimeout(resolve, 50));
  teslemetry.sse.disconnect();

  assert.ok(receivedUrl);
  assert.equal(new URL(receivedUrl!).searchParams.has("topics"), false);
});

test("a preset selection sends its expanded exact wire names as the topics query parameter", async () => {
  let receivedUrl: string | undefined;
  const teslemetry = new Teslemetry(async () => "token", {
    region: "na",
    logger: silentLogger,
    stream: { topics: ["energyFullState"] },
  });
  teslemetry.client.setConfig({
    fetch: (async (request: Request) => {
      receivedUrl = request.url;
      return new Response(null, { status: 200 });
    }) as typeof fetch,
  });

  await teslemetry.sse.connect();
  await new Promise((resolve) => setTimeout(resolve, 50));
  teslemetry.sse.disconnect();

  assert.ok(receivedUrl);
  const topics = new URL(receivedUrl!).searchParams.get("topics");
  assert.ok(topics);
  assert.deepEqual(
    topics!.split(",").sort(),
    [...SSE_TOPIC_PRESETS.energyFullState].sort(),
  );
});

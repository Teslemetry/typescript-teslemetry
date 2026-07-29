/** Exact SSE wire event names accepted by the `topics` query parameter on
 *  `GET /sse/:id?`. Mirrors the API's closed allowlist - keep in sync with
 *  the server's `SSE_TOPICS` (api repo `src/lib/sseTopics.ts`) whenever a
 *  new wire event is added. */
export const SSE_TOPICS = [
  "state",
  "data",
  "alerts",
  "errors",
  "connectivity",
  "vehicle_data",
  "config",
  "live_status",
  "site_info",
  "tariff_content_v2",
  "energy_totals",
  "credits",
] as const;

export type SseTopic = (typeof SSE_TOPICS)[number];

/** Versioned client-side convenience groupings. These are never sent to the
 *  server as-is - `expandSseTopics` resolves each preset to its exact wire
 *  names before the request is made, so a future server release can never
 *  silently widen an explicit client subscription. */
export const SSE_TOPIC_PRESETS = {
  vehicleFull: [
    "state",
    "data",
    "alerts",
    "errors",
    "connectivity",
    "vehicle_data",
    "config",
  ],
  vehicleCore: ["state", "data", "connectivity", "vehicle_data", "config"],
  energyLive: ["live_status"],
  energyFullState: ["live_status", "site_info"],
  account: ["credits"],
} as const satisfies Record<string, readonly SseTopic[]>;

export type SseTopicPreset = keyof typeof SSE_TOPIC_PRESETS;

/** Expands a mix of exact topic names and preset names into a deduplicated,
 *  exact wire-name list suitable for the `topics` query parameter. */
export function expandSseTopics(
  selection: readonly (SseTopic | SseTopicPreset)[],
): SseTopic[] {
  const expanded = new Set<SseTopic>();
  for (const entry of selection) {
    if (entry in SSE_TOPIC_PRESETS) {
      for (const topic of SSE_TOPIC_PRESETS[entry as SseTopicPreset]) {
        expanded.add(topic);
      }
    } else {
      expanded.add(entry as SseTopic);
    }
  }
  return Array.from(expanded);
}

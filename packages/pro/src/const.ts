import type {
  GetSseById_Response,
  GetApiConfigByVinResponses,
  PatchApiConfigByVinData,
  GetApiBusinessProductsResponses,
} from "./client/types.gen.js";
import type { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import type { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";
import type { TeslemetryVehicleStream } from "./TeslemetryVehicleStream.js";
import type { TeslemetryEnergySiteStream } from "./TeslemetryEnergySiteStream.js";

// Helper to extract members from the union
type ExtractSse<T> = Extract<GetSseById_Response, T>;

export type SseEvent = GetSseById_Response;
export type SseState = ExtractSse<{ state: any }>;
export type SseData = ExtractSse<{ data: any }>;
export type SseErrors = ExtractSse<{ errors: any }>;
export type SseAlerts = ExtractSse<{ alerts: any }>;
export type SseConnectivity = ExtractSse<{ networkInterface: any }>;
export type SseCredits = ExtractSse<{ credits: any }>;
export type SseVehicleData = ExtractSse<{ vehicle_data: any }>;
export type SseConfig = ExtractSse<{ config: any }>;
/** A product joined or left this business; carries `timestamp`, not `createdAt`. */
export type SseProduct = ExtractSse<{ event: any }>;
export type SseLiveStatus = ExtractSse<{ live_status: any }>;
export type SseSiteInfo = ExtractSse<{ site_info: any }>;
/** `tariff_content_v2: null` is the server's explicit removal signal, not
 *  absence - distinguish it from "never received" (key missing from the
 *  cache) rather than coercing both to the same falsy state. */
export type SseTariffContentV2 = ExtractSse<{ tariff_content_v2: any }>;

/** Mirrors the Teslemetry API's `ENERGY_HISTORY_TOTAL_FIELDS` (energyHistoryTotals.ts) field-for-field,
 *  so this list must be kept in sync with that server-side list. */
export const ENERGY_HISTORY_TOTAL_FIELDS = [
  "solar_energy_exported",
  "generator_energy_exported",
  "grid_energy_imported",
  "grid_services_energy_imported",
  "grid_services_energy_exported",
  "grid_energy_exported_from_solar",
  "grid_energy_exported_from_generator",
  "grid_energy_exported_from_battery",
  "battery_energy_exported",
  "battery_energy_imported_from_grid",
  "battery_energy_imported_from_solar",
  "battery_energy_imported_from_generator",
  "consumer_energy_imported_from_grid",
  "consumer_energy_imported_from_solar",
  "consumer_energy_imported_from_battery",
  "consumer_energy_imported_from_generator",
  "total_home_usage",
  "total_battery_charge",
  "total_battery_discharge",
  "total_solar_generation",
  "total_grid_energy_exported",
] as const;

export type EnergyHistoryTotalField = (typeof ENERGY_HISTORY_TOTAL_FIELDS)[number];

export type EnergyHistoryTotals = Record<EnergyHistoryTotalField, number | null>;

/** A field absent from the polled day stays `null`, never coerced to 0 - see
 *  ENERGY_HISTORY_TOTAL_FIELDS above. `date` is the installation-local
 *  calendar day (YYYY-MM-DD) these totals cover. Re-fetch the full
 *  time_series/events document via the site's calendar_history REST route
 *  using this event's own `id`; this event never carries that document
 *  itself, nor a `url`. Its `isCache` is `true` only on a connect-time
 *  snapshot replay and omitted entirely on every live publish. Silence on
 *  this event means no change since the last refresh, never staleness - the
 *  server only publishes on its 5-minute poll cadence. */
export type SseEnergyTotals = Omit<ExtractSse<{ totals: any }>, "totals"> & {
  totals: EnergyHistoryTotals;
};

/** Wh delivered on `date`, keyed by Wall Connector DIN. A Wall Connector with
 *  no charge session that day is absent, not 0. */
export type WallConnectorTotals = Record<string, number>;

/** Per-Wall-Connector daily totals for one installation-local day (`date`,
 *  YYYY-MM-DD), keyed by the energy site `id` (not `site_id`). Published while
 *  any Wall Connector at the site is charging and once more after charging
 *  stops; that closing total is sent while every Wall Connector is idle, so
 *  keep it. Key updates by (`id`, DIN, `date`) and use `createdAt` to reject
 *  an older replay. `isCache` is `true` only on a connect-time snapshot of
 *  the last polled day, which may be an earlier date. Never carries the
 *  session list: re-fetch it via the site's telemetry_history REST route.
 *
 *  The wire payload has the same shape as `energy_totals` apart from its
 *  `totals` keys, so the two are told apart by `isWallConnectorTotals`. */
export type SseWallConnectorTotals = Omit<
  ExtractSse<{ totals: any }>,
  "totals"
> & {
  totals: WallConnectorTotals;
};

/** `energy_totals` always carries every `ENERGY_HISTORY_TOTAL_FIELDS` key
 *  (null when absent), and `total_home_usage` is one of them; a
 *  `wall_connector_totals` payload is keyed only by Wall Connector DIN, so it
 *  never has that key. */
export function isWallConnectorTotals(
  totals: EnergyHistoryTotals | WallConnectorTotals,
): totals is WallConnectorTotals {
  return !("total_home_usage" in totals);
}

export type FieldsResponse = GetApiConfigByVinResponses[200]["fields"];
// The body of patch/post config is { fields: ... }
export type FieldsRequest = NonNullable<
  NonNullable<PatchApiConfigByVinData["body"]>["fields"]
>;

export type Signals = keyof SseData["data"];

/** One consented product from `GET /api/business/products`. */
export type BusinessProduct =
  GetApiBusinessProductsResponses[200]["response"][number];
type VehicleMetadata = BusinessProduct;
type EnergyMetadata = BusinessProduct;
export interface VehicleDetails {
  vin: string;
  name: string;
  api: TeslemetryVehicleApi;
  sse: TeslemetryVehicleStream;
  metadata: VehicleMetadata;
}

export interface EnergyDetails {
  id: number;
  name: string;
  api: TeslemetryEnergyApi;
  sse: TeslemetryEnergySiteStream;
  metadata: EnergyMetadata;
}

export interface Products {
  vehicles: Record<string, VehicleDetails>;
  energySites: Record<string, EnergyDetails>;
}

import type {
  GetSseByVin_Response,
  GetApiConfigByVinResponses,
  PatchApiConfigByVinData,
  GetApiMetadataResponses,
} from "./client/types.gen.js";
import type { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import type { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";
import type { TeslemetryVehicleStream } from "./TeslemetryVehicleStream.js";
import type { TeslemetryEnergySiteStream } from "./TeslemetryEnergySiteStream.js";

// Helper to extract members from the union
type ExtractSse<T> = Extract<GetSseByVin_Response, T>;

export type SseEvent = GetSseByVin_Response;
export type SseState = ExtractSse<{ state: any }>;
export type SseData = ExtractSse<{ data: any }>;
export type SseErrors = ExtractSse<{ errors: any }>;
export type SseAlerts = ExtractSse<{ alerts: any }>;
export type SseConnectivity = ExtractSse<{ networkInterface: any }>;
export type SseCredits = ExtractSse<{ credits: any }>;
export type SseVehicleData = ExtractSse<{ vehicle_data: any }>;
export type SseConfig = ExtractSse<{ config: any }>;
export type SseLiveStatus = ExtractSse<{ live_status: any }>;
export type SseSiteInfo = ExtractSse<{ site_info: any }>;

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
 *  ENERGY_HISTORY_TOTAL_FIELDS above. `url` is the exact canonical REST path
 *  (including the polled query) to re-fetch the full time_series/events
 *  document; this event never carries that document itself. Silence on this
 *  event means no change since the last refresh, never staleness - the
 *  server only publishes on its 5-minute poll cadence. */
export type SseEnergyTotals = Omit<ExtractSse<{ topic: any }>, "totals"> & {
  totals: EnergyHistoryTotals;
};

export type FieldsResponse = GetApiConfigByVinResponses[200]["fields"];
// The body of patch/post config is { fields: ... }
export type FieldsRequest = NonNullable<
  NonNullable<PatchApiConfigByVinData["body"]>["fields"]
>;

export type Signals = keyof SseData["data"];

// Extract specific product types from the API response
type VehicleMetadata = GetApiMetadataResponses[200]["vehicles"][string];
type EnergyMetadata = GetApiMetadataResponses[200]["energy_sites"][string];
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

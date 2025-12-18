import type {
  GetSseByVin_Response,
  GetApiConfigByVinResponses,
  PatchApiConfigByVinData,
  GetApiMetadataResponses,
} from "./client/types.gen.js";
import type { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import type { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";
import type { TeslemetryVehicleStream } from "./TeslemetryVehicleStream.js";

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
  metadata: EnergyMetadata;
}

export interface Products {
  vehicles: Record<string, VehicleDetails>;
  energySites: Record<string, EnergyDetails>;
}

import type {
  GetSseByVin_Response,
  GetApiConfigByVinResponses,
  PatchApiConfigByVinData,
  GetApi1ProductsResponses,
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
type ProductsResponse = GetApi1ProductsResponses[200]["response"];
type VehicleProduct = Extract<
  ProductsResponse[number],
  { device_type: "vehicle" }
>;
type EnergyProduct = Extract<
  ProductsResponse[number],
  { device_type: "energy" }
>;
export interface VehicleDetails {
  name: string;
  vin: string;
  api: TeslemetryVehicleApi;
  sse: TeslemetryVehicleStream;
  product: VehicleProduct;
}

export interface EnergyDetails {
  name: string;
  site: number;
  api: TeslemetryEnergyApi;
  product: EnergyProduct;
}

export interface Products {
  vehicles: Record<string, VehicleDetails>;
  energySites: Record<string, EnergyDetails>;
}

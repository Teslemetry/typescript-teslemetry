import type {
  GetSseByVin_Response,
  GetApiConfigByVinResponses,
  PatchApiConfigByVinData,
} from "./client/types.gen.js";

// Helper to extract members from the union
type ExtractSse<T> = Extract<GetSseByVin_Response, T>;

export type ISseEvent = GetSseByVin_Response;
export type ISseState = ExtractSse<{ state: any }>;
export type ISseData = ExtractSse<{ data: any }>;
export type ISseErrors = ExtractSse<{ errors: any }>;
export type ISseAlerts = ExtractSse<{ alerts: any }>;
export type ISseConnectivity = ExtractSse<{ networkInterface: any }>;
export type ISseCredits = ExtractSse<{ credits: any }>;
export type ISseVehicleData = ExtractSse<{ vehicle_data: any }>;
export type ISseConfig = ExtractSse<{ config: any }>;

export type FieldsResponse = GetApiConfigByVinResponses[200]["fields"];
// The body of patch/post config is { fields: ... }
export type FieldsRequest = NonNullable<
  NonNullable<PatchApiConfigByVinData["body"]>["fields"]
>;

export type Signals = keyof ISseData["data"];
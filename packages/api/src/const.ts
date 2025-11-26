import type {
  GetSseByVin_Response,
  GetApiConfigByVinResponses,
  PatchApiConfigByVinData,
} from "./client/types.gen.js";

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

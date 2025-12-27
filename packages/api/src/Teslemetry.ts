import {
  TeslemetryStream,
  TeslemetryStreamOptions,
} from "./TeslemetryStream.js";
import { TeslemetryApi } from "./TeslemetryApi.js";
import { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";
import { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import { TeslemetryUserApi } from "./TeslemetryUserApi.js";
import { TeslemetryChargingApi } from "./TeslemetryChargingApi.js";
import { Client, createClient } from "./client/client/index.js";
import { getApiMetadata, getApiTest } from "./client/index.js";
import { Logger, consoleLogger } from "./logger.js";
import pkg from "../package.json" with { type: "json" };
import type { Products } from "./const.js";

interface TeslemetryOptions {
  region?: "na" | "eu";
  logger?: Logger;
  stream?: TeslemetryStreamOptions;
}

export class Teslemetry {
  public client: Client;
  public region: "na" | "eu" | null = null;
  public uid: string | null = null;
  public sse: TeslemetryStream;
  public api: TeslemetryApi;
  public logger: Logger;
  public user: TeslemetryUserApi;
  public charging: TeslemetryChargingApi;

  constructor(
    access_token: string | (() => Promise<string>),
    options?: TeslemetryOptions,
  ) {
    this.logger = options?.logger || consoleLogger;
    if (options?.region) this.region = options.region;

    // Initialize client with base URL
    this.client = createClient({
      auth: access_token,
      baseUrl: `https://${this.region || "api"}.teslemetry.com`,
      headers: {
        "X-Library": `typescript teslemetry ${pkg.version}`,
      },
    });

    // Log requests and update region
    this.client.interceptors.response.use((response) => {
      this.logger.debug(`Response from ${response.url}: ${response.status}`);
      if (!this.region) {
        const userRegion = response.headers.get("x-region") as "na" | "eu";
        if (userRegion) {
          this.logger.debug(
            `Changing region from ${this.region || "null"} to ${userRegion}`,
          );
          this.region = userRegion;
          this.client.setConfig({
            baseUrl: `https://${this.region}.teslemetry.com`,
          });
        }
      }
      return response;
    });

    this.sse = new TeslemetryStream(this, options?.stream);
    this.api = new TeslemetryApi(this);
    this.user = new TeslemetryUserApi(this);
    this.charging = new TeslemetryChargingApi(this);
  }

  /**
   * Get a vehicle instance with both API and SSE capabilities.
   * @param vin Vehicle Identification Number
   * @returns Object containing both API and SSE vehicle instances
   */
  public getVehicle(vin: string) {
    return {
      api: this.api.getVehicle(vin),
      sse: this.sse.getVehicle(vin),
    };
  }

  /**
   * Ensure the users region has been set
   * @returns Promise that resolves to the region ("na" or "eu")
   */
  public async getRegion(): Promise<"na" | "eu"> {
    if (this.region) return this.region;
    const { response } = await getApiTest({ client: this.client });
    return response.headers.get("x-region") as "na" | "eu";
  }

  /**
   * Creates API instances for all products (vehicles and energy sites) associated with the account.
   * @returns A promise that resolves to an object containing vehicle and energy site names, API, and SSE instances.
   */
  public async createProducts(): Promise<Products> {
    const { data } = await getApiMetadata({
      client: this.client,
      throwOnError: true,
    });

    const vehicles = Object.fromEntries(
      Object.entries(data.vehicles).map(([vin, metadata]) => [
        vin,
        {
          name: metadata.name ?? useTeslaModel(vin),
          vin,
          api: this.api.getVehicle(vin),
          sse: this.sse.getVehicle(vin),
          metadata,
        },
      ]),
    );

    const energySites = Object.fromEntries(
      Object.entries(data.energy_sites ?? {}).map(([id, metadata]) => {
        const siteId = Number(id);
        return [
          id,
          {
            name: metadata.name ?? "Unnamed",
            id: siteId,
            api: this.api.getEnergySite(siteId),
            metadata,
          },
        ];
      }),
    );

    return { vehicles, energySites };
  }

  /**
   * Get a vehicle API instance for the specified VIN.
   * @param vin Vehicle Identification Number
   * @returns TeslemetryVehicleApi instance
   */
  public vehicle(vin: string): TeslemetryVehicleApi {
    return new TeslemetryVehicleApi(this, vin);
  }

  /**
   * Get an energy site API instance for the specified site ID.
   * @param siteId Energy site ID
   * @returns TeslemetryEnergyApi instance
   */
  public energySite(siteId: number): TeslemetryEnergyApi {
    return new TeslemetryEnergyApi(this, siteId);
  }
}

const model_names = {
  "3": "Model 3",
  S: "Model S",
  X: "Model X",
  Y: "Model Y",
  C: "Cybertruck",
  T: "Semi",
} as const;

export const useTeslaModel = (vin: string) =>
  model_names?.[vin[3] as keyof typeof model_names] ?? "Unknown";

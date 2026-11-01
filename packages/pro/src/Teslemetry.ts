import {
  TeslemetryStream,
  TeslemetryStreamOptions,
} from "./TeslemetryStream.js";
import { TeslemetryApi } from "./TeslemetryApi.js";
import { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";
import { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import { Client, createClient } from "./client/client/index.js";
import { getApiBusinessProducts } from "./client/index.js";
import { Logger, consoleLogger } from "./logger.js";
import pkg from "../package.json" with { type: "json" };
import type { BusinessProduct, Products } from "./const.js";
import { Models } from "tesla-fleet-api/const";

interface TeslemetryOptions {
  region?: "na" | "eu";
  logger?: Logger;
  stream?: TeslemetryStreamOptions;
  throwOnError?: boolean;
}

export class Teslemetry {
  public client: Client;
  public region: "na" | "eu" | null = null;
  public uid: string | null = null;
  public sse: TeslemetryStream;
  public api: TeslemetryApi;
  public logger: Logger;

  constructor(
    access_token: string | (() => Promise<string>),
    options?: TeslemetryOptions,
  ) {
    this.logger = options?.logger || consoleLogger;
    if (options?.region) this.region = options.region;

    // Initialize client with base URL
    this.client = createClient({
      auth: access_token,
      baseUrl: `https://${this.region || "api"}.teslemetry.pro`,
      headers: {
        "X-Library": `typescript teslemetry-pro ${pkg.version}`,
      },
      throwOnError: options?.throwOnError ?? true,
    });

    // Log requests and update region
    this.client.interceptors.response.use((response) => {
      // Query params (e.g. ?token=...) may carry credentials - never log them.
      const path = response.url ? new URL(response.url).pathname : response.url;
      this.logger.debug(`Response from ${path}: ${response.status}`);
      if (!this.region) {
        const userRegion = parseRegion(response.headers.get("x-region"));
        if (userRegion) {
          this.logger.debug(
            `Changing region from ${this.region || "null"} to ${userRegion}`,
          );
          this.region = userRegion;
          this.client.setConfig({
            baseUrl: `https://${this.region}.teslemetry.pro`,
          });
        }
      }
      return response;
    });

    this.sse = new TeslemetryStream(this, options?.stream);
    // TeslemetryVehicleStream reads root.sse, so the vin's stream can only be
    // created once this.sse is assigned.
    if (options?.stream?.vin) this.sse.getVehicle(options.stream.vin);
    this.api = new TeslemetryApi(this);
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
   * Get an energy site instance with both API and SSE capabilities.
   * @param siteId Energy site ID
   * @returns Object containing both API and SSE energy site instances
   */
  public getEnergySite(siteId: number) {
    return {
      api: this.api.getEnergySite(siteId),
      sse: this.sse.getEnergySite(String(siteId)),
    };
  }

  /**
   * Ensure the users region has been set
   * @returns Promise that resolves to the region ("na" or "eu"), or `null`
   * when the server sends no recognized `x-region` header
   */
  public async getRegion(): Promise<"na" | "eu" | null> {
    if (this.region) return this.region;
    const { response } = await getApiBusinessProducts({
      client: this.client,
      query: { limit: 1 },
    });
    return parseRegion(response?.headers.get("x-region"));
  }

  /**
   * Creates API instances for all products (vehicles and energy sites) that customers have consented to share with this business.
   * @returns A promise that resolves to an object containing vehicle and energy site names, API, and SSE instances.
   */
  public async createProducts(): Promise<Products> {
    const products: BusinessProduct[] = [];
    let cursor: string | undefined;
    do {
      const { data } = await getApiBusinessProducts({
        client: this.client,
        query: { limit: 200, cursor },
        throwOnError: true,
      });
      products.push(...data.response);
      cursor = data.next_cursor ?? undefined;
    } while (cursor);

    const vehicles: Products["vehicles"] = {};
    const energySites: Products["energySites"] = {};
    for (const metadata of products) {
      if (metadata.type === "vehicle" && metadata.vin) {
        const vin = metadata.vin;
        vehicles[vin] = {
          name: metadata.name || useTeslaModel(vin),
          vin,
          api: this.api.getVehicle(vin),
          sse: this.sse.getVehicle(vin),
          metadata,
        };
      } else if (metadata.type === "energy" && metadata.energy_site_id) {
        const siteId = metadata.energy_site_id;
        energySites[siteId] = {
          name: metadata.name || "Unnamed",
          id: siteId,
          api: this.api.getEnergySite(siteId),
          sse: this.sse.getEnergySite(String(siteId)),
          metadata,
        };
      }
    }

    return { vehicles, energySites };
  }

  /**
   * Get a vehicle API instance for the specified VIN.
   * @param vin Vehicle Identification Number
   * @returns TeslemetryVehicleApi instance
   */
  public vehicle(vin: string): TeslemetryVehicleApi {
    return this.api.getVehicle(vin);
  }

  /**
   * Get an energy site API instance for the specified site ID.
   * @param siteId Energy site ID
   * @returns TeslemetryEnergyApi instance
   */
  public energySite(siteId: number): TeslemetryEnergyApi {
    return this.api.getEnergySite(siteId);
  }
}

const parseRegion = (value: string | null | undefined): "na" | "eu" | null =>
  value === "na" || value === "eu" ? value : null;

export const useTeslaModel = (vin: string) => Models[vin[3]] ?? "Unknown";

import { TeslemetryStream } from "./TeslemetryStream";
import { TeslemetryApi } from "./TeslemetryApi";
import { TeslemetryVehicleApi } from "./TeslemetryVehicleApi";
import { TeslemetryEnergyApi } from "./TeslemetryEnergyApi";
import { TeslemetryUserApi } from "./TeslemetryUserApi";
import { TeslemetryChargingApi } from "./TeslemetryChargingApi";
import { Client, createClient } from "./client/client";
import { getApiTest } from "./client";
import { Logger, consoleLogger } from "./logger";
import { version } from "../package.json";

export class Teslemetry {
  public client: Client;
  public region: "na" | "eu" | null = null;
  public uid: string | null = null;
  public sse: TeslemetryStream;
  public api: TeslemetryApi;
  public logger: Logger;
  private _user: TeslemetryUserApi | null = null;
  private _charging: TeslemetryChargingApi | null = null;

  constructor(
    access_token: string,
    region?: "na" | "eu",
    logger: Logger = consoleLogger,
  ) {
    this.logger = logger;
    if (region) this.region = region;

    // Initialize client with base URL
    this.client = createClient({
      auth: access_token,
      baseUrl: `https://${this.region || "api"}.teslemetry.com`,
      headers: {
        "X-Library": `typescript teslemetry ${version}`,
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

    this.sse = new TeslemetryStream(this, access_token);
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
   * Get the users region from the server
   * @returns Promise that resolves to the region ("na" or "eu")
   */
  public async getRegion(): Promise<"na" | "eu"> {
    const { response } = await getApiTest();
    return response.headers.get("x-region") as "na" | "eu";
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

  /**
   * Get the user API instance (singleton).
   * @returns TeslemetryUserApi instance
   */
  public get user(): TeslemetryUserApi {
    if (!this._user) {
      this._user = new TeslemetryUserApi(this);
    }
    return this._user;
  }

  /**
   * Get the charging API instance (singleton).
   * @returns TeslemetryChargingApi instance
   */
  public get charging(): TeslemetryChargingApi {
    if (!this._charging) {
      this._charging = new TeslemetryChargingApi(this);
    }
    return this._charging;
  }
}

import { TeslemetryStream } from "./TeslemetryStream";
import { TeslemetryApi } from "./TeslemetryApi";
import { TeslemetryVehicleApi } from "./TeslemetryVehicleApi";
import { TeslemetryEnergyApi } from "./TeslemetryEnergyApi";
import { TeslemetryUserApi } from "./TeslemetryUserApi";
import { TeslemetryChargingApi } from "./TeslemetryChargingApi";
import { Client, createClient } from "./client/client";
import { getApiTest } from "./client";

export class Teslemetry {
  public client: Client;
  public region: "na" | "eu" | null = null;
  public uid: string | null = null;
  public sse: TeslemetryStream;
  public api: TeslemetryApi;
  private _user: TeslemetryUserApi | null = null;
  private _charging: TeslemetryChargingApi | null = null;

  constructor(access_token: string, region?: "na" | "eu") {
    if (region) this.region = region;
    this.client = createClient({
      auth: access_token,
      baseUrl: `https://${this.region || "api"}.teslemetry.com`,
      headers: {
        "X-Library": "typescript teslemetry",
      },
    });
    this.sse = new TeslemetryStream(this, access_token);
    this.api = new TeslemetryApi(this);
  }

  public async getRegion(): Promise<"na" | "eu"> {
    if (this.region) return this.region;
    const { response } = await getApiTest();
    if (!response.ok) {
      throw new Error(`Failed to test API: ${response.statusText}`);
    }
    this.uid = response.headers.get("X-Uid") as string | null;
    this.region = response.headers.get("X-Region") as "na" | "eu" | null;
    if (!this.region) throw new Error(`Failed to get region`);
    this.client.setConfig({
      baseUrl: `https://${this.region}.teslemetry.com`,
    });
    return this.region;
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

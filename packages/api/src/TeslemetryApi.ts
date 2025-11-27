import {
  getApi1Products,
  getApiTest,
  getApiMetadata,
  postApi1VehiclesFleetStatus,
  getApi1Vehicles,
  postApi1VehiclesInvitationsRedeem,
} from "./client/index.js";
import { Teslemetry } from "./Teslemetry.js";
import { TeslemetryChargingApi } from "./TeslemetryChargingApi.js";
import { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import { TeslemetryUserApi } from "./TeslemetryUserApi.js";
import { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";

export class TeslemetryApi {
  private root: Teslemetry;
  public _vehicles: Record<string, TeslemetryVehicleApi> = {};
  public _energySites: Record<string, TeslemetryEnergyApi> = {};
  public user: TeslemetryUserApi;
  public charging: TeslemetryChargingApi;

  constructor(root: Teslemetry) {
    this.root = root;
    this.user = new TeslemetryUserApi(this.root);
    this.charging = new TeslemetryChargingApi(this.root);
  }
  /**
   * Gets or creates a vehicle API instance for the specified VIN.
   * @param vin - The vehicle identification number.
   * @returns The vehicle API instance for the specified VIN.
   */
  public getVehicle(vin: string) {
    if (!this._vehicles[vin]) {
      this._vehicles[vin] = new TeslemetryVehicleApi(this.root, vin);
    }
    return this._vehicles[vin];
  }

  /**
   * Gets or creates an energy site API instance for the specified ID.
   * @param id - The energy site ID.
   * @returns The energy site API instance for the specified ID.
   */
  public getEnergySite(id: number) {
    if (!this._energySites[id]) {
      this._energySites[id] = new TeslemetryEnergyApi(this.root, id);
    }
    return this._energySites[id];
  }

  /**
   * Creates API instances for all products (vehicles and energy sites) associated with the account.
   * @returns A promise that resolves to an object containing vehicle and energy site API instances.
   */
  public async createProducts() {
    const { data } = await getApi1Products({ client: this.root.client });
    data.response?.forEach((product) => {
      if (product.device_type === "vehicle") {
        this.getVehicle(product.vin);
      }
      if (product.device_type === "energy") {
        this.getEnergySite(product.energy_site_id);
      }
    });
    return { vehicles: this._vehicles, energySites: this._energySites };
  }

  /**
   * Returns a list of products (vehicles and energy sites) associated with the user account.
   * @returns A promise that resolves to an object containing a `response` array and count.
   * Each item in the array is a product, which can be a vehicle or an energy site, and a `count` of the products.
   */
  public async products() {
    const { data } = await getApi1Products({ client: this.root.client });
    return data;
  }

  /**
   * Test connectivity and authentication to the Teslemetry API.
   * @returns A promise that resolves to a data object containing a boolean `response` field indicating success.
   */
  public async test() {
    const { data } = await getApiTest({ client: this.root.client });
    return data;
  }

  /**
   * Get metadata about your Teslemetry account.
   * @returns Promise to an object containing metadata about the account,
   * including user UID, region, scopes, and lists of vehicles and energy sites.
   */
  public async metadata() {
    const { data } = await getApiMetadata({ client: this.root.client });
    return data;
  }

  /**
   * Checks whether vehicles can accept the Tesla commands protocol for the partner's public key.
   * @param vins - An array of VINs to check.
   * @returns Promise to an object containing lists of paired and unpaired VINs,
   * and detailed info for each vehicle.
   */
  public async fleetStatus(vins: string[]) {
    const { data } = await postApi1VehiclesFleetStatus({
      body: { vins },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns vehicles belonging to the account. This endpoint is paginated.
   * @returns Promise to an object containing a list of vehicles,
   * pagination details, and a total count.
   */
  public async vehicles() {
    const { data } = await getApi1Vehicles({ client: this.root.client });
    return data;
  }

  /**
   * Redeems a share invite. Once redeemed, the account will gain access to the vehicle within the Tesla app.
   * @param code - The invitation code to redeem.
   * @returns Promise to an object containing the `vehicle_id_s` and `vin` of the shared vehicle.
   */
  public async redeemInvitation(code: string) {
    const { data } = await postApi1VehiclesInvitationsRedeem({
      body: { code },
      client: this.root.client,
    });
    return data;
  }
}

import {
  getApi1Products,
  getApiTest,
  getApiMetadata,
  postApi1VehiclesFleetStatus,
  getApi1Vehicles,
  postApi1VehiclesInvitationsRedeem,
} from "./client";
import { Teslemetry } from "./Teslemetry";
import { TeslemetryChargingApi } from "./TeslemetryChargingApi";
import { TeslemetryEnergyApi } from "./TeslemetryEnergyApi";
import { TeslemetryUserApi } from "./TeslemetryUserApi";
import { TeslemetryVehicleApi } from "./TeslemetryVehicleApi";

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

  public getVehicle(vin: string) {
    if (!this._vehicles[vin]) {
      this._vehicles[vin] = new TeslemetryVehicleApi(this.root, vin);
    }
    return this._vehicles[vin];
  }

  public getEnergySite(id: number) {
    if (!this._energySites[id]) {
      this._energySites[id] = new TeslemetryEnergyApi(this.root, id);
    }
    return this._energySites[id];
  }

  public async createProducts() {
    const { data } = await this.products();
    data?.response?.forEach((product) => {
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
   * Returns products mapped to user.
   * @returns A promise that resolves to a data object containing a response with an array of product objects.
   */
  public async products() {
    return getApi1Products({ client: this.root.client });
  }

  /**
   * Test API endpoint to verify connectivity.
   * @returns A promise that resolves to a data object containing a response of true, indicating successful connectivity.
   */
  public async test() {
    return getApiTest({ client: this.root.client });
  }

  /**
   * Get API metadata including UID and region information.
   * @returns A promise that resolves to a data object containing response metadata with UID, region, scopes, and vehicle information.
   */
  public async metadata() {
    return getApiMetadata({ client: this.root.client });
  }

  /**
   * Checks whether vehicles can accept Tesla commands protocol for the partner's public key
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async fleetStatus(vins: string[]) {
    return postApi1VehiclesFleetStatus({
      body: { vins },
      client: this.root.client,
    });
  }

  /**
   * Returns vehicles belonging to the account.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async vehicles() {
    return getApi1Vehicles({ client: this.root.client });
  }

  /**
   * Redeems a share invite.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async redeemInvitation(code: string) {
    return postApi1VehiclesInvitationsRedeem({
      body: { code },
      client: this.root.client,
    });
  }
}

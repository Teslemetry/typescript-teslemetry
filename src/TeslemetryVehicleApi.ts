import { Teslemetry } from "./Teslemetry";
import {
  getApiRefreshByVin,
  getApiImageByVin,
} from "./client";

export class TeslemetryVehicleApi {
  private root: Teslemetry;
  public vin: string;

  constructor(root: Teslemetry, vin: string) {
    this.root = root;
    this.vin = vin;
  }

  /**
   * Refresh vehicle data by VIN.
   * @returns A promise that resolves to a data object containing the refresh response.
   */
  public async refreshData() {
    return getApiRefreshByVin({ path: { vin: this.vin }, client: this.root.client });
  }

  /**
   * Get vehicle image by VIN.
   * @returns A promise that resolves to a data object containing the vehicle's image URL.
   */
  public async getImage() {
    return getApiImageByVin({ path: { vin: this.vin }, client: this.root.client });
  }
}

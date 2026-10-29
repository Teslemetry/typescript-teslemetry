import { getApiBusinessProducts } from "./client/index.js";
import type { GetApiBusinessProductsData } from "./client/types.gen.js";
import { Teslemetry } from "./Teslemetry.js";
import { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";

export class TeslemetryApi {
  private root: Teslemetry;
  public vehicles: Map<string, TeslemetryVehicleApi> = new Map();
  public energySites: Map<number, TeslemetryEnergyApi> = new Map();

  constructor(root: Teslemetry) {
    this.root = root;
  }
  /**
   * Gets or creates a vehicle API instance for the specified VIN.
   * @param vin - The vehicle identification number.
   * @returns The vehicle API instance for the specified VIN.
   */
  public getVehicle(vin: string) {
    if (!this.vehicles.has(vin)) {
      new TeslemetryVehicleApi(this.root, vin);
    }
    return this.vehicles.get(vin)!;
  }

  /**
   * Gets or creates an energy site API instance for the specified ID.
   * @param id - The energy site ID.
   * @returns The energy site API instance for the specified ID.
   */
  public getEnergySite(id: number) {
    if (!this.energySites.has(id)) {
      new TeslemetryEnergyApi(this.root, id);
    }
    return this.energySites.get(id)!;
  }

  /**
   * Creates API instances for all products (vehicles and energy sites) that customers have consented to share with this business.
   * @returns A promise that resolves to an object containing vehicle and energy site API instances.
   */
  public async createProducts() {
    let cursor: string | undefined;
    do {
      const data = await this.getProducts({ limit: 200, cursor });
      data.response.forEach((product) => {
        if (product.type === "vehicle" && product.vin) {
          this.getVehicle(product.vin);
        }
        if (product.type === "energy" && product.energy_site_id) {
          this.getEnergySite(product.energy_site_id);
        }
      });
      cursor = data.next_cursor ?? undefined;
    } while (cursor);
    return { vehicles: this.vehicles, energySites: this.energySites };
  }

  /**
   * Returns one page of the products (vehicles and energy sites) that customers have consented to share with this business.
   * @param query - Optional `type`, `ref` and `since` filters, and `limit`/`cursor` pagination.
   * @returns A promise that resolves to an object containing a `response` array of products,
   * the total `count` across all pages, and the `next_cursor` for the next page (`null` on the last page).
   */
  public async getProducts(query?: GetApiBusinessProductsData["query"]) {
    const { data } = await getApiBusinessProducts({
      client: this.root.client,
      query,
    });
    return data;
  }
}

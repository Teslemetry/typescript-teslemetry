import { Teslemetry } from "./Teslemetry";
import {
  getApi1UsersFeatureConfig,
  getApi1UsersMe,
  getApi1UsersOrders,
  getApi1UsersRegion,
} from "./client";

export class TeslemetryUserApi {
  private root: Teslemetry;

  constructor(root: Teslemetry) {
    this.root = root;
  }

  /**
   * Returns the user's feature configuration.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getFeatureConfig() {
    return getApi1UsersFeatureConfig({ client: this.root.client });
  }

  /**
   * Returns the user's profile information.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getMe() {
    return getApi1UsersMe({ client: this.root.client });
  }

  /**
   * Returns the user's order history.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getOrders() {
    return getApi1UsersOrders({ client: this.root.client });
  }

  /**
   * Returns the user's region.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getRegion() {
    return getApi1UsersRegion({ client: this.root.client });
  }
}
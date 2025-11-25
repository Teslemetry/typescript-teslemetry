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
   * Returns the user's feature flags configuration.
   * @return Promise to an object with response containing user feature configuration and flags
   */
  public async getFeatureConfig() {
    const { data } = await getApi1UsersFeatureConfig({
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns the user's profile data and account information.
   * @return Promise to an object with response containing user profile and account information
   */
  public async getMe() {
    const { data } = await getApi1UsersMe({ client: this.root.client });
    return data;
  }

  /**
   * Returns the user's order history.
   * @return Promise to an object with response containing user order history and purchase records
   */
  public async getOrders() {
    const { data } = await getApi1UsersOrders({ client: this.root.client });
    return data;
  }

  /**
   * Returns the user's region information.
   * @return Promise to an object with response containing user's regional settings and location data
   */
  public async getRegion() {
    const { data } = await getApi1UsersRegion({ client: this.root.client });
    return data;
  }
}

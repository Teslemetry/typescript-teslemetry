import { EventEmitter } from "events";
import { Teslemetry } from "./Teslemetry.js";
import {
  getApi1UsersFeatureConfig,
  getApi1UsersMe,
  getApi1UsersOrders,
  getApi1UsersRegion,
  GetApi1UsersFeatureConfigResponse,
  GetApi1UsersMeResponse,
  GetApi1UsersOrdersResponse,
  GetApi1UsersRegionResponse,
} from "./client/index.js";

// Interface for event type safety
type TeslemetryUserEventMap = {
  featureConfig: GetApi1UsersFeatureConfigResponse;
  me: GetApi1UsersMeResponse;
  orders: GetApi1UsersOrdersResponse;
  region: GetApi1UsersRegionResponse;
};

// TypeScript interface for event type safety
export declare interface TeslemetryUserApi {
  on<K extends keyof TeslemetryUserEventMap>(
    event: K,
    listener: (data: TeslemetryUserEventMap[K]) => void,
  ): this;
  off<K extends keyof TeslemetryUserEventMap>(
    event: K,
    listener: (data: TeslemetryUserEventMap[K]) => void,
  ): this;
  once<K extends keyof TeslemetryUserEventMap>(
    event: K,
    listener: (data: TeslemetryUserEventMap[K]) => void,
  ): this;
  emit<K extends keyof TeslemetryUserEventMap>(
    event: K,
    data: TeslemetryUserEventMap[K],
  ): boolean;
}

export class TeslemetryUserApi extends EventEmitter {
  private root: Teslemetry;

  constructor(root: Teslemetry) {
    super();
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
    this.emit("featureConfig", data);
    return data;
  }

  /**
   * Returns the user's profile data and account information.
   * @return Promise to an object with response containing user profile and account information
   */
  public async getMe() {
    const { data } = await getApi1UsersMe({ client: this.root.client });
    this.emit("me", data);
    return data;
  }

  /**
   * Returns the user's order history.
   * @return Promise to an object with response containing user order history and purchase records
   */
  public async getOrders() {
    const { data } = await getApi1UsersOrders({ client: this.root.client });
    this.emit("orders", data);
    return data;
  }

  /**
   * Returns the user's region information.
   * @return Promise to an object with response containing user's regional settings and location data
   */
  public async getRegion() {
    const { data } = await getApi1UsersRegion({ client: this.root.client });
    this.emit("region", data);
    return data;
  }
}

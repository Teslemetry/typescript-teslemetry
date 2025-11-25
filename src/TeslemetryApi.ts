import { getApi1Products, getApiTest, getApiMetadata } from "./client";
import { Teslemetry } from "./Teslemetry";

export class TeslemetryApi {
  private root: Teslemetry;

  constructor(root: Teslemetry) {
    this.root = root;
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
   * @returns A promise that resolves to a data object containing a response boolean indicating connectivity status.
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
}

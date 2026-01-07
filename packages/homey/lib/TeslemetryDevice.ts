import Homey from "homey";
import type TeslemetryApp from "../app.js";
import type TeslemetryDriver from "./TeslemetryDriver.js";
import { TeslemetryApiError } from "../@types/error.js";

export default class TeslemetryDevice extends Homey.Device {
  declare homey: Homey.Device["homey"] & {
    app: TeslemetryApp;
  };
  declare driver: TeslemetryDriver;

  async onInit() {
    await this.ensureCapabilities();
  }

  public async ensureCapabilities() {
    const driverCapabilities = this.driver.manifest.capabilities || [];
    const deviceCapabilities = this.getCapabilities();

    // Remove extra capabilities
    for (const capability of deviceCapabilities) {
      if (!driverCapabilities.includes(capability)) {
        this.log(`Removing capability ${capability}`);
        await this.removeCapability(capability).catch((e) => {
          if (e.statusCode === 404) {
            this.log(
              `Could not remove capability ${capability} as it wasn't found`,
            );
          } else {
            this.error(e);
          }
        });
      }
    }

    // Add missing capabilities
    for (const capability of driverCapabilities) {
      if (!deviceCapabilities.includes(capability)) {
        this.log(`Adding capability ${capability}`);
        await this.addCapability(capability).catch((e) => {
          if (e.statusCode === 404) {
            this.log(
              `Could not add capability ${capability} as it wasn't found`,
            );
          } else {
            this.error(e);
          }
        });
      }
    }
  }

  /**
   * Safely updates a capability value if its supported.
   * @param capability The capability to update.
   * @param value The value from the API
   */
  public async update(capability: string, value: any): Promise<void> {
    // Check if capability is supported
    if (!this.getCapabilities().includes(capability)) {
      this.log(`Capability ${capability} is not supported`);
      return;
    }
    // Evaluate value if required
    if (typeof value === "function") value = value();
    // Check if value is undefined
    if (value === undefined) {
      return;
    }
    // Set the capability value
    //this.log(`Setting capability ${capability} to ${value}`);
    return this.setCapabilityValue(capability, value).catch(this.error);
  }

  protected handleApiResponse = ({ response }: { response: any }): void => {
    if (response.result === false) {
      throw {
        response: null,
        error: "command_failed",
        error_description: response.reason,
      };
    }
  };

  protected handleApiError = ({
    error,
    error_description,
  }: TeslemetryApiError): never => {
    const key = `error.${error}`;
    const translation = this.homey.__(key);
    if (translation && translation !== key) {
      this.error(translation);
      if (error === "invalid_token" || error === "subscription_required") {
        this.setUnavailable(translation).catch(this.error);
      }
      throw new Error(translation);
    }
    this.error(error_description);
    if (error === "invalid_token" || error === "subscription_required") {
      this.setUnavailable(error_description).catch(this.error);
    }
    throw new Error(error_description);
  };
}

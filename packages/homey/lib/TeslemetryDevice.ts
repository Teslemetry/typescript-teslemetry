import Homey from "homey";
import type TeslemetryApp from "../app.js";

export default class TeslemetryDevice extends Homey.Device {
  declare homey: Homey.Device["homey"] & {
    app: TeslemetryApp;
  };

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
      this.log(`Capability ${capability} value is undefined`);
      return;
    }
    // Set the capability value
    //this.log(`Setting capability ${capability} to ${value}`);
    return this.setCapabilityValue(capability, value).catch(this.error);
  }
}

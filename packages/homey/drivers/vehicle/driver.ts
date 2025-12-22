import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

const icon: Record<string, { icon: string }> = {
  "3": { icon: "model3.svg" },
  Y: { icon: "modelY.svg" },
  S: { icon: "modelS.svg" },
  X: { icon: "modelX.svg" },
  C: { icon: "cybertruck.svg" },
};

export default class VehicleDriver extends TeslemetryDriver {
  async onInit() {
    this.homey.log("Vehicle driver initialized");
  }

  async onPairListDevices() {
    this.homey.log("Listing vehicles for pairing...");
    const app = this.homey.app as TeslemetryApp;

    try {
      const products = await app.getProducts();

      if (!products || !products.vehicles) {
        this.homey.log("No vehicles found or products not loaded");
        return [];
      }

      // Only includes vehicles with a subscription, that support fleet telemetry, and are configured correctly
      return Object.values(products.vehicles)
        .filter(
          ({ metadata }) =>
            metadata.access && !!metadata.fleet_telemetry && !metadata.polling,
        )
        .map((data) => ({
          name: data.name,
          data: {
            vin: data.vin,
          },
          capabilitiesOptions: {
            frunk: { setable: data.metadata.config?.can_actuate_trunks },
            trunk: { setable: data.metadata.config?.can_actuate_trunks },
          },
          ...icon?.[data.vin[3]],
        }));
    } catch (error) {
      this.homey.error("Failed to list vehicles:", error);
      throw new Error(
        "Failed to load vehicles from Teslemetry. Please check your connection and try again.",
      );
    }
  }
}

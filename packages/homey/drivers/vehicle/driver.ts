import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

const model = (vin: string) => {
  switch (vin[3]) {
    case "3":
      return "Model 3";
    case "S":
      return "Model S";
    case "X":
      return "Model X";
    case "Y":
      return "Model Y";
    case "C":
      return "Cybertruck";
    case "T":
      return "Semi";
    default:
      return "Unknown Model";
  }
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

      return Object.values(products.vehicles).map((data) => ({
        name: data.product.display_name || `Tesla ${model(data.vin)}`,
        data: {
          vin: data.vin,
        },
      }));
    } catch (error) {
      this.homey.error("Failed to list vehicles:", error);
      throw new Error(
        "Failed to load vehicles from Teslemetry. Please check your connection and try again.",
      );
    }
  }
}

import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

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

      const vehicles = Object.values(products.vehicles);

      if (vehicles.length === 0) {
        this.homey.log("No vehicles found in Teslemetry account");
        return [];
      }

      return vehicles.map((vehicle: any) => ({
        name: vehicle.display_name || `Tesla ${vehicle.model || "Vehicle"}`,
        data: {
          id: vehicle.id,
          vin: vehicle.vin,
          vehicle_id: vehicle.vehicle_id,
        },
        store: {
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          state: vehicle.state,
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

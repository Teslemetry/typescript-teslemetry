import Homey from "homey";
import type TeslemetryApp from "../../app.js";

export default class VehicleDriver extends Homey.Driver {
  async onInit() {
    this.homey.log("Vehicle driver initialized");
  }

  async onPair(session: any) {
    let codeVerifier: string;
    const app = this.homey.app as TeslemetryApp;

    session.setHandler("showView", async (viewId: string) => {
      if (viewId === "login_oauth2") {
        const pkce = app.oauth.generatePKCE();
        codeVerifier = pkce.codeVerifier;
        const state = Math.random().toString(36).substring(7);
        const url = app.oauth.getAuthorizationUrl(state, pkce.codeChallenge);
        session.emit("url", url);
      }
    });

    session.setHandler("login", async (data: any) => {
      await app.oauth.exchangeCodeForToken(data.code, codeVerifier);
      return true;
    });

    session.setHandler("list_devices", async () => {
      return this.onPairListDevices();
    });
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

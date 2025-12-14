import { OAuth2Driver } from "homey-oauth2app";
import type TeslemetryApp from "../../app.js";
import type TeslemetryOAuth2Client from "../../lib/TeslemetryOAuth2Client.js";

export default class VehicleDriver extends OAuth2Driver {
  async onOAuth2Init() {
    this.homey.log("Vehicle driver initialized with OAuth2");
  }

  async onPairListDevices({
    oAuth2Client,
  }: {
    oAuth2Client: TeslemetryOAuth2Client;
  }) {
    this.homey.log("Listing vehicles for pairing...");

    try {
      // Get access token and use with Teslemetry SDK
      const { Teslemetry } = await import("@teslemetry/api");

      const accessToken = await oAuth2Client.getAccessToken();
      const teslemetry = new Teslemetry(accessToken);
      const products = await teslemetry.createProducts();

      const vehicles = Object.values(products.vehicles);

      if (!vehicles || vehicles.length === 0) {
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

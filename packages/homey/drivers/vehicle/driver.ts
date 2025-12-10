import Homey from "homey";
import type TeslemetryApp from "../../app.js";
import { Products, Teslemetry } from "@teslemetry/api";

export default class VehicleDriver extends Homey.Driver {
  async onPairListDevices() {
    const app = this.homey.app as TeslemetryApp;

    if (!app.isConfigured()) {
      throw new Error(
        "App not configured - please set up your Teslemetry access token in app settings",
      );
    }

    const products = await app.getProducts();
    if (!products) {
      throw new Error(
        "Failed to load vehicles - check your access token in app settings",
      );
    }

    return Object.values(products.vehicles).map((data) => ({
      name: data.name,
      data,
    }));
  }
}

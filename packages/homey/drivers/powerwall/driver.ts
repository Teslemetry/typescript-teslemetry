import Homey from "homey";
import type TeslemetryApp from "../../app.js";

export default class PowerwallDriver extends Homey.Driver {
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
        "Failed to load energy sites - check your access token in app settings",
      );
    }

    return Object.values(products.energySites).map((data) => ({
      name: data.name,
      data,
      energy: {
        batteries: [],
      },
    }));
  }
}

export type PowerwallDriverType = PowerwallDriver;

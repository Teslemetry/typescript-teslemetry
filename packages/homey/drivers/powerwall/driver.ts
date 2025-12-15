import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class PowerwallDriver extends TeslemetryDriver {
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
      data: {
        id: data.product.energy_site_id,
      },
      energy: {
        batteries: [],
      },
    }));
  }
}

export type PowerwallDriverType = PowerwallDriver;

import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class WallConnectorDriver extends TeslemetryDriver {
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

    return Object.values(products.energySites).flatMap(
      (site) =>
        site.product.components?.wall_connectors?.map((data) => ({
          name: `${site.name} - ${data.device_id}`,
          data: {
            site: site.product.energy_site_id,
            id: data.device_id,
          },
        })) || [],
    );
  }
}

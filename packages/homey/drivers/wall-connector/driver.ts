import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class WallConnectorDriver extends TeslemetryDriver {
  async onPairListDevices() {
    if (!this.homey.app.isConfigured()) {
      throw new Error(
        "App not configured - please set up your Teslemetry access token in app settings",
      );
    }

    const products = await this.homey.app.getProducts();
    if (!products) {
      throw new Error(
        "Failed to load energy sites - check your access token in app settings",
      );
    }

    const sitesResults = await Promise.all(
      Object.values(products.energySites)
        .filter(({ metadata }) => metadata.access)
        .map(async (site) => {
          const siteInfo = await site.api.getSiteInfo();
          const wallConnectors =
            siteInfo.response?.components?.wall_connectors ?? [];

          return wallConnectors.map((connector) => ({
            name: `${site.name} ${connector.part_name}`,
            data: {
              site: site.id,
              din: connector.din,
            },
          }));
        }),
    );
    return sitesResults.flat();
  }
}

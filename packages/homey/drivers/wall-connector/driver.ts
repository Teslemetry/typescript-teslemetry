import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class WallConnectorDriver extends TeslemetryDriver {
  async onPairListDevices() {
    const products = await this.homey.app.getProducts();
    if (!products) {
      throw new Error(
        "Failed to load wall connectors from Teslemetry. Please check your connection and try again.",
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

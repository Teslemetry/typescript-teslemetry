import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class GatewayDriver extends TeslemetryDriver {
  async onPairListDevices() {
    const products = await this.homey.app.getProducts();
    if (!products) {
      throw new Error(
        "Failed to load products. Please restart the pairing process",
      );
    }

    return (
      await Promise.all(
        Object.values(products.energySites).map(async (site) => {
          // Assume all sites have a gateway/grid connection or check components.grid
          const siteInfo = await site.api.getSiteInfo();
          if (!siteInfo) return null;

          return {
            name: `${site.name} Gateway`,
            data: {
              id: site.id,
            },
            class: "sensor",
          };
        }),
      )
    ).filter((device): device is NonNullable<typeof device> => device !== null);
  }
}

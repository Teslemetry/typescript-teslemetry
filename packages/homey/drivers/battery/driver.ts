import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class PowerwallDriver extends TeslemetryDriver {
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
          const siteInfo = await site.api.getSiteInfo();
          if (!siteInfo?.response.components.battery) return null;

          return {
            name: `${site.name} Powerwall`,
            data: {
              id: site.id,
            },
            class: "battery",
          };
        }),
      )
    ).filter((device): device is NonNullable<typeof device> => device !== null);
  }
}

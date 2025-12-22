import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";
import { getCapabilities } from "./capabilities.js";

const icon: Record<string, { icon: string }> = {
  powerwall: { icon: "powerwall.svg" },
  solar: { icon: "solar.svg" },
};

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

    return await Promise.all(
      Object.values(products.energySites)
        .filter(({ metadata }) => !!metadata.access)
        .map(async (site) => {
          const { response: siteInfo } = await site.api.getSiteInfo();
          const { deviceClass, capabilities } = getCapabilities(siteInfo);

          return {
            name: site.name,
            data: {
              id: site.id,
            },
            capabilities: Array.from(capabilities),
            class: deviceClass,
            energy: {
              homeBattery: siteInfo.components.battery,
            },
            ...icon?.[deviceClass],
          };
        }),
    );
  }
}

export type PowerwallDriverType = PowerwallDriver;

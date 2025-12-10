import Homey from "homey";
import type TeslemetryApp from "../../app.js";
import { Products } from "@teslemetry/api";

module.exports = class MyDriver extends Homey.Driver {
  energySites: Products["energySites"] = {};

  async onInit(): Promise<void> {
    const app = this.homey.app as TeslemetryApp;
    if (!app.products) throw new Error("Products not initialized");
    this.energySites = app.products.energySites;
  }

  async onPairListDevices() {
    return Object.values(this.energySites || {}).flatMap(
      (site) =>
        site.product.components?.wall_connectors?.map((data) => ({
          name: `${site.name} - ${data.device_id}`,
          data: {
            data,
            site,
          },
        })) || [],
    );
  }
};

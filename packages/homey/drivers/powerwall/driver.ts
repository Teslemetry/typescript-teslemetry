import Homey from "homey";
import type TeslemetryApp from "../../app.js";
import { Products } from "@teslemetry/api";

export default class PowerwallDriver extends Homey.Driver {
  energySites: Products["energySites"] = {};

  async onInit(): Promise<void> {
    const app = this.homey.app as TeslemetryApp;
    if (!app.products) throw new Error("Products not initialized");
    this.energySites = app.products.energySites;
  }

  async onPairListDevices() {
    return Object.values(this.energySites).map((data) => ({
      name: data.name,
      data,
      energy: {
        batteries: [],
      },
    }));
  }
}

export type PowerwallDriverType = PowerwallDriver;

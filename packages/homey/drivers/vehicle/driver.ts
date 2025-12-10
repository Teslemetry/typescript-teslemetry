import Homey from "homey";
import type TeslemetryApp from "../../app.js";
import { Products, Teslemetry } from "@teslemetry/api";

export default class VehicleDriver extends Homey.Driver {
  vehicles: Products["vehicles"] = {};

  async onInit(): Promise<void> {
    const app = this.homey.app as TeslemetryApp;
    if (!app.products) throw new Error("Products not initialized");
    this.vehicles = app.products.vehicles;
  }

  async onPairListDevices() {
    return Object.values(this.vehicles).map((data) => ({
      name: data.name,
      data,
    }));
  }
}

"use strict";

import Homey from "homey";
import { Products, Teslemetry } from "@teslemetry/api";

export default class TeslemetryApp extends Homey.App {
  teslemetry?: Teslemetry;
  products?: Products;

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    const accessToken = this.homey.settings.get("access_token") as string;
    if (!accessToken) {
      this.homey.log("No access token found");
      return;
    }
    this.teslemetry = new Teslemetry(accessToken);
    this.products = await this.teslemetry.createProducts();
  }

  async onUninit() {
    this.teslemetry?.sse.close();
  }
}

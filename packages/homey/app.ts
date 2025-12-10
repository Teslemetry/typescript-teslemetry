"use strict";

import Homey from "homey";
import Teslemetry from "@teslemetry/api";

module.exports = class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log("MyApp has been initialized");
  }
};

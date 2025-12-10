import Homey from "homey";
import { EnergyDetails, TeslemetryEnergyApi } from "@teslemetry/api";

export default class PowerwallDevice extends Homey.Device {
  api?: TeslemetryEnergyApi;

  async onInit() {
    const { api } = this.getData() as EnergyDetails;
    this.api = api;
  }

  async onAdded() {
    this.log("Device added");
  }

  /*async updateState() {
    try {
      const data = await this.api.getLiveStatus();
      const status = data.response;

      if (status) {
        if (status.percentage_charged !== undefined) {
          await this.setCapabilityValue(
            "measure_battery",
            status.percentage_charged,
          ).catch(this.error);
        }
        if (status.load_power !== undefined) {
          await this.setCapabilityValue(
            "measure_power",
            status.load_power,
          ).catch(this.error);
        }
      }
    } catch (e) {
      this.error(e);
    }
  }*/
}

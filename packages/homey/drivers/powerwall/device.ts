import { EnergyDetails, TeslemetryEnergyApi } from "@teslemetry/api";
import TeslemetryApp from "../../app.js";
import { TeslemetryDevice } from "../../lib/TeslemetryDevice.js";

export default class PowerwallDevice extends TeslemetryDevice {
  site!: EnergyDetails;
  updateInterval!: NodeJS.Timeout;

  async onInit() {
    try {
      const app = this.homey.app as TeslemetryApp;
      const site = app.products?.energySites?.[this.getData().id];
      if (!site) throw new Error("No site found");
      this.site = site;
    } catch (e) {
      this.log("Failed to initialize Powerwall device");
      this.error(e);
    }
  }

  async onAdded() {
    this.log("Device added");
  }
  private setupPeriodicUpdates() {
    // Update every 5 minutes
    this.updateInterval = setInterval(
      async () => {
        try {
          await this.refresh();
        } catch (error) {
          this.homey.error("Failed to update vehicle state:", error);
        }
      },
      5 * 60 * 1000,
    );
  }

  async refresh() {
    try {
      const { response } = await this.site.api.getLiveStatus();

      if (response) {
        if (response.percentage_charged !== undefined) {
          await this.setCapabilityValue(
            "measure_battery",
            response.percentage_charged,
          ).catch(this.error);
        }
        if (response.load_power !== undefined) {
          await this.setCapabilityValue(
            "measure_power",
            response.load_power,
          ).catch(this.error);
        }
      }
    } catch (e) {
      this.error(e);
    }
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

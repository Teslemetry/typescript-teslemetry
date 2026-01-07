import { EnergyDetails } from "@teslemetry/api";
import TeslemetryDevice from "../../lib/TeslemetryDevice.js";

export default class SolarDevice extends TeslemetryDevice {
  site!: EnergyDetails;
  pollingCleanup!: Array<() => void>;

  async onInit() {
    await super.onInit();

    try {
      const site = this.homey.app.products?.energySites?.[this.getData().id];
      if (!site) throw new Error("No site found");
      this.site = site;
    } catch (e) {
      this.log("Failed to initialize Solar device");
      this.error(e);
      return;
    }

    this.pollingCleanup = [this.site.api.requestPolling("liveStatus")];

    this.site.api.on("liveStatus", (liveStatus) => {
      const data = liveStatus?.response;
      if (!data) return;
      this.update("measure_power", data.solar_power);
    });

    this.site.api.on("energyHistory", async (energyHistory) => {
      if (!energyHistory.response?.time_series?.length) return;

      let generated: number | null = null;

      for (const event of energyHistory.response.time_series) {
        if (
          event.total_solar_generation !== undefined &&
          event.total_solar_generation !== null
        ) {
          // @ts-expect-error
          generated += event.total_solar_generation;
        }
      }

      if (generated !== null) this.update("meter_power", generated / 1000);
    });
  }

  async onUninit() {
    this.pollingCleanup?.forEach((stop) => stop());
  }
}

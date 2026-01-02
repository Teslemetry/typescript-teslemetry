import { EnergyDetails } from "@teslemetry/api";
import TeslemetryDevice from "../../lib/TeslemetryDevice.js";

export default class PowerwallDevice extends TeslemetryDevice {
  site!: EnergyDetails;
  pollingCleanup!: Array<() => void>;

  async onInit() {
    await super.onInit();

    try {
      const site = this.homey.app.products?.energySites?.[this.getData().id];
      if (!site) throw new Error("No site found");
      this.site = site;
    } catch (e) {
      this.log("Failed to initialize Powerwall device");
      this.error(e);
      return;
    }

    this.pollingCleanup = [
      this.site.api.requestPolling("siteInfo"),
      this.site.api.requestPolling("liveStatus"),
      this.site.api.requestPolling("energyHistory"),
    ];

    this.site.api.on("liveStatus", (liveStatus) => {
      const data = liveStatus?.response;
      if (!data) return;

      this.update("measure_battery", data.percentage_charged);
      this.update(
        "measure_power",
        data.battery_power !== undefined ? data.battery_power * -1 : undefined,
      );
      this.update("alarm_storm_watch_active", data.storm_mode_active);
    });

    this.site.api.on("siteInfo", async (siteInfo) => {
      const data = siteInfo?.response;
      if (!data) return;

      this.update(
        "backup_reserve",
        data.backup_reserve_percent !== undefined
          ? data.backup_reserve_percent / 100
          : undefined,
      );
      this.update("operation_mode", data.default_real_mode);
      this.update(
        "allow_export",
        (data.components.customer_preferred_export_rule ??
          data.components.non_export_configured)
          ? "never"
          : "battery_ok",
      );
      this.update(
        "charge_from_grid",
        // When this is missing, its allowed
        !data.components.disallow_charge_from_grid_with_solar_installed,
      );
      this.update("storm_watch", data.user_settings.storm_mode_enabled);
    });

    this.site.api.on("energyHistory", async (energyHistory) => {
      this.log(energyHistory);
      if (!energyHistory.response?.time_series?.length) return;

      let imported = 0;
      let exported = 0;

      for (const event of energyHistory.response.time_series) {
        if (
          event.total_battery_charge !== undefined &&
          event.total_battery_charge !== null
        ) {
          imported += event.total_battery_charge;
        }
        if (
          event.total_battery_discharge !== undefined &&
          event.total_battery_discharge !== null
        ) {
          exported += event.total_battery_discharge;
        }
      }

      if (imported) this.update("meter_power.imported", imported);
      if (exported) this.update("meter_power.exported", exported);

      this.log(`Imported: ${imported}, Exported: ${exported}`);
    });

    // Register capability listeners
    this.registerCapabilityListener("backup_reserve", async (value) => {
      this.log(
        `Setting backup reserve to ${Math.round(value * 100)} (from ${value})`,
      );
      await this.site.api
        .setBackupReserve(Math.round(value * 100))
        .catch(this.handleApiError);
    });

    this.registerCapabilityListener("allow_export", async (value) => {
      this.log(`Setting allow export to ${value}`);
      await this.site.api
        .gridImportExport(value, this.getCapabilityValue("charge_from_grid"))
        .catch(this.handleApiError);
    });

    this.registerCapabilityListener("operation_mode", async (value) => {
      this.log(`Setting operation mode to ${value}`);
      await this.site.api.setOperationMode(value).catch(this.handleApiError);
    });

    this.registerCapabilityListener("charge_from_grid", async (value) => {
      // When this is missing, its allowed
      this.log(`Setting charge from grid to ${!value}`);
      await this.site.api
        .gridImportExport(this.getCapabilityValue("allow_export"), !value)
        .catch(this.handleApiError);
    });

    this.registerCapabilityListener("storm_watch", async (value) => {
      await this.site.api.setStormMode(value).catch(this.handleApiError);
    });
  }

  async onUninit(): Promise<void> {
    this.pollingCleanup?.forEach((stop) => stop());
  }
}

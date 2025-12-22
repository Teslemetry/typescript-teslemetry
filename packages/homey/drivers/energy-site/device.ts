import { EnergyDetails } from "@teslemetry/api";
import TeslemetryDevice from "../../lib/TeslemetryDevice.js";
import { getCapabilities } from "./capabilities.js";

const gridStatusMap = new Map<any, boolean>([
  ["Active", false],
  ["Inactive", true],
]);

const islandStatusMap = new Map<any, boolean>([
  ["off_grid_intentional", true],
  ["off_grid_unintentional", true],
  ["on_grid", false],
]);

export default class PowerwallDevice extends TeslemetryDevice {
  site!: EnergyDetails;
  pollingCleanup!: Array<() => void>;

  async onInit() {
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
    ];

    this.site.api.on("liveStatus", (liveStatus) => {
      const data = liveStatus?.response;
      if (!data) return;

      // Map Live Status fields
      this.update("measure_battery", data.percentage_charged);
      this.update(
        "measure_power_battery",
        data.battery_power !== undefined ? data.battery_power * -1 : undefined,
      );
      this.update("measure_power_solar", data.solar_power);
      this.update("measure_power_grid", data.grid_power);
      this.update("measure_power_load", data.load_power);
      this.update("alarm_off_grid", gridStatusMap.get(data.grid_status));
      this.update(
        "alarm_island_status",
        islandStatusMap.get(data.island_status),
      );
      this.update("alarm_storm_watch_active", data.storm_mode_active);
    });

    this.site.api.on("siteInfo", async (siteInfo) => {
      const data = siteInfo?.response;
      if (!data) return;

      // Ensure class and capabilities are correct
      const { capabilities } = getCapabilities(data);
      const currentCapabilities = this.getCapabilities();

      // Add new capabilities
      for (const capability of capabilities) {
        if (!currentCapabilities.includes(capability)) {
          this.log(`Adding capability ${capability}`);
          await this.addCapability(capability);
        }
      }

      // Remove old capabilities
      for (const capability of currentCapabilities) {
        if (!capabilities.includes(capability)) {
          this.log(`Removing capability ${capability}`);
          await this.removeCapability(capability);
        }
      }

      // Update capabilities

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

    // Register capability listeners
    this.registerCapabilityListener("backup_reserve", async (value) => {
      this.log(
        `Setting backup reserve to ${Math.round(value * 100)} (from ${value})`,
      );
      await this.site.api.setBackupReserve(Math.round(value * 100));
    });

    this.registerCapabilityListener("allow_export", async (value) => {
      this.log(`Setting allow export to ${value}`);
      await this.site.api.gridImportExport(
        value,
        this.getCapabilityValue("charge_from_grid"),
      );
    });

    this.registerCapabilityListener("operation_mode", async (value) => {
      this.log(`Setting operation mode to ${value}`);
      await this.site.api.setOperationMode(value);
    });

    this.registerCapabilityListener("charge_from_grid", async (value) => {
      // When this is missing, its allowed
      this.log(`Setting charge from grid to ${!value}`);
      await this.site.api.gridImportExport(
        this.getCapabilityValue("allow_export"),
        !value,
      );
    });

    this.registerCapabilityListener("storm_watch", async (value) => {
      await this.site.api.setStormMode(value);
    });
  }

  async onUninit(): Promise<void> {
    this.pollingCleanup.forEach((stop) => stop());
  }
}

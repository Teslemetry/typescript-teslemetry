/**
 * Grid Charging Service
 *
 * Controls whether the Powerwall can charge from the grid
 */

import { BaseEnergyService } from "./base.js";

/**
 * GridChargingService
 *
 * Represents grid charging permission as a switch
 */
export class GridChargingService extends BaseEnergyService {
  private currentExportSetting: "battery_ok" | "never" | "pv_only" = "battery_ok";

  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    site: import("@teslemetry/api").EnergyDetails,
  ) {
    super(
      platform,
      accessory,
      site,
      platform.Service.Switch,
      "Grid Charging",
      "grid-charging", // subType
    );

    // Subscribe to site info updates for grid charging status
    this.subscribeToEvent("siteInfo", (data: any) => {
      if (data?.response?.components) {
        const components = data.response.components;

        // Grid charging is allowed when disallow_charge_from_grid_with_solar_installed is false/missing
        const isAllowed = !components.disallow_charge_from_grid_with_solar_installed;

        this.service.updateCharacteristic(
          this.platform.Characteristic.On,
          isAllowed,
        );

        // Store current export setting for API calls
        if (components.customer_preferred_export_rule !== undefined ||
            components.non_export_configured !== undefined) {
          this.currentExportSetting =
            (components.customer_preferred_export_rule ?? components.non_export_configured)
              ? "never"
              : "battery_ok";
        }
      }
    });

    // Handle grid charging on/off commands
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        const allowed = value as boolean;

        this.platform.log.info(
          `${allowed ? "Enabling" : "Disabling"} grid charging for ${site.name}`,
        );

        // The API requires both export and import (disallow charging) settings
        // We maintain the current export setting and toggle the charging setting
        await site.api.gridImportExport(
          this.currentExportSetting,
          !allowed, // disallow_charge_from_grid
        );
      },
    );

    this.platform.log.debug(
      `Grid charging service initialized for ${site.name}`,
    );
  }
}

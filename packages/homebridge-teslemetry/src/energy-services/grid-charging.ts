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

        // Send only the grid charging flag: the export rule is a separate
        // setting this switch must never rewrite. The cast is needed because
        // the SDK signature still makes the rule mandatory; the API does not.
        await this.command(site.api.gridImportExport(
          undefined as never,
          !allowed, // disallow_charge_from_grid
        ));
      },
    );

    this.platform.log.debug(
      `Grid charging service initialized for ${site.name}`,
    );
  }
}

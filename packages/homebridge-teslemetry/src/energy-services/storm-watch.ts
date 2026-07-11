/**
 * Storm Watch Service
 *
 * Controls Tesla Storm Watch mode
 */

import { BaseEnergyService } from "./base.js";

/**
 * StormWatchService
 *
 * Represents Storm Watch as a switch
 */
export class StormWatchService extends BaseEnergyService {
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
      "Storm Watch",
      "storm-watch", // subType
    );

    // Subscribe to site info updates for Storm Watch status
    this.subscribeToEvent("siteInfo", (data: any) => {
      if (data?.response?.user_settings?.storm_mode_enabled !== undefined) {
        this.service.updateCharacteristic(
          this.platform.Characteristic.On,
          data.response.user_settings.storm_mode_enabled,
        );
      }
    });

    // Handle Storm Watch on/off commands
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (value) {
          this.platform.log.info(`Enabling Storm Watch for ${site.name}`);
          await site.api.setStormMode(true);
        } else {
          this.platform.log.info(`Disabling Storm Watch for ${site.name}`);
          await site.api.setStormMode(false);
        }
      },
    );

    this.platform.log.debug(`Storm Watch service initialized for ${site.name}`);
  }
}

/**
 * Sentry Mode Service
 *
 * Controls Tesla Sentry Mode
 */

import { BaseService } from "./base.js";

/**
 * SentryService
 *
 * Represents Sentry Mode as a switch
 */
export class SentryService extends BaseService {
  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.Switch,
      "Sentry Mode",
      "sentry", // subType
    );

    // Subscribe to sentry mode updates
    this.subscribeSignal(
      "SentryMode",
      this.platform.Characteristic.On,
      (mode: string) => {
        // Sentry is on if mode is not "Off"
        return mode !== "SentryModeStateOff";
      },
    );

    // Handle sentry mode on/off commands
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (value) {
          // Turn on sentry mode
          this.platform.log.info(`Turning on sentry mode for ${vehicle.name}`);
          await vehicle.api.setSentryMode(true);
        } else {
          // Turn off sentry mode
          this.platform.log.info(`Turning off sentry mode for ${vehicle.name}`);
          await vehicle.api.setSentryMode(false);
        }
      },
    );

    this.platform.log.debug(`Sentry service initialized for ${vehicle.name}`);
  }
}

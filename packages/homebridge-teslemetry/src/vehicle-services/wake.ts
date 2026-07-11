/**
 * Wake Service
 *
 * Allows waking up the vehicle from sleep
 */

import { BaseService } from "./base.js";

/**
 * WakeService
 *
 * Represents vehicle wake as a momentary switch (turns off after triggering)
 */
export class WakeService extends BaseService {
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
      "Wake",
      "wake", // subType
    );

    // Wake switch is always off (it's a momentary trigger)
    this.service.updateCharacteristic(this.platform.Characteristic.On, false);

    // Handle wake command
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (value) {
          // Wake up the vehicle
          this.platform.log.info(`Waking up ${vehicle.name}`);

          try {
            await vehicle.api.wakeUp();
            this.platform.log.info(`${vehicle.name} wake command sent`);
          } catch (error) {
            this.platform.log.error(`Failed to wake ${vehicle.name}:`, error);
            throw error;
          } finally {
            // Always turn the switch back off (momentary behavior)
            setTimeout(() => {
              this.service.updateCharacteristic(
                this.platform.Characteristic.On,
                false,
              );
            }, 1000); // Wait 1 second before resetting
          }
        }
      },
    );

    this.platform.log.debug(`Wake service initialized for ${vehicle.name}`);
  }
}

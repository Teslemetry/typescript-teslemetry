/**
 * Charge Switch Service
 *
 * Controls starting and stopping charging
 */

import { BaseService } from "./base.js";

/**
 * ChargeSwitchService
 *
 * Represents charging as a switch (on = charging, off = not charging)
 */
export class ChargeSwitchService extends BaseService {
  constructor(
    platform: ReturnType<typeof import("../platform.js").TeslemetryPlatform>,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.Switch,
      "Charging",
      "charging", // subType
    );

    // Subscribe to charge state updates
    this.subscribeSignal(
      "ChargeState",
      this.platform.Characteristic.On,
      (state: string) => {
        // Charging is "on" if actively charging or starting
        return (
          state === "ChargeStateCharging" || state === "ChargeStateStarting"
        );
      },
    );

    // Handle start/stop charging commands
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (value) {
          // Start charging
          this.platform.log.info(`Starting charging for ${vehicle.name}`);
          await vehicle.api.startCharging();
        } else {
          // Stop charging
          this.platform.log.info(`Stopping charging for ${vehicle.name}`);
          await vehicle.api.stopCharging();
        }
      },
    );

    this.platform.log.debug(
      `Charge switch service initialized for ${vehicle.name}`,
    );
  }
}

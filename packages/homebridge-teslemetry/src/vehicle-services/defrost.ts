/**
 * Defrost Service
 *
 * Controls max defrost mode
 */

import { BaseService } from "./base.js";

/**
 * DefrostService
 *
 * Represents max defrost as a switch
 */
export class DefrostService extends BaseService {
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
      "Defrost",
      "defrost", // subType
    );

    // Subscribe to defrost mode updates
    this.subscribeSignal(
      "DefrostMode",
      this.platform.Characteristic.On,
      (mode: string) => {
        // Defrost is on if mode is "Max" or "On"
        return mode === "DefrostModeOn" || mode === "DefrostModeStateMax";
      },
    );

    // Handle defrost on/off commands
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (value) {
          // Turn on max defrost
          this.platform.log.info(`Turning on max defrost for ${vehicle.name}`);
          await vehicle.api.setPreconditioningMax({ on: true });
        } else {
          // Turn off max defrost
          this.platform.log.info(`Turning off max defrost for ${vehicle.name}`);
          await vehicle.api.setPreconditioningMax({ on: false });
        }
      },
    );

    this.platform.log.debug(`Defrost service initialized for ${vehicle.name}`);
  }
}

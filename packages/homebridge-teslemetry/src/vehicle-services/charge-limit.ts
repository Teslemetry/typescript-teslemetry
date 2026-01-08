/**
 * Charge Limit Service
 *
 * Controls the charge limit percentage (50-100%)
 */

import { BaseService } from "./base.js";

/**
 * ChargeLimitService
 *
 * Represents charge limit as a lightbulb brightness (creative use of HomeKit service)
 * Brightness percentage = charge limit percentage
 */
export class ChargeLimitService extends BaseService {
  constructor(
    platform: ReturnType<typeof import("../platform.js").TeslemetryPlatform>,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.Lightbulb,
      "Charge Limit",
      "charge-limit", // subType
    );

    // Charge limit is always "on" (we just control the brightness/percentage)
    this.service.updateCharacteristic(this.platform.Characteristic.On, true);

    // Subscribe to charge limit updates
    this.subscribeSignal(
      "ChargeLimit",
      this.platform.Characteristic.Brightness,
      (limit: number) => {
        // Ensure limit is within valid range (50-100)
        return Math.max(50, Math.min(100, limit));
      },
    );

    // Handle charge limit changes
    this.registerCharacteristicSet(
      this.platform.Characteristic.Brightness,
      async (value) => {
        const limit = Math.round(value as number);
        this.platform.log.info(
          `Setting charge limit to ${limit}% for ${vehicle.name}`,
        );

        await vehicle.api.setChargeLimit({ percent: limit });
      },
    );

    // Prevent turning off the "lightbulb" - it should always be on
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (!value) {
          // If user tries to turn it off, turn it back on
          this.service.updateCharacteristic(
            this.platform.Characteristic.On,
            true,
          );
          this.platform.log.warn(
            `Charge limit cannot be turned off (${vehicle.name})`,
          );
        }
      },
    );

    this.platform.log.debug(
      `Charge limit service initialized for ${vehicle.name}`,
    );
  }
}

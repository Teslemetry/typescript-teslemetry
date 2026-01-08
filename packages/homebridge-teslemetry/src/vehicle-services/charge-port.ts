/**
 * Charge Port Service
 *
 * Controls opening and closing the charge port
 */

import { BaseService } from "./base.js";

/**
 * ChargePortService
 *
 * Represents the charge port as a lock mechanism
 * Open = Unsecured, Closed = Secured
 */
export class ChargePortService extends BaseService {
  constructor(
    platform: ReturnType<typeof import("../platform.js").TeslemetryPlatform>,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.LockMechanism,
      "Charge Port",
      "charge-port", // subType to differentiate from door lock
    );

    // Subscribe to charge port door state
    this.subscribeSignal(
      "ChargePortDoorOpen",
      this.platform.Characteristic.LockCurrentState,
      (isOpen: boolean) => {
        const { LockCurrentState } = this.platform.Characteristic;
        const state = isOpen ? LockCurrentState.UNSECURED : LockCurrentState.SECURED;

        // Also update target state to match
        this.service.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          isOpen
            ? this.platform.Characteristic.LockTargetState.UNSECURED
            : this.platform.Characteristic.LockTargetState.SECURED,
        );

        return state;
      },
    );

    // Handle open/close commands
    this.registerCharacteristicSet(
      this.platform.Characteristic.LockTargetState,
      async (value) => {
        const { LockTargetState, LockCurrentState } = this.platform.Characteristic;

        if (value === LockTargetState.UNSECURED) {
          // Open charge port
          this.platform.log.info(`Opening charge port for ${vehicle.name}`);
          await vehicle.api.openChargePort();

          // Optimistically update current state
          this.service.updateCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            LockCurrentState.UNSECURED,
          );
        } else {
          // Close charge port
          this.platform.log.info(`Closing charge port for ${vehicle.name}`);
          await vehicle.api.closeChargePort();

          // Optimistically update current state
          this.service.updateCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            LockCurrentState.SECURED,
          );
        }
      },
    );

    this.platform.log.debug(`Charge port service initialized for ${vehicle.name}`);
  }
}

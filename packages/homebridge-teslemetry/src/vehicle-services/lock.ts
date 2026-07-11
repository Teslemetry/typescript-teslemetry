/**
 * Lock Service
 *
 * Allows locking and unlocking vehicle doors
 */

import { BaseService } from "./base.js";

/**
 * LockService
 *
 * Controls vehicle door locks through HomeKit
 */
export class LockService extends BaseService {
  private currentLockState = this.platform.Characteristic.LockCurrentState.SECURED;

  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.LockMechanism,
      "Door Lock",
    );

    // Subscribe to lock state updates
    this.subscribeSignal(
      "Locked",
      this.platform.Characteristic.LockCurrentState,
      (locked: boolean) => {
        const { LockCurrentState } = this.platform.Characteristic;
        this.currentLockState = locked
          ? LockCurrentState.SECURED
          : LockCurrentState.UNSECURED;

        // Also update target state to match
        this.service.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          locked
            ? this.platform.Characteristic.LockTargetState.SECURED
            : this.platform.Characteristic.LockTargetState.UNSECURED,
        );

        return this.currentLockState;
      },
    );

    // Handle lock/unlock commands
    this.registerCharacteristicSet(
      this.platform.Characteristic.LockTargetState,
      async (value) => {
        const { LockTargetState, LockCurrentState } = this.platform.Characteristic;

        if (value === LockTargetState.SECURED) {
          this.platform.log.info(`Locking ${vehicle.name}`);
          await vehicle.api.lockDoors();

          // Optimistically update current state
          this.service.updateCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            LockCurrentState.SECURED,
          );
        } else {
          this.platform.log.info(`Unlocking ${vehicle.name}`);
          await vehicle.api.unlockDoors();

          // Optimistically update current state
          this.service.updateCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            LockCurrentState.UNSECURED,
          );
        }
      },
    );

    this.platform.log.debug(`Lock service initialized for ${vehicle.name}`);
  }
}

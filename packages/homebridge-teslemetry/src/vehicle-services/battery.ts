/**
 * Battery Service
 *
 * Shows battery level, charging state, and low battery status
 */

import { BaseService } from "./base.js";

/**
 * BatteryService
 *
 * Displays vehicle battery information in HomeKit
 */
export class BatteryService extends BaseService {
  private currentBatteryLevel = 100;

  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.Battery,
      "Battery",
    );

    // Subscribe to battery level updates
    this.subscribeSignal(
      "BatteryLevel",
      this.platform.Characteristic.BatteryLevel,
      (value: number) => {
        this.currentBatteryLevel = value;

        // Also update low battery status
        this.service.updateCharacteristic(
          this.platform.Characteristic.StatusLowBattery,
          value < 20
            ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
            : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
        );

        return value;
      },
    );

    // Subscribe to charging state updates
    this.subscribeSignal(
      "DetailedChargeState",
      this.platform.Characteristic.ChargingState,
      (state) => this.mapChargeState(state),
    );

    this.platform.log.debug(`Battery service initialized for ${vehicle.name}`);
  }

  /**
   * Map Tesla ChargeState to HomeKit ChargingState
   */
  private mapChargeState(state: string): number {
    const { ChargingState } = this.platform.Characteristic;

    switch (state) {
      case "DetailedChargeStateCharging":
      case "DetailedChargeStateStarting":
        return ChargingState.CHARGING;

      case "DetailedChargeStateComplete":
      case "DetailedChargeStateDisconnected":
      case "DetailedChargeStateStopped":
      case "DetailedChargeStateNoPower":
        return ChargingState.NOT_CHARGING;

      default:
        return ChargingState.NOT_CHARGEABLE;
    }
  }
}

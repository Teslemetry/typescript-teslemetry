/**
 * Energy Battery Service
 *
 * Shows Powerwall battery level and power flow status
 */

import { BaseEnergyService } from "./base.js";

/**
 * EnergyBatteryService
 *
 * Displays Powerwall battery information in HomeKit
 */
export class EnergyBatteryService extends BaseEnergyService {
  private currentBatteryLevel = 100;

  constructor(
    platform: ReturnType<typeof import("../platform.js").TeslemetryPlatform>,
    accessory: import("homebridge").PlatformAccessory,
    site: import("@teslemetry/api").EnergyDetails,
  ) {
    super(
      platform,
      accessory,
      site,
      platform.Service.Battery,
      "Battery",
    );

    // Subscribe to live status updates for battery level
    this.subscribeToEvent("liveStatus", (data: any) => {
      if (data?.response?.percentage_charged !== undefined) {
        this.currentBatteryLevel = Math.round(data.response.percentage_charged);

        // Update battery level
        this.service.updateCharacteristic(
          this.platform.Characteristic.BatteryLevel,
          this.currentBatteryLevel,
        );

        // Update low battery status (consider low if below 20%)
        this.service.updateCharacteristic(
          this.platform.Characteristic.StatusLowBattery,
          this.currentBatteryLevel < 20
            ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
            : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
        );
      }

      // Update charging state based on battery power
      if (data?.response?.battery_power !== undefined) {
        const batteryPower = data.response.battery_power;
        const { ChargingState } = this.platform.Characteristic;

        // Negative power = charging (power going into battery)
        // Positive power = discharging (power leaving battery)
        const chargingState = batteryPower < -100
          ? ChargingState.CHARGING
          : ChargingState.NOT_CHARGING;

        this.service.updateCharacteristic(
          this.platform.Characteristic.ChargingState,
          chargingState,
        );
      }
    });

    this.platform.log.debug(`Energy battery service initialized for ${site.name}`);
  }
}

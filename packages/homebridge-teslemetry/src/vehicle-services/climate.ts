/**
 * Climate Service
 *
 * Controls vehicle climate (HVAC) and temperature
 */

import { BaseService } from "./base.js";

/**
 * ClimateService
 *
 * Controls vehicle climate through HomeKit Thermostat service
 */
export class ClimateService extends BaseService {
  private targetTemperature = 20; // Default target temp in Celsius
  private isRHD = false; // Right-hand drive flag

  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.Thermostat,
      "Climate",
    );

    // Check if vehicle is right-hand drive
    this.isRHD = vehicle.metadata.config?.rhd || false;

    // Set valid ranges for temperature (Celsius)
    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: 15,
        maxValue: 28,
        minStep: 0.5,
      });

    // Subscribe to current temperature
    this.subscribeSignal(
      "InsideTemp",
      this.platform.Characteristic.CurrentTemperature,
    );

    // Subscribe to target temperature (use appropriate side based on RHD)
    const tempSignal = this.isRHD
      ? "HvacRightTemperatureRequest"
      : "HvacLeftTemperatureRequest";

    this.subscribeSignal(
      tempSignal,
      this.platform.Characteristic.TargetTemperature,
      (temp: number) => {
        this.targetTemperature = temp;
        return temp;
      },
    );

    // Subscribe to HVAC state
    this.subscribeSignal(
      "HvacACEnabled",
      this.platform.Characteristic.CurrentHeatingCoolingState,
      (enabled: boolean) => {
        const { CurrentHeatingCoolingState } = this.platform.Characteristic;
        const state = enabled
          ? CurrentHeatingCoolingState.HEAT // Tesla doesn't distinguish heat/cool in signal
          : CurrentHeatingCoolingState.OFF;

        // Also update target state to match
        this.service.updateCharacteristic(
          this.platform.Characteristic.TargetHeatingCoolingState,
          state === CurrentHeatingCoolingState.OFF
            ? this.platform.Characteristic.TargetHeatingCoolingState.OFF
            : this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
        );

        return state;
      },
    );

    // Handle target heating/cooling state changes
    this.registerCharacteristicSet(
      this.platform.Characteristic.TargetHeatingCoolingState,
      async (value) => {
        const { TargetHeatingCoolingState, CurrentHeatingCoolingState } =
          this.platform.Characteristic;

        if (value === TargetHeatingCoolingState.OFF) {
          this.platform.log.info(`Turning off climate for ${vehicle.name}`);
          await vehicle.api.stopAutoConditioning();

          // Optimistically update current state
          this.service.updateCharacteristic(
            this.platform.Characteristic.CurrentHeatingCoolingState,
            CurrentHeatingCoolingState.OFF,
          );
        } else {
          // AUTO, HEAT, or COOL all just turn on climate
          this.platform.log.info(`Turning on climate for ${vehicle.name}`);
          await vehicle.api.startAutoConditioning();

          // Optimistically update current state
          this.service.updateCharacteristic(
            this.platform.Characteristic.CurrentHeatingCoolingState,
            CurrentHeatingCoolingState.HEAT,
          );
        }
      },
    );

    // Handle target temperature changes
    this.registerCharacteristicSet(
      this.platform.Characteristic.TargetTemperature,
      async (value) => {
        const temp = value as number;
        this.platform.log.info(
          `Setting climate temperature to ${temp}°C for ${vehicle.name}`,
        );

        // Set both driver and passenger temps to the same value
        await vehicle.api.setTemps(temp, temp);

        this.targetTemperature = temp;
      },
    );

    // Set temperature display units to Celsius
    this.service.updateCharacteristic(
      this.platform.Characteristic.TemperatureDisplayUnits,
      this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS,
    );

    this.platform.log.debug(`Climate service initialized for ${vehicle.name}`);
  }
}

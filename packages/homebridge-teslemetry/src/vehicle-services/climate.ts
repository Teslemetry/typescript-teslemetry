/**
 * Climate Service
 *
 * Controls vehicle climate (HVAC) and temperature
 */

import { BaseService } from "./base.js";
import type { SseData } from "@teslemetry/api";

/**
 * ClimateService
 *
 * Controls vehicle climate through HomeKit Thermostat service
 */
export class ClimateService extends BaseService {
  private targetTemperature = 20; // Default target temp in Celsius
  private isRHD = false; // Right-hand drive flag
  private hvacPower: Exclude<SseData["data"]["HvacPower"], null | undefined> =
    "HvacPowerStateOff";
  private acEnabled = false; // used only to distinguish HEAT vs COOL while HvacPower reports the system on

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

    // HvacPower is the system's actual on/off state; HvacACEnabled only tells
    // us whether the AC compressor is running, which we use solely to pick
    // HEAT vs COOL once we already know the system is on.
    const computeCurrentState = () => {
      const { CurrentHeatingCoolingState } = this.platform.Characteristic;
      switch (this.hvacPower) {
        case "HvacPowerStateOff":
        case "HvacPowerStateUnknown":
          return CurrentHeatingCoolingState.OFF;
        case "HvacPowerStateOverheatProtect":
          return CurrentHeatingCoolingState.COOL;
        case "HvacPowerStateOn":
        case "HvacPowerStatePrecondition":
        default:
          return this.acEnabled
            ? CurrentHeatingCoolingState.COOL
            : CurrentHeatingCoolingState.HEAT;
      }
    };

    // Subscribe to whether the AC compressor is running (heat/cool hint only)
    this.subscribeSignal("HvacACEnabled", this.platform.Characteristic.CurrentHeatingCoolingState, (enabled: boolean) => {
      this.acEnabled = enabled;
      return computeCurrentState();
    });

    // Subscribe to HVAC system power state (source of truth for on/off)
    this.subscribeSignal("HvacPower", this.platform.Characteristic.CurrentHeatingCoolingState, (power) => {
      this.hvacPower = power;
      const state = computeCurrentState();

      // Also update target state to match
      this.service.updateCharacteristic(
        this.platform.Characteristic.TargetHeatingCoolingState,
        state === this.platform.Characteristic.CurrentHeatingCoolingState.OFF
          ? this.platform.Characteristic.TargetHeatingCoolingState.OFF
          : this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
      );

      return state;
    });

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

/**
 * Operation Mode Service
 *
 * Controls the Powerwall operation mode
 * Modes: self_consumption, backup, autonomous, time_based_control
 */

import { BaseEnergyService } from "./base.js";

/**
 * OperationModeService
 *
 * Represents operation mode as a fan with rotation speed
 * Speed 0 = Backup Only
 * Speed 33 = Autonomous
 * Speed 66 = Self-Powered
 * Speed 100 = Time-Based Control
 */
export class OperationModeService extends BaseEnergyService {
  private currentMode = "self_consumption";

  // Mode mappings
  private readonly MODE_TO_SPEED: Record<string, number> = {
    backup: 0,
    autonomous: 33,
    self_consumption: 66,
    time_based_control: 100,
  };

  private readonly SPEED_TO_MODE: Record<
    number,
    "backup" | "autonomous" | "self_consumption" | "time_based_control"
  > = {
    0: "backup",
    33: "autonomous",
    66: "self_consumption",
    100: "time_based_control",
  };

  private readonly SPEED_STEPS = [0, 33, 66, 100];

  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    site: import("@teslemetry/api").EnergyDetails,
  ) {
    super(
      platform,
      accessory,
      site,
      platform.Service.Fan,
      "Operation Mode",
      "operation-mode", // subType
    );

    // Set rotation speed steps
    this.service
      .getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 33,
      });

    // Mode is always "on"
    this.service.updateCharacteristic(this.platform.Characteristic.On, true);

    // Subscribe to site info updates for operation mode
    this.subscribeToEvent("siteInfo", (data: any) => {
      if (data?.response?.default_real_mode) {
        this.currentMode = data.response.default_real_mode;
        const speed = this.MODE_TO_SPEED[this.currentMode] ?? 66;

        this.service.updateCharacteristic(
          this.platform.Characteristic.RotationSpeed,
          speed,
        );
      }
    });

    // Handle mode changes via rotation speed
    this.registerCharacteristicSet(
      this.platform.Characteristic.RotationSpeed,
      async (value) => {
        // Snap to the nearest of the 4 documented steps; the last gap (66->100) is
        // wider than the others, so a uniform round(value/33)*33 can never land on 100.
        const raw = value as number;
        const speed = this.SPEED_STEPS.reduce((closest, step) =>
          Math.abs(step - raw) < Math.abs(closest - raw) ? step : closest,
        );
        const mode = this.SPEED_TO_MODE[speed] || "self_consumption";

        if (mode === "time_based_control") {
          // The Fleet API command only accepts backup/autonomous/self_consumption;
          // time_based_control is a read-only telemetry state, not a settable mode.
          this.platform.log.warn(
            `Time-Based Control cannot be set via HomeKit; ignoring for ${site.name}`,
          );
          return;
        }

        this.platform.log.info(
          `Setting operation mode to ${mode} (${speed}%) for ${site.name}`,
        );

        await site.api.setOperationMode(mode);
        this.currentMode = mode;
      },
    );

    // Prevent turning off - always on
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (!value) {
          this.service.updateCharacteristic(
            this.platform.Characteristic.On,
            true,
          );
          this.platform.log.warn(
            `Operation mode cannot be turned off (${site.name})`,
          );
        }
      },
    );

    this.platform.log.debug(
      `Operation mode service initialized for ${site.name}`,
    );
  }
}

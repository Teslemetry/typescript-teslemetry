/**
 * Tonneau Service
 *
 * Controls the Cybertruck's tonneau cover
 */

import { BaseService } from "./base.js";

/**
 * TonneauService
 *
 * Represents the Cybertruck tonneau as a window covering. TonneauOpenPercent
 * is already 0 (closed) to 100 (open), matching HomeKit's CurrentPosition/
 * TargetPosition scale directly - no conversion needed.
 */
export class TonneauService extends BaseService {
  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.WindowCovering,
      "Tonneau",
    );

    // Default to stopped; there's no dedicated "is moving" signal, only the
    // resulting position, so we never report IN_PROGRESS states.
    this.service.updateCharacteristic(
      this.platform.Characteristic.PositionState,
      this.platform.Characteristic.PositionState.STOPPED,
    );

    this.subscribeSignal(
      "TonneauOpenPercent",
      this.platform.Characteristic.CurrentPosition,
      (percent: number) => {
        this.service.updateCharacteristic(
          this.platform.Characteristic.TargetPosition,
          percent,
        );
        return percent;
      },
    );

    this.registerCharacteristicSet(
      this.platform.Characteristic.TargetPosition,
      async (value) => {
        const percent = value as number;
        this.platform.log.info(
          `Setting tonneau to ${percent}% for ${vehicle.name}`,
        );
        await vehicle.api.closure({
          tonneau: percent === 0 ? "close" : "open",
        });
      },
    );

    this.platform.log.debug(`Tonneau service initialized for ${vehicle.name}`);
  }
}

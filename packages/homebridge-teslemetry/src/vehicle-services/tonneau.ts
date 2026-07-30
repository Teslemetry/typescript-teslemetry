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
 * is already 0 (closed) to 100 (open), matching HomeKit's CurrentPosition
 * scale directly - no conversion needed. The vehicle's closure command is
 * binary (open/close only, no "move to X%"), so TargetPosition is restricted
 * to 0/100 via validValues - HomeKit rejects any other value before it ever
 * reaches our SET handler.
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

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetPosition)
      .setProps({ validValues: [0, 100] });

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
        // TargetPosition only tracks the nearest binary endpoint - CurrentPosition
        // can legitimately be a transient in-between value while the cover moves,
        // but that value would violate TargetPosition's validValues restriction.
        this.service.updateCharacteristic(
          this.platform.Characteristic.TargetPosition,
          percent >= 50 ? 100 : 0,
        );
        return percent;
      },
    );

    this.registerCharacteristicSet(
      this.platform.Characteristic.TargetPosition,
      async (value) => {
        const percent = value as number;
        this.platform.log.info(
          `Setting tonneau to ${percent === 0 ? "closed" : "open"} for ${vehicle.name}`,
        );
        await vehicle.api.closure({
          tonneau: percent === 0 ? "close" : "open",
        });
      },
    );

    this.platform.log.debug(`Tonneau service initialized for ${vehicle.name}`);
  }
}

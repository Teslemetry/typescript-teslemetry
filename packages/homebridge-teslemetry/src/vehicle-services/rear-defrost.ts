/**
 * Rear Defrost Service
 *
 * Displays rear window defrost state
 */

import { BaseService } from "./base.js";

/**
 * RearDefrostService
 *
 * Represents rear window defrost as a read-only contact sensor: there is no
 * dedicated rear-defrost command in the API (front/max defrost is the only
 * settable defrost mode, in DefrostService), so this only ever reflects
 * RearDefrostEnabled. ContactSensorState is Paired Read + Notify only, unlike
 * a Switch's mandatory writable On, so HomeKit can't fabricate state here by
 * accepting a write we'd otherwise ignore.
 */
export class RearDefrostService extends BaseService {
  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.ContactSensor,
      "Rear Defrost",
      "rear-defrost", // subType
    );

    this.subscribeSignal(
      "RearDefrostEnabled",
      this.platform.Characteristic.ContactSensorState,
      (enabled: boolean) => {
        const { ContactSensorState } = this.platform.Characteristic;
        return enabled
          ? ContactSensorState.CONTACT_NOT_DETECTED
          : ContactSensorState.CONTACT_DETECTED;
      },
    );

    this.platform.log.debug(
      `Rear defrost service initialized for ${vehicle.name}`,
    );
  }
}

/**
 * Rear Defrost Service
 *
 * Displays rear window defrost state
 */

import { BaseService } from "./base.js";

/**
 * RearDefrostService
 *
 * Represents rear window defrost as a status-only switch: there is no
 * dedicated rear-defrost command in the API (front/max defrost is the only
 * settable defrost mode, in DefrostService), so this never registers a SET
 * handler and simply reflects RearDefrostEnabled.
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
      platform.Service.Switch,
      "Rear Defrost",
      "rear-defrost", // subType
    );

    this.subscribeSignal("RearDefrostEnabled", this.platform.Characteristic.On);

    this.platform.log.debug(
      `Rear defrost service initialized for ${vehicle.name}`,
    );
  }
}

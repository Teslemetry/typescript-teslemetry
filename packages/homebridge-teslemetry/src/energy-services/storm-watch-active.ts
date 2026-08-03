/**
 * Storm Watch Active Service
 *
 * Read-only contact sensor for whether Storm Watch is currently charging the
 * battery in response to a storm, driven by live_status. Distinct from
 * StormWatchService, which is the user's enable/disable setting - a setting
 * being on does not mean it is currently active.
 */

import { BaseEnergyService } from "./base.js";

export class StormWatchActiveService extends BaseEnergyService {
  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    site: import("@teslemetry/api").EnergyDetails,
  ) {
    super(
      platform,
      accessory,
      site,
      platform.Service.ContactSensor,
      "Storm Watch Active",
      "storm-watch-active",
    );

    this.service.updateCharacteristic(
      this.platform.Characteristic.StatusFault,
      this.platform.Characteristic.StatusFault.GENERAL_FAULT,
    );

    this.subscribeToEvent("liveStatus", (data: any) => {
      const stormModeActive = data?.response?.storm_mode_active;
      if (stormModeActive === undefined) return;

      const { ContactSensorState, StatusFault } = this.platform.Characteristic;
      this.service.updateCharacteristic(
        ContactSensorState,
        stormModeActive ? ContactSensorState.CONTACT_NOT_DETECTED : ContactSensorState.CONTACT_DETECTED,
      );
      this.service.updateCharacteristic(StatusFault, StatusFault.NO_FAULT);
    });

    this.platform.log.debug(`Storm Watch active service initialized for ${site.name}`);
  }
}

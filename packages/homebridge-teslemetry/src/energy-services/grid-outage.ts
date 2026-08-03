/**
 * Grid Outage Service
 *
 * Read-only contact sensor for the live utility grid connection state, driven
 * by live_status. Distinct from any grid-charging settings switch: this
 * reflects the grid's actual current state, not a configured preference.
 */

import { BaseEnergyService } from "./base.js";

export class GridOutageService extends BaseEnergyService {
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
      "Grid Power",
      "grid-outage",
    );

    // No live_status has arrived yet - mark unknown rather than defaulting
    // to "grid is fine".
    this.service.updateCharacteristic(
      this.platform.Characteristic.StatusFault,
      this.platform.Characteristic.StatusFault.GENERAL_FAULT,
    );

    this.subscribeToEvent("liveStatus", (data: any) => {
      const gridStatus = data?.response?.grid_status;
      if (gridStatus === undefined) return;

      const { ContactSensorState, StatusFault } = this.platform.Characteristic;
      this.service.updateCharacteristic(
        ContactSensorState,
        gridStatus === "Active" ? ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED,
      );
      this.service.updateCharacteristic(StatusFault, StatusFault.NO_FAULT);
    });

    this.platform.log.debug(`Grid outage service initialized for ${site.name}`);
  }
}

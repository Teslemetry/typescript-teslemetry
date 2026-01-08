/**
 * Backup Reserve Service
 *
 * Controls the backup reserve percentage (0-100%)
 */

import { BaseEnergyService } from "./base.js";

/**
 * BackupReserveService
 *
 * Represents backup reserve as a lightbulb brightness (similar to charge limit)
 * Brightness percentage = backup reserve percentage
 */
export class BackupReserveService extends BaseEnergyService {
  constructor(
    platform: ReturnType<typeof import("../platform.js").TeslemetryPlatform>,
    accessory: import("homebridge").PlatformAccessory,
    site: import("@teslemetry/api").EnergyDetails,
  ) {
    super(
      platform,
      accessory,
      site,
      platform.Service.Lightbulb,
      "Backup Reserve",
      "backup-reserve", // subType
    );

    // Backup reserve is always "on" (we just control the brightness/percentage)
    this.service.updateCharacteristic(this.platform.Characteristic.On, true);

    // Subscribe to site info updates for backup reserve
    this.subscribeToEvent("siteInfo", (data: any) => {
      if (data?.response?.backup_reserve_percent !== undefined) {
        const reserve = Math.round(data.response.backup_reserve_percent);

        // Update brightness to match backup reserve percentage
        this.service.updateCharacteristic(
          this.platform.Characteristic.Brightness,
          reserve,
        );
      }
    });

    // Handle backup reserve changes
    this.registerCharacteristicSet(
      this.platform.Characteristic.Brightness,
      async (value) => {
        const reserve = Math.round(value as number);
        this.platform.log.info(
          `Setting backup reserve to ${reserve}% for ${site.name}`,
        );

        await site.api.setBackupReserve(reserve);
      },
    );

    // Prevent turning off the "lightbulb" - it should always be on
    this.registerCharacteristicSet(
      this.platform.Characteristic.On,
      async (value) => {
        if (!value) {
          // If user tries to turn it off, turn it back on
          this.service.updateCharacteristic(
            this.platform.Characteristic.On,
            true,
          );
          this.platform.log.warn(
            `Backup reserve cannot be turned off (${site.name})`,
          );
        }
      },
    );

    this.platform.log.debug(
      `Backup reserve service initialized for ${site.name}`,
    );
  }
}

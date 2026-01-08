/**
 * Energy Site Accessory
 *
 * Represents a Tesla energy site (Powerwall/Solar) as a Homebridge accessory with multiple services
 */

import type { PlatformAccessory } from "homebridge";
import type { EnergyDetails } from "@teslemetry/api";
import type { TeslemetryPlatform } from "./platform.js";
import type { BaseEnergyService } from "./energy-services/base.js";

// Import services
import { EnergyInformationService } from "./energy-services/information.js";
import { EnergyBatteryService } from "./energy-services/battery.js";
import { BackupReserveService } from "./energy-services/backup-reserve.js";
import { StormWatchService } from "./energy-services/storm-watch.js";
import { OperationModeService } from "./energy-services/operation-mode.js";
import { GridChargingService } from "./energy-services/grid-charging.js";

/**
 * EnergyAccessory
 *
 * Manages all services for a single Tesla energy site
 */
export class EnergyAccessory {
  private readonly services: BaseEnergyService[] = [];
  private pollingCleanup: Array<() => void> = [];

  constructor(
    private readonly platform: TeslemetryPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly site: EnergyDetails,
  ) {
    this.platform.log.debug(
      `Initializing energy site accessory: ${this.site.name} (ID: ${this.site.id})`,
    );

    // Initialize all services
    this.initializeServices();

    // Start polling for data
    this.startPolling();
  }

  /**
   * Initialize all energy site services
   */
  private initializeServices(): void {
    // Always include information service
    this.services.push(
      new EnergyInformationService(this.platform, this.accessory, this.site),
    );

    // Add Powerwall/battery services
    this.services.push(
      new EnergyBatteryService(this.platform, this.accessory, this.site),
    );

    // Add control services
    this.services.push(
      new BackupReserveService(this.platform, this.accessory, this.site),
    );
    this.services.push(
      new StormWatchService(this.platform, this.accessory, this.site),
    );
    this.services.push(
      new OperationModeService(this.platform, this.accessory, this.site),
    );
    this.services.push(
      new GridChargingService(this.platform, this.accessory, this.site),
    );

    this.platform.log.info(
      `Initialized ${this.services.length} services for ${this.site.name}`,
    );
  }

  /**
   * Start polling for energy site data
   */
  private startPolling(): void {
    // Request polling for site info (static configuration)
    this.pollingCleanup.push(this.site.api.requestPolling("siteInfo"));

    // Request polling for live status (dynamic data like power flow, battery %)
    this.pollingCleanup.push(this.site.api.requestPolling("liveStatus"));

    this.platform.log.debug(`Started polling for ${this.site.name}`);
  }

  /**
   * Cleanup all services and stop polling
   */
  destroy(): void {
    this.platform.log.debug(`Destroying energy site accessory: ${this.site.name}`);

    // Stop polling
    this.pollingCleanup.forEach((stop) => stop());
    this.pollingCleanup.length = 0;

    // Clean up services
    this.services.forEach((service) => service.destroy());
    this.services.length = 0;
  }
}

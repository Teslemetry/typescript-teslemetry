/**
 * Energy Site Accessory
 *
 * Represents a Tesla energy site (Powerwall/Solar) as a Homebridge accessory with multiple services
 */

import type { PlatformAccessory } from "homebridge";
import type { EnergyDetails, SseLiveStatus, SseSiteInfo } from "@teslemetry/api";
import type { TeslemetryPlatform } from "./platform.js";
import type { BaseEnergyService } from "./energy-services/base.js";

// Import services
import { EnergyInformationService } from "./energy-services/information.js";
import { EnergyBatteryService } from "./energy-services/battery.js";
import { BackupReserveService } from "./energy-services/backup-reserve.js";
import { StormWatchService } from "./energy-services/storm-watch.js";
import { OperationModeService } from "./energy-services/operation-mode.js";
import { GridChargingService } from "./energy-services/grid-charging.js";
import { GridOutageService } from "./energy-services/grid-outage.js";
import { StormWatchActiveService } from "./energy-services/storm-watch-active.js";
import { WallConnectorService } from "./energy-services/wall-connector.js";

/** WallConnectorService doesn't extend BaseEnergyService (its contact sensors
 *  are created lazily per DIN), but shares the same destroy() contract. */
type DestroyableService = BaseEnergyService | WallConnectorService;

/**
 * EnergyAccessory
 *
 * Manages all services for a single Tesla energy site
 */
export class EnergyAccessory {
  private readonly services: DestroyableService[] = [];
  private pollingCleanup: Array<() => void> = [];
  private streamCleanup: Array<() => void> = [];

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

    // Consume the account stream this platform already opens for continuous updates
    this.setupStreamListeners();
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
    this.services.push(
      new GridOutageService(this.platform, this.accessory, this.site),
    );
    this.services.push(
      new StormWatchActiveService(this.platform, this.accessory, this.site),
    );
    this.services.push(
      new WallConnectorService(this.platform, this.accessory, this.site),
    );

    this.platform.log.info(
      `Initialized ${this.services.length} services for ${this.site.name}`,
    );
  }

  /**
   * Start polling for energy site data
   */
  private startPolling(): void {
    // Site info is slow-changing settings data; REST polling stays the primary source.
    this.pollingCleanup.push(this.site.api.requestPolling("siteInfo"));

    // Live status now arrives continuously via the stream; fetch once via REST so
    // characteristics have a deterministic value before the first stream event lands.
    this.site.api.getLiveStatus().catch((error) => {
      this.platform.log.warn(
        `Initial live status fetch failed for ${this.site.name}:`,
        error,
      );
    });

    this.platform.log.debug(`Started polling for ${this.site.name}`);
  }

  /**
   * Register persistent stream listeners for continuous energy site updates.
   *
   * Registered before any wait on stream data (no once()) so
   * TeslemetryEnergySiteStream's on-registration cache replay - which fires on
   * every reconnect - is never missed.
   */
  private setupStreamListeners(): void {
    const onLiveStatus = (event: SseLiveStatus) => {
      const liveStatus = {
        response: event.live_status,
      } as NonNullable<typeof this.site.api.cache.liveStatus>;

      this.site.api.cache.liveStatus = liveStatus;
      this.site.api.emit("liveStatus", liveStatus);
    };
    this.site.sse.on("live_status", onLiveStatus);
    this.streamCleanup.push(() => this.site.sse.off("live_status", onLiveStatus));

    // Opportunistic only: site_info is being slimmed server-side (tariff is moving to
    // its own tariff_v2 topic), so merge rather than replace to avoid clobbering
    // REST-sourced fields that a slimmed stream event no longer carries.
    const onSiteInfo = (event: SseSiteInfo) => {
      const siteInfo = {
        response: {
          ...this.site.api.cache.siteInfo?.response,
          ...event.site_info,
        },
      } as NonNullable<typeof this.site.api.cache.siteInfo>;

      this.site.api.cache.siteInfo = siteInfo;
      this.site.api.emit("siteInfo", siteInfo);
    };
    this.site.sse.on("site_info", onSiteInfo);
    this.streamCleanup.push(() => this.site.sse.off("site_info", onSiteInfo));

    this.platform.log.debug(`Started stream listeners for ${this.site.name}`);
  }

  /**
   * Reflect terminal stream health across every service that has an honest
   * HomeKit fault characteristic.
   */
  setStreamFault(faulted: boolean): void {
    for (const service of this.services) {
      if ("setStreamFault" in service) {
        service.setStreamFault(faulted);
      }
    }
  }

  /**
   * Cleanup all services and stop polling/streaming
   */
  destroy(): void {
    this.platform.log.debug(`Destroying energy site accessory: ${this.site.name}`);

    // Stop polling
    this.pollingCleanup.forEach((stop) => stop());
    this.pollingCleanup.length = 0;

    // Stop stream listeners
    this.streamCleanup.forEach((stop) => stop());
    this.streamCleanup.length = 0;

    // Clean up services
    this.services.forEach((service) => service.destroy());
    this.services.length = 0;
  }
}

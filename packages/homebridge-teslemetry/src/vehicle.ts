/**
 * Vehicle Accessory
 *
 * Represents a Tesla vehicle as a Homebridge accessory with multiple services
 */

import type { PlatformAccessory } from "homebridge";
import { useTeslaModel, type VehicleDetails } from "@teslemetry/api";
import type { TeslemetryPlatform } from "./platform.js";
import type { BaseService } from "./vehicle-services/base.js";

// Import services as we implement them
import { InformationService } from "./vehicle-services/information.js";
import { BatteryService } from "./vehicle-services/battery.js";
import { LockService } from "./vehicle-services/lock.js";
import { ClimateService } from "./vehicle-services/climate.js";
import { ChargePortService } from "./vehicle-services/charge-port.js";
import { ChargeSwitchService } from "./vehicle-services/charge-switch.js";
import { ChargeLimitService } from "./vehicle-services/charge-limit.js";
import { DefrostService } from "./vehicle-services/defrost.js";
import { RearDefrostService } from "./vehicle-services/rear-defrost.js";
import { DoorService } from "./vehicle-services/door.js";
import { SentryService } from "./vehicle-services/sentry.js";
import { WakeService } from "./vehicle-services/wake.js";
import { TonneauService } from "./vehicle-services/tonneau.js";
import { PresenceService } from "./vehicle-services/presence.js";
import { TpmsService } from "./vehicle-services/tpms.js";

/** PresenceService doesn't extend BaseService (its OccupancySensor services
 *  are created lazily per field), but shares the same destroy() contract. */
type DestroyableService = BaseService | PresenceService;

/**
 * VehicleAccessory
 *
 * Manages all services for a single Tesla vehicle
 */
export class VehicleAccessory {
  private readonly services: DestroyableService[] = [];

  constructor(
    private readonly platform: TeslemetryPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly vehicle: VehicleDetails,
  ) {
    this.platform.log.debug(
      `Initializing vehicle accessory: ${this.vehicle.name} (${this.vehicle.vin})`,
    );

    // Initialize all services
    this.initializeServices();

    // Set up streaming event handlers
    this.setupStreamingHandlers();
  }

  /**
   * Initialize all vehicle services
   */
  private initializeServices(): void {
    // Always include information service
    this.services.push(
      new InformationService(this.platform, this.accessory, this.vehicle),
    );

    // Core services
    this.services.push(
      new BatteryService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new LockService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new ClimateService(this.platform, this.accessory, this.vehicle),
    );

    // Charging services
    this.services.push(
      new ChargePortService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new ChargeSwitchService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new ChargeLimitService(this.platform, this.accessory, this.vehicle),
    );

    // Additional services
    this.services.push(
      new DefrostService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new RearDefrostService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new DoorService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new SentryService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new WakeService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new TpmsService(this.platform, this.accessory, this.vehicle),
    );
    this.services.push(
      new PresenceService(this.platform, this.accessory, this.vehicle),
    );
    // Tonneau is Cybertruck-only hardware; single-model/config-dependent
    // features gate on vehicle model/config instead of registering
    // unconditionally (see DoorService's own can_actuate_trunks gate).
    if (useTeslaModel(this.vehicle.vin) === "Cybertruck") {
      this.services.push(
        new TonneauService(this.platform, this.accessory, this.vehicle),
      );
    }

    this.platform.log.info(
      `Initialized ${this.services.length} services for ${this.vehicle.name}`,
    );
  }

  /**
   * Set up vehicle-specific streaming event handlers
   */
  private setupStreamingHandlers(): void {
    // Handle vehicle state changes
    this.vehicle.sse.on("state", (event) => {
      if (event.state === "asleep") {
        this.platform.log.debug(`Vehicle ${this.vehicle.name} is asleep`);
      } else if (event.state === "online") {
        this.platform.log.debug(`Vehicle ${this.vehicle.name} is online`);
      }
    });

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
   * Cleanup all services
   */
  destroy(): void {
    this.platform.log.debug(`Destroying vehicle accessory: ${this.vehicle.name}`);
    this.services.forEach((service) => service.destroy());
    this.services.length = 0;
  }
}

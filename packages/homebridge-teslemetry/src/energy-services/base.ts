/**
 * Base Energy Service Class
 *
 * Abstract class for all energy site services
 * Uses polling via API events instead of streaming
 */

import type { PlatformAccessory, Service, Characteristic } from "homebridge";
import type { TeslemetryPlatform } from "../platform.js";
import type { EnergyDetails } from "@teslemetry/api";

/**
 * BaseEnergyService
 *
 * Abstract base class for all energy site services
 */
export abstract class BaseEnergyService {
  protected readonly service: Service;
  protected readonly cleanupFunctions: Array<() => void> = [];

  constructor(
    protected readonly platform: TeslemetryPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly site: EnergyDetails,
    serviceType: typeof Service[keyof typeof Service],
    displayName: string,
    subType?: string,
  ) {
    // Get or create the service
    this.service =
      this.accessory.getService(serviceType) ||
      this.accessory.addService(serviceType, displayName, subType);

    // Set the service name
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.getDisplayName(displayName),
    );
  }

  /**
   * Get display name with optional site name prefix
   */
  protected getDisplayName(serviceName: string): string {
    if (this.platform.config.prefixName !== false) {
      return `${this.site.name} ${serviceName}`;
    }
    return serviceName;
  }

  /**
   * Subscribe to API polling events
   */
  protected subscribeToEvent<T = any>(
    eventName: "siteInfo" | "liveStatus",
    handler: (data: T) => void,
  ): void {
    const listener = (data: any) => {
      try {
        handler(data);
      } catch (error) {
        this.platform.log.error(
          `Error handling ${eventName} event for ${this.site.name}:`,
          error,
        );
      }
    };

    this.site.api.on(eventName, listener);

    // Store cleanup function
    this.cleanupFunctions.push(() => {
      this.site.api.off(eventName, listener);
    });
  }

  /**
   * Register a characteristic SET handler
   */
  protected registerCharacteristicSet(
    characteristic: typeof Characteristic[keyof typeof Characteristic],
    handler: (value: any) => Promise<void>,
  ): void {
    this.service
      .getCharacteristic(characteristic)
      .onSet(async (value) => {
        try {
          await handler(value);
        } catch (error) {
          this.platform.log.error(
            `Error handling SET for characteristic:`,
            error,
          );
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        }
      });
  }

  /**
   * Register a characteristic GET handler
   */
  protected registerCharacteristicGet(
    characteristic: typeof Characteristic[keyof typeof Characteristic],
    handler: () => Promise<any>,
  ): void {
    this.service
      .getCharacteristic(characteristic)
      .onGet(async () => {
        try {
          return await handler();
        } catch (error) {
          this.platform.log.error(
            `Error handling GET for characteristic:`,
            error,
          );
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        }
      });
  }

  /**
   * Cleanup all subscriptions
   * Should be called when the service is being removed
   */
  destroy(): void {
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions.length = 0;
  }
}

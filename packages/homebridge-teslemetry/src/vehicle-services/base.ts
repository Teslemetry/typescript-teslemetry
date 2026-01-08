/**
 * Base Service Class
 *
 * Abstract class that all vehicle services extend from.
 * Provides common functionality for service management and cleanup.
 */

import type { PlatformAccessory, Service, Characteristic } from "homebridge";
import type { TeslemetryPlatform } from "../platform.js";
import type { VehicleDetails } from "@teslemetry/api";

/**
 * BaseService
 *
 * Abstract base class for all vehicle services
 */
export abstract class BaseService {
  protected readonly service: Service;
  protected readonly cleanupFunctions: Array<() => void> = [];

  constructor(
    protected readonly platform: TeslemetryPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly vehicle: VehicleDetails,
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
   * Get display name with optional vehicle name prefix
   */
  protected getDisplayName(serviceName: string): string {
    if (this.platform.config.prefixName !== false) {
      return `${this.vehicle.name} ${serviceName}`;
    }
    return serviceName;
  }

  /**
   * Subscribe to a vehicle signal and update a characteristic
   */
  protected subscribeSignal<T = any>(
    signal: string,
    characteristic: typeof Characteristic[keyof typeof Characteristic],
    mapper?: (value: T) => any,
  ): void {
    const cleanup = this.vehicle.sse.onSignal(signal, (value: T) => {
      try {
        const mappedValue = mapper ? mapper(value) : value;
        this.service.updateCharacteristic(characteristic, mappedValue);
      } catch (error) {
        this.platform.log.error(
          `Error updating characteristic for signal ${signal}:`,
          error,
        );
      }
    });

    this.cleanupFunctions.push(cleanup);
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

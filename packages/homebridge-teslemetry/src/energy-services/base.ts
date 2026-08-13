/**
 * Base Energy Service Class
 *
 * Abstract class for all energy site services
 * Services subscribe to the site.api "siteInfo"/"liveStatus" event bus; EnergyAccessory
 * feeds it from the account stream (liveStatus) and REST polling (siteInfo).
 */

import type { PlatformAccessory, Service, Characteristic, WithUUID } from "homebridge";
import type { TeslemetryPlatform } from "../platform.js";
import type { EnergyDetails } from "@teslemetry/api";

/** All standard HomeKit Characteristic subclasses override the base constructor to take no arguments. */
type CharacteristicConstructor = WithUUID<{ new (): Characteristic }>;

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
    serviceType: WithUUID<typeof Service>,
    displayName: string,
    subType?: string,
  ) {
    // Get or create the service.
    // addService()'s generic constructorArgs are inferred from the *base* Service
    // class (displayName, UUID, subtype?), not the 2-arg (displayName?, subtype?)
    // constructor every concrete subclass (e.g. Service.Lightbulb) actually has, so
    // we build the instance ourselves and hand addService a plain Service.
    const ConcreteService = serviceType as unknown as new (
      displayName?: string,
      subtype?: string,
    ) => Service;
    // getService() matches by service type alone, so sibling services that
    // intentionally share a HomeKit service class (e.g. Switch) would collapse
    // onto one instance. Look up by subType when one is given; services with
    // no subType are singletons for their type (e.g. AccessoryInformation, which
    // HAP itself pre-creates on every Accessory) and must keep matching by type
    // alone so they attach to that existing instance instead of colliding with it.
    this.service = subType
      ? this.accessory.getServiceById(serviceType, subType) ||
        this.accessory.addService(new ConcreteService(displayName, subType))
      : this.accessory.getService(serviceType) ||
        this.accessory.addService(new ConcreteService(displayName));

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
    characteristic: CharacteristicConstructor,
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
    characteristic: CharacteristicConstructor,
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
   * Reflect terminal stream health as StatusFault. Only sensor-type HomeKit
   * services (e.g. ContactSensor) declare StatusFault as optional; forcing it
   * onto a service type that doesn't would add an out-of-spec characteristic,
   * so those are left untouched rather than given a misleading fault signal.
   */
  setStreamFault(faulted: boolean): void {
    this.applyStreamFault(this.service, faulted);
  }

  protected applyStreamFault(service: Service, faulted: boolean): void {
    const { StatusFault } = this.platform.Characteristic;
    // testCharacteristic() only reports characteristics already added, not
    // ones the service type merely permits - check the declared optional
    // list instead so a not-yet-added StatusFault still gets recognized.
    const supportsStatusFault = service.optionalCharacteristics.some(
      (characteristic) => characteristic.UUID === StatusFault.UUID,
    );
    if (!supportsStatusFault) return;
    service.updateCharacteristic(StatusFault, faulted ? StatusFault.GENERAL_FAULT : StatusFault.NO_FAULT);
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

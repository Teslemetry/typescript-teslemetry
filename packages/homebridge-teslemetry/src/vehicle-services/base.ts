/**
 * Base Service Class
 *
 * Abstract class that all vehicle services extend from.
 * Provides common functionality for service management and cleanup.
 */

import type {
  PlatformAccessory,
  Service,
  Characteristic,
  CharacteristicValue,
  Nullable,
  WithUUID,
} from "homebridge";
import type { TeslemetryPlatform } from "../platform.js";
import type { VehicleDetails, Signals, SseData } from "@teslemetry/api";

/** All standard HomeKit Characteristic subclasses override the base constructor to take no arguments. */
type CharacteristicConstructor = WithUUID<{ new (): Characteristic }>;

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
  protected subscribeSignal<S extends Signals, T = any>(
    signal: S,
    characteristic: CharacteristicConstructor,
    mapper?: (value: Exclude<SseData["data"][S], null | undefined>) => T,
  ): void {
    const cleanup = this.vehicle.sse.onSignal(signal, (value) => {
      // null means the vehicle reported "no data" for this signal; leave the
      // characteristic at its last known value rather than passing null through.
      if (value === null) return;

      try {
        // TS can't narrow a generic indexed-access type (SseData["data"][S]) through
        // the `value === null` check above, even though it's a plain runtime check.
        const nonNullValue = value as Exclude<SseData["data"][S], null | undefined>;
        const mappedValue = mapper ? mapper(nonNullValue) : nonNullValue;
        // Callers of a signal whose native value isn't already a HomeKit primitive
        // (e.g. Location) must supply a mapper that converts it; that contract isn't
        // expressible in subscribeSignal's generic signature.
        this.service.updateCharacteristic(
          characteristic,
          mappedValue as Nullable<CharacteristicValue>,
        );
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
   * Cleanup all subscriptions
   * Should be called when the service is being removed
   */
  destroy(): void {
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions.length = 0;
  }
}

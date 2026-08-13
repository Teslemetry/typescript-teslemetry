/**
 * Presence Service
 *
 * Exposes home/work/favourite location presence as OccupancySensor services.
 */

import type { PlatformAccessory, Service } from "homebridge";
import type { TeslemetryPlatform } from "../platform.js";
import type { VehicleDetails, Signals } from "@teslemetry/api";

/** Debounce window before a presence transition is applied to HomeKit, so a
 *  brief geofence-boundary flicker doesn't fire arrival/departure automations twice. */
const TRANSITION_DEBOUNCE_MS = 60_000;

interface PresenceDefinition {
  field: Signals;
  displayName: string;
  subType: string;
}

/**
 * PresenceService
 *
 * Creates an OccupancySensor per presence field, but only once that field
 * actually reports a value - a field withheld by missing vehicle_location
 * scope never fires, so its sensor is simply never created. Only the
 * semantic home/work/favourite booleans are consumed here, never raw
 * latitude/longitude.
 */
export class PresenceService {
  private readonly cleanupFunctions: Array<() => void> = [];
  private readonly services = new Map<Signals, Service>();
  private readonly pendingTimers = new Map<Signals, NodeJS.Timeout>();

  constructor(
    private readonly platform: TeslemetryPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly vehicle: VehicleDetails,
  ) {
    const definitions: PresenceDefinition[] = [
      { field: "LocatedAtHome", displayName: "Home", subType: "presence-home" },
      { field: "LocatedAtWork", displayName: "Work", subType: "presence-work" },
    ];

    // HA only creates located_at_favorite when the user has opted in; mirror
    // that instead of surfacing a third sensor by default.
    if (this.platform.config.enableFavoritePresence) {
      definitions.push({
        field: "LocatedAtFavorite",
        displayName: "Favorite",
        subType: "presence-favorite",
      });
    }

    for (const definition of definitions) {
      const cleanup = this.vehicle.sse.onSignal(definition.field, (value) => {
        if (typeof value !== "boolean") return;
        this.handleUpdate(definition, value);
      });
      this.cleanupFunctions.push(cleanup);
    }
  }

  private handleUpdate(definition: PresenceDefinition, value: boolean): void {
    const isFirstValue = !this.services.has(definition.field);

    if (isFirstValue) {
      // First value is applied immediately: it establishes initial state,
      // not a transition, so debouncing it would only delay HomeKit's very
      // first read of a sensor that didn't previously exist.
      const service = this.createService(definition, value);
      this.services.set(definition.field, service);
      return;
    }

    const service = this.services.get(definition.field)!;

    // The signal just arrived, proving the stream is alive right now -
    // clear any fault independent of the debounced occupancy transition
    // below, which only governs when the *value* change is applied.
    this.applyStreamFault(service, false);

    const existingTimer = this.pendingTimers.get(definition.field);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.pendingTimers.delete(definition.field);
      this.applyOccupancy(service, value);
    }, TRANSITION_DEBOUNCE_MS);
    this.pendingTimers.set(definition.field, timer);
  }

  private createService(definition: PresenceDefinition, initialValue: boolean): Service {
    const displayName = this.getDisplayName(definition.displayName);
    const service =
      this.accessory.getServiceById(this.platform.Service.OccupancySensor, definition.subType) ||
      this.accessory.addService(
        this.platform.Service.OccupancySensor,
        displayName,
        definition.subType,
      );

    service.setCharacteristic(this.platform.Characteristic.Name, displayName);
    this.applyOccupancy(service, initialValue);
    this.applyStreamFault(service, false);
    return service;
  }

  private applyOccupancy(service: Service, value: boolean): void {
    const { OccupancyDetected } = this.platform.Characteristic;
    service.updateCharacteristic(
      OccupancyDetected,
      value ? OccupancyDetected.OCCUPANCY_DETECTED : OccupancyDetected.OCCUPANCY_NOT_DETECTED,
    );
  }

  /**
   * Reflect terminal stream health on every occupancy sensor created so far.
   * OccupancySensor declares StatusFault as an optional characteristic, so
   * this is an honest signal (same convention as the contact-sensor-backed
   * services) - a sensor not yet created (its field has never reported a
   * value) has nothing to fault and is simply skipped, the same as every
   * other lazily-created sensor in this package.
   */
  setStreamFault(faulted: boolean): void {
    for (const service of this.services.values()) {
      this.applyStreamFault(service, faulted);
    }
  }

  private applyStreamFault(service: Service, faulted: boolean): void {
    const { StatusFault } = this.platform.Characteristic;
    service.updateCharacteristic(StatusFault, faulted ? StatusFault.GENERAL_FAULT : StatusFault.NO_FAULT);
  }

  private getDisplayName(serviceName: string): string {
    if (this.platform.config.prefixName !== false) {
      return `${this.vehicle.name} ${serviceName}`;
    }
    return serviceName;
  }

  destroy(): void {
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions.length = 0;
    this.pendingTimers.forEach((timer) => clearTimeout(timer));
    this.pendingTimers.clear();
    this.services.clear();
  }
}

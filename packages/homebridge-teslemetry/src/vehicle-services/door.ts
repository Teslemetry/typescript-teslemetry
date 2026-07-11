/**
 * Door Service
 *
 * Shows the status of all vehicle doors as contact sensors
 */

import { BaseService } from "./base.js";
import type { Service } from "homebridge";

/**
 * DoorService
 *
 * Creates multiple contact sensor services for each door
 */
export class DoorService extends BaseService {
  private doorServices: Map<string, Service> = new Map();

  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    // Use the first door as the primary service (required by BaseService)
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.ContactSensor,
      "Driver Front Door",
      "door-driver-front",
    );

    // Store the primary service
    this.doorServices.set("DriverFront", this.service);

    // Create additional door services
    this.createDoorService("PassengerFront", "Passenger Front Door");
    this.createDoorService("DriverRear", "Driver Rear Door");
    this.createDoorService("PassengerRear", "Passenger Rear Door");
    this.createDoorService("TrunkFront", "Frunk");
    this.createDoorService("TrunkRear", "Trunk");

    // Subscribe to door state updates
    this.subscribeSignal("DoorState", null as any, (doorState: any) => {
      this.updateDoorStates(doorState);
    });

    this.platform.log.debug(`Door service initialized for ${vehicle.name}`);
  }

  /**
   * Create a contact sensor service for a specific door
   */
  private createDoorService(doorKey: string, displayName: string): void {
    const service =
      this.accessory.getService(`door-${doorKey}`) ||
      this.accessory.addService(
        this.platform.Service.ContactSensor,
        this.getDisplayName(displayName),
        `door-${doorKey}`,
      );

    service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.getDisplayName(displayName),
    );

    this.doorServices.set(doorKey, service);
  }

  /**
   * Update all door states from the DoorState signal
   */
  private updateDoorStates(doorState: any): void {
    if (!doorState || typeof doorState !== "object") {
      return;
    }

    const { ContactSensorState } = this.platform.Characteristic;

    // Update each door if its state is available
    for (const [doorKey, service] of this.doorServices.entries()) {
      const isOpen = doorState[doorKey];

      if (typeof isOpen === "boolean") {
        service.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          isOpen
            ? ContactSensorState.CONTACT_NOT_DETECTED // Door open
            : ContactSensorState.CONTACT_DETECTED, // Door closed
        );
      }
    }
  }

  /**
   * Override destroy to clean up all door services
   */
  destroy(): void {
    super.destroy();
    this.doorServices.clear();
  }
}

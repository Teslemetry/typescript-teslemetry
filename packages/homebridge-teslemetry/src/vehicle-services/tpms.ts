/**
 * TPMS Warning Service
 *
 * Shows tyre pressure warning state as contact sensors. Exposes warning
 * booleans only - never raw pressure numerics, which have no honest
 * standard HomeKit characteristic.
 */

import { BaseService } from "./base.js";
import type { Service } from "homebridge";

type WheelWarnings = {
  front_left: boolean;
  front_right: boolean;
  rear_left: boolean;
  rear_right: boolean;
};

const WHEELS: Array<{ key: keyof WheelWarnings; label: string; subType: string }> = [
  { key: "front_left", label: "Front Left Tire Warning", subType: "tpms-soft-front-left" },
  { key: "front_right", label: "Front Right Tire Warning", subType: "tpms-soft-front-right" },
  { key: "rear_left", label: "Rear Left Tire Warning", subType: "tpms-soft-rear-left" },
  { key: "rear_right", label: "Rear Right Tire Warning", subType: "tpms-soft-rear-right" },
];

/**
 * TpmsService
 *
 * One aggregate contact sensor for critical (hard) warnings, plus one
 * per-wheel contact sensor for soft warnings. Until a warnings payload has
 * actually arrived, StatusFault marks each sensor as unknown rather than
 * defaulting a missing reading to "safe".
 */
export class TpmsService extends BaseService {
  private readonly softWarningServices: Map<keyof WheelWarnings, Service> = new Map();

  constructor(
    platform: import("../platform.js").TeslemetryPlatform,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.ContactSensor,
      "TPMS Warning",
      "tpms-hard",
    );

    this.markUnknown(this.service);

    for (const wheel of WHEELS) {
      const displayName = this.getDisplayName(wheel.label);
      const service =
        this.accessory.getServiceById(platform.Service.ContactSensor, wheel.subType) ||
        this.accessory.addService(platform.Service.ContactSensor, displayName, wheel.subType);
      service.setCharacteristic(platform.Characteristic.Name, displayName);
      this.markUnknown(service);
      this.softWarningServices.set(wheel.key, service);
    }

    const offHard = this.vehicle.sse.onSignal("TpmsHardWarnings", (warnings) => {
      this.updateHardWarning(warnings as unknown as WheelWarnings | null);
    });
    this.cleanupFunctions.push(offHard);

    const offSoft = this.vehicle.sse.onSignal("TpmsSoftWarnings", (warnings) => {
      this.updateSoftWarnings(warnings as unknown as WheelWarnings | null);
    });
    this.cleanupFunctions.push(offSoft);

    this.platform.log.debug(`TPMS service initialized for ${vehicle.name}`);
  }

  private markUnknown(service: Service): void {
    service.updateCharacteristic(
      this.platform.Characteristic.StatusFault,
      this.platform.Characteristic.StatusFault.GENERAL_FAULT,
    );
  }

  private updateHardWarning(warnings: WheelWarnings | null): void {
    if (!warnings || typeof warnings !== "object") return;

    const { ContactSensorState, StatusFault } = this.platform.Characteristic;
    const anyHardWarning =
      warnings.front_left || warnings.front_right || warnings.rear_left || warnings.rear_right;

    this.service.updateCharacteristic(
      ContactSensorState,
      anyHardWarning ? ContactSensorState.CONTACT_NOT_DETECTED : ContactSensorState.CONTACT_DETECTED,
    );
    this.service.updateCharacteristic(StatusFault, StatusFault.NO_FAULT);
  }

  private updateSoftWarnings(warnings: WheelWarnings | null): void {
    if (!warnings || typeof warnings !== "object") return;

    const { ContactSensorState, StatusFault } = this.platform.Characteristic;

    for (const wheel of WHEELS) {
      const service = this.softWarningServices.get(wheel.key);
      if (!service) continue;

      const isWarning = Boolean(warnings[wheel.key]);
      service.updateCharacteristic(
        ContactSensorState,
        isWarning ? ContactSensorState.CONTACT_NOT_DETECTED : ContactSensorState.CONTACT_DETECTED,
      );
      service.updateCharacteristic(StatusFault, StatusFault.NO_FAULT);
    }
  }

  setStreamFault(faulted: boolean): void {
    super.setStreamFault(faulted);
    for (const service of this.softWarningServices.values()) {
      this.applyStreamFault(service, faulted);
    }
  }

  destroy(): void {
    super.destroy();
    this.softWarningServices.clear();
  }
}

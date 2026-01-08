/**
 * Information Service
 *
 * Provides basic vehicle information (manufacturer, model, serial number, firmware)
 */

import { BaseService } from "./base.js";

/**
 * InformationService
 *
 * Sets the AccessoryInformation service with vehicle metadata
 */
export class InformationService extends BaseService {
  constructor(
    platform: ReturnType<typeof import("../platform.js").TeslemetryPlatform>,
    accessory: import("homebridge").PlatformAccessory,
    vehicle: import("@teslemetry/api").VehicleDetails,
  ) {
    super(
      platform,
      accessory,
      vehicle,
      platform.Service.AccessoryInformation,
      "Information",
    );

    // Set manufacturer
    this.service.setCharacteristic(
      this.platform.Characteristic.Manufacturer,
      "Tesla",
    );

    // Set model from vehicle display name
    const model = this.extractModel(vehicle.name);
    this.service.setCharacteristic(
      this.platform.Characteristic.Model,
      model,
    );

    // Set serial number (VIN)
    this.service.setCharacteristic(
      this.platform.Characteristic.SerialNumber,
      vehicle.vin,
    );

    // Set firmware revision if available
    this.subscribeSignal(
      "CarVersion",
      this.platform.Characteristic.FirmwareRevision,
      (version: string) => this.extractFirmwareVersion(version),
    );

    this.platform.log.debug(
      `Information service initialized for ${vehicle.name}`,
    );
  }

  /**
   * Extract model name from vehicle name
   * Examples: "John's Model 3" -> "Model 3", "My Model Y" -> "Model Y"
   */
  private extractModel(name: string): string {
    const modelMatch = name.match(/Model [3SYXC]|Cybertruck|Roadster/i);
    return modelMatch ? modelMatch[0] : "Tesla";
  }

  /**
   * Extract firmware version from car version string
   * Example: "2024.20.1 abc123def456" -> "2024.20.1"
   */
  private extractFirmwareVersion(version: string): string {
    const versionMatch = version.match(/^\d+\.\d+(\.\d+)?/);
    return versionMatch ? versionMatch[0] : version;
  }
}

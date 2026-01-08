/**
 * Energy Information Service
 *
 * Provides basic energy site information (manufacturer, model, serial number)
 */

import { BaseEnergyService } from "./base.js";

/**
 * EnergyInformationService
 *
 * Sets the AccessoryInformation service with energy site metadata
 */
export class EnergyInformationService extends BaseEnergyService {
  constructor(
    platform: ReturnType<typeof import("../platform.js").TeslemetryPlatform>,
    accessory: import("homebridge").PlatformAccessory,
    site: import("@teslemetry/api").EnergyDetails,
  ) {
    super(
      platform,
      accessory,
      site,
      platform.Service.AccessoryInformation,
      "Information",
    );

    // Set manufacturer
    this.service.setCharacteristic(
      this.platform.Characteristic.Manufacturer,
      "Tesla",
    );

    // Set model based on site type
    const model = this.extractModel(site.name);
    this.service.setCharacteristic(
      this.platform.Characteristic.Model,
      model,
    );

    // Set serial number (site ID)
    this.service.setCharacteristic(
      this.platform.Characteristic.SerialNumber,
      String(site.id),
    );

    // Set firmware revision if available from siteInfo
    this.subscribeToEvent("siteInfo", (data: any) => {
      if (data?.response?.version) {
        this.service.setCharacteristic(
          this.platform.Characteristic.FirmwareRevision,
          data.response.version,
        );
      }
    });

    this.platform.log.debug(
      `Energy information service initialized for ${site.name}`,
    );
  }

  /**
   * Extract model name from site name or type
   * Examples: "Powerwall", "Solar", "Powerwall + Solar"
   */
  private extractModel(name: string): string {
    if (name.toLowerCase().includes("powerwall")) {
      return "Powerwall";
    } else if (name.toLowerCase().includes("solar")) {
      return "Solar";
    }
    return "Energy Site";
  }
}

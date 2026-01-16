/**
 * Teslemetry Platform for Homebridge
 *
 * This platform handles the initialization and management of Tesla vehicles and energy sites
 * as HomeKit accessories, using real-time streaming for status updates.
 */

import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

import { Teslemetry, type Products, type VehicleDetails, type EnergyDetails } from "@teslemetry/api";
import { PLATFORM_NAME, PLUGIN_NAME, type TeslemetryPlatformConfig } from "./settings.js";
import { VehicleAccessory } from "./vehicle.js";
import { EnergyAccessory } from "./energy.js";

/**
 * TeslemetryPlatform
 *
 * Main platform class that manages all Tesla devices as HomeKit accessories
 */
export class TeslemetryPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Teslemetry SDK instances
  private teslemetry?: Teslemetry;
  private products?: Products;

  // Accessory management
  private readonly accessories: PlatformAccessory[] = [];
  private readonly vehicleAccessories: Map<string, VehicleAccessory> = new Map();
  private readonly energyAccessories: Map<number, EnergyAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig & TeslemetryPlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.info("Initializing Teslemetry platform...");

    // Validate configuration
    if (!this.config.accessToken) {
      this.log.error("Access token is required! Please configure your Teslemetry access token.");
      return;
    }

    // When Homebridge finishes launching, initialize Teslemetry
    this.api.on("didFinishLaunching", () => {
      this.log.debug("Homebridge finished launching, discovering devices...");
      this.discoverDevices();
    });

    // Handle shutdown gracefully
    this.api.on("shutdown", () => {
      this.log.info("Homebridge is shutting down, closing Teslemetry connection...");
      this.teslemetry?.sse.close();
    });
  }

  /**
   * Homebridge calls this method to restore cached accessories from disk
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info("Loading accessory from cache:", accessory.displayName);
    this.accessories.push(accessory);
  }

  /**
   * Discover and initialize Tesla vehicles and energy sites
   */
  private async discoverDevices(): Promise<void> {
    try {
      // Initialize Teslemetry SDK
      this.log.info("Connecting to Teslemetry...");
      this.teslemetry = new Teslemetry(this.config.accessToken, {
        logger: {
          info: (...args: unknown[]) => this.log.info(...args),
          error: (...args: unknown[]) => this.log.error(...args),
          warn: (...args: unknown[]) => this.log.warn(...args),
          debug: (...args: unknown[]) => this.log.debug(...args),
        },
        stream: {
          cache: true, // Enable caching for immediate value access
        },
      });

      // Get all products (vehicles and energy sites)
      this.log.info("Fetching Tesla products...");
      this.products = await this.teslemetry.createProducts();

      // Connect to streaming API
      this.log.info("Connecting to streaming API...");
      this.teslemetry.sse.connect();

      // Set up streaming event handlers
      this.setupStreamingHandlers();

      // Discover vehicles
      const vehicleVins = Object.keys(this.products.vehicles);
      const energySiteIds = Object.keys(this.products.energySites);

      this.log.info(
        `Found ${vehicleVins.length} vehicle(s) and ${energySiteIds.length} energy site(s)`,
      );

      // Register vehicles
      for (const vin of vehicleVins) {
        // Check if vehicle should be ignored
        if (this.config.ignoreVehicles?.includes(vin)) {
          this.log.info(`Ignoring vehicle ${vin} (configured in ignore list)`);
          continue;
        }

        const vehicle = this.products.vehicles[vin];
        this.registerVehicle(vehicle);
      }

      // Register energy sites
      for (const siteIdStr of energySiteIds) {
        const siteId = parseInt(siteIdStr, 10);

        // Check if energy site should be ignored
        if (this.config.ignoreEnergySites?.includes(siteId)) {
          this.log.info(`Ignoring energy site ${siteId} (configured in ignore list)`);
          continue;
        }

        const site = this.products.energySites[siteIdStr];
        this.registerEnergySite(site);
      }
    } catch (error) {
      this.log.error("Failed to discover devices:", error);
      this.log.error("Please check your access token and network connection.");
    }
  }

  /**
   * Set up streaming event handlers for connection management
   */
  private setupStreamingHandlers(): void {
    if (!this.teslemetry) {
      return;
    }

    this.teslemetry.sse.on("connect", () => {
      this.log.info("✓ Streaming API connected");
    });

    this.teslemetry.sse.on("disconnect", () => {
      this.log.warn("✗ Streaming API disconnected - will attempt to reconnect");
    });
  }

  /**
   * Register a vehicle as a HomeKit accessory
   */
  private registerVehicle(vehicle: VehicleDetails): void {
    const uuid = this.api.hap.uuid.generate(vehicle.vin);
    const displayName = this.config.prefixName !== false
      ? vehicle.name
      : vehicle.name.replace(/^.+? /, ""); // Remove "FirstName's " prefix if prefixName is false

    // Check if accessory already exists in cache
    const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);

    if (existingAccessory) {
      // Restore existing accessory
      this.log.info("Restoring vehicle from cache:", displayName);

      // Update accessory context with latest vehicle details
      existingAccessory.context.vehicle = {
        vin: vehicle.vin,
        name: vehicle.name,
      };

      // Initialize VehicleAccessory with services
      const vehicleAccessory = new VehicleAccessory(this, existingAccessory, vehicle);
      this.vehicleAccessories.set(vehicle.vin, vehicleAccessory);

      this.api.updatePlatformAccessories([existingAccessory]);
    } else {
      // Create new accessory
      this.log.info("Adding new vehicle:", displayName);

      const accessory = new this.api.platformAccessory(displayName, uuid);

      // Store vehicle info in context
      accessory.context.vehicle = {
        vin: vehicle.vin,
        name: vehicle.name,
      };

      // Initialize VehicleAccessory with services
      const vehicleAccessory = new VehicleAccessory(this, accessory, vehicle);
      this.vehicleAccessories.set(vehicle.vin, vehicleAccessory);

      // Register the accessory
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    }

    this.log.info(`✓ Vehicle registered: ${displayName} (${vehicle.vin})`);
  }

  /**
   * Register an energy site as a HomeKit accessory
   */
  private registerEnergySite(site: EnergyDetails): void {
    const uuid = this.api.hap.uuid.generate(`energy-${site.id}`);
    const displayName = this.config.prefixName !== false
      ? site.name
      : site.name.replace(/^.+? /, ""); // Remove "FirstName's " prefix if prefixName is false

    // Check if accessory already exists in cache
    const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);

    if (existingAccessory) {
      // Restore existing accessory
      this.log.info("Restoring energy site from cache:", displayName);

      // Update accessory context with latest site details
      existingAccessory.context.site = {
        id: site.id,
        name: site.name,
      };

      // Initialize EnergyAccessory with services
      const energyAccessory = new EnergyAccessory(this, existingAccessory, site);
      this.energyAccessories.set(site.id, energyAccessory);

      this.api.updatePlatformAccessories([existingAccessory]);
    } else {
      // Create new accessory
      this.log.info("Adding new energy site:", displayName);

      const accessory = new this.api.platformAccessory(displayName, uuid);

      // Store site info in context
      accessory.context.site = {
        id: site.id,
        name: site.name,
      };

      // Initialize EnergyAccessory with services
      const energyAccessory = new EnergyAccessory(this, accessory, site);
      this.energyAccessories.set(site.id, energyAccessory);

      // Register the accessory
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    }

    this.log.info(`✓ Energy site registered: ${displayName} (ID: ${site.id})`);
  }

  /**
   * Remove accessories that are no longer present or were removed from config
   */
  private removeAccessory(accessory: PlatformAccessory): void {
    this.log.info("Removing accessory:", accessory.displayName);

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

    const index = this.accessories.indexOf(accessory);
    if (index > -1) {
      this.accessories.splice(index, 1);
    }
  }
}

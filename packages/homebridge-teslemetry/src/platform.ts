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

  // True once the stream has stopped permanently (two consecutive auth
  // failures); cleared only by a subsequent "connect", since the SDK never
  // reconnects on its own from this state.
  private streamFaulted = false;

  // Accessory management
  private readonly accessories: PlatformAccessory[] = [];
  private readonly vehicleAccessories: Map<string, VehicleAccessory> = new Map();
  private readonly energyAccessories: Map<number, EnergyAccessory> = new Map();

  // Aborts an in-progress createProducts() retry backoff on shutdown, so
  // Homebridge doesn't hang around waiting for a timer that no longer matters.
  private discoveryAbort?: AbortController;

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
      this.discoveryAbort?.abort();
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
          info: (message, ...args) => this.log.info(message, ...args),
          error: (message, ...args) => this.log.error(message, ...args),
          warn: (message, ...args) => this.log.warn(message, ...args),
          debug: (message, ...args) => this.log.debug(message, ...args),
        },
        stream: {
          cache: true, // Enable caching for immediate value access
        },
      });

      // Get all products (vehicles and energy sites)
      this.log.info("Fetching Tesla products...");
      this.discoveryAbort = new AbortController();
      this.products = await this.fetchProductsWithRetry(this.teslemetry, this.discoveryAbort.signal);

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
      const keepUuids = new Set<string>();
      for (const vin of vehicleVins) {
        // Check if vehicle should be ignored
        if (this.config.ignoreVehicles?.includes(vin)) {
          this.log.info(`Ignoring vehicle ${vin} (configured in ignore list)`);
          continue;
        }

        const vehicle = this.products.vehicles[vin];
        keepUuids.add(this.registerVehicle(vehicle));
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
        keepUuids.add(this.registerEnergySite(site));
      }

      // Anything cached from a previous run that wasn't just registered
      // above is either gone from the account or newly ignored - evict it.
      this.reconcileAccessories(keepUuids);
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

    // "connect" fires as soon as the SSE handshake completes, before any
    // event is consumed - clearing StatusFault here would show last-known
    // (possibly stale/default) sensor state as healthy again with no proof
    // fresh data has actually arrived. Each faulted service instead clears
    // its own StatusFault the next time it receives a real payload (the
    // same "unknown/faulted until a real reading lands" convention already
    // used for TPMS/grid-outage/storm-watch at startup).
    this.teslemetry.sse.on("connect", () => {
      if (this.streamFaulted) {
        this.log.info("✓ Streaming API reconnected");
        this.streamFaulted = false;
      } else {
        this.log.info("✓ Streaming API connected");
      }
    });

    // A disconnect on its own doesn't say whether the SDK will retry or has
    // stopped for good - that distinction only arrives via stream_error/
    // auth_failure below, so this log makes no promise either way.
    this.teslemetry.sse.on("disconnect", () => {
      this.log.warn("✗ Streaming API disconnected");
    });

    this.teslemetry.sse.on("stream_error", ({ error, status, retries }) => {
      const message = error instanceof Error ? error.message : String(error);
      this.log.warn(
        `Streaming API error (status ${status ?? "unknown"}, attempt ${retries}): ${message}`,
      );
    });

    this.teslemetry.sse.on("auth_failure", (error) => {
      this.log.error(
        "Streaming API authentication failed twice in a row and has stopped permanently - " +
          "characteristics will no longer update. Fix the access token in this plugin's " +
          "config and restart Homebridge to resume streaming.",
        error,
      );
      this.streamFaulted = true;
      this.markStreamFault(true);
    });
  }

  /**
   * Reflect terminal stream health on every registered vehicle/energy site.
   */
  private markStreamFault(faulted: boolean): void {
    for (const vehicleAccessory of this.vehicleAccessories.values()) {
      vehicleAccessory.setStreamFault(faulted);
    }
    for (const energyAccessory of this.energyAccessories.values()) {
      energyAccessory.setStreamFault(faulted);
    }
  }

  /**
   * Register a vehicle as a HomeKit accessory. Returns the accessory's UUID
   * so callers can tell reconcileAccessories() which cached accessories to keep.
   */
  private registerVehicle(vehicle: VehicleDetails): string {
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
    return uuid;
  }

  /**
   * Register an energy site as a HomeKit accessory. Returns the accessory's
   * UUID so callers can tell reconcileAccessories() which cached accessories to keep.
   */
  private registerEnergySite(site: EnergyDetails): string {
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
    return uuid;
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

  /**
   * Evict every cached accessory that wasn't just registered this discovery
   * pass - it's either gone from the account or newly config-ignored.
   * Destroys its live services (and their SSE listeners) before unregistering
   * it, the same teardown a normal shutdown performs.
   */
  private reconcileAccessories(keepUuids: Set<string>): void {
    for (const accessory of this.accessories.slice()) {
      if (keepUuids.has(accessory.UUID)) {
        continue;
      }

      const vin = (accessory.context as { vehicle?: { vin: string } }).vehicle?.vin;
      if (vin !== undefined) {
        this.vehicleAccessories.get(vin)?.destroy();
        this.vehicleAccessories.delete(vin);
      }

      const siteId = (accessory.context as { site?: { id: number } }).site?.id;
      if (siteId !== undefined) {
        this.energyAccessories.get(siteId)?.destroy();
        this.energyAccessories.delete(siteId);
      }

      this.log.info("Evicting stale cached accessory (no longer returned or now ignored):", accessory.displayName);
      this.removeAccessory(accessory);
    }
  }

  /**
   * Fetch products, retrying transient failures with capped exponential
   * backoff so a momentary API/network blip doesn't require a Homebridge
   * restart to recover from.
   */
  private async fetchProductsWithRetry(teslemetry: Teslemetry, signal: AbortSignal): Promise<Products> {
    const maxAttempts = 5;
    let attempt = 0;
    while (true) {
      try {
        return await teslemetry.createProducts();
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts || signal.aborted) {
          throw error;
        }

        const delayMs = Math.min(2 ** attempt, 30) * 1000;
        const message = error instanceof Error ? error.message : String(error);
        this.log.warn(
          `Fetching Tesla products failed (attempt ${attempt}/${maxAttempts}): ${message}. Retrying in ${delayMs / 1000}s...`,
        );
        await sleep(delayMs, signal);
      }
    }
  }
}

/** Resolves after `ms`, or immediately if `signal` aborts first - the abort
 *  path also clears the pending timer so it never fires. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

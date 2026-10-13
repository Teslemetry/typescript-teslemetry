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

import { Teslemetry, useTeslaModel, type Products, type VehicleDetails, type EnergyDetails } from "@teslemetry/api";
import { PLATFORM_NAME, PLUGIN_NAME, type TeslemetryPlatformConfig } from "./settings.js";
import { VehicleAccessory } from "./vehicle.js";
import { EnergyAccessory } from "./energy.js";
import { holdAccessory } from "./hold.js";
import { createSdkLogger, describeError } from "./log.js";

/** Stream refusals the user has to act on, named in the log. */
const STREAM_STATUS_REASONS: Record<number, string> = {
  401: "access token rejected",
  402: "subscription required",
  403: "access token rejected",
  429: "too many connections",
};

/** How long to wait before connecting again after the SDK stopped the stream
 *  on repeated auth failures. The SDK never resumes on its own, so a token that
 *  was rejected for a moment, or a renewed subscription, needs this to recover
 *  without a restart. */
const AUTH_RETRY_DELAY_MS = 5 * 60_000;

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

  /** Current terminal-stream-fault state, so a service constructed after the
   *  fault was raised (e.g. hydrating services from Homebridge's persisted
   *  accessory cache) can apply it immediately instead of waiting for the
   *  next markStreamFault() call that will never come until reconnect. */
  get streamFault(): boolean {
    return this.streamFaulted;
  }

  // Why every tile shows "No Response", or undefined while tiles show their
  // last-known values. Set only for states the user has to fix (a rejected
  // token, a lapsed subscription); an ordinary reconnect keeps the values.
  private unavailableReason?: string;
  private authRetryTimer?: ReturnType<typeof setTimeout>;

  /** True while every tile shows "No Response"; writes must fail meanwhile. */
  get unavailable(): boolean {
    return this.unavailableReason !== undefined;
  }

  // Accessory management
  private readonly accessories: PlatformAccessory[] = [];
  private readonly vehicleAccessories: Map<string, VehicleAccessory> = new Map();
  private readonly energyAccessories: Map<number, EnergyAccessory> = new Map();

  // Cached accessories with no live services yet, and the function that
  // removes each one's hold (see holdAccessory()).
  private readonly holds: Map<string, () => void> = new Map();
  // UUIDs of cached accessories that stay unusable until Homebridge restarts.
  private readonly unreachable: Set<string> = new Set();
  // True once discovery has been failing for DISCOVERY_GRACE_MS.
  private discoveryOverdue = false;

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

    if (this.config.ignore_vin || this.config.ignore_site) {
      this.log.warn(
        'The config keys "ignore_vin" and "ignore_site" are now "ignoreVehicles" and ' +
          '"ignoreEnergySites". The old keys are still read.',
      );
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
      clearTimeout(this.authRetryTimer);
      this.teslemetry?.sse.close();
    });
  }

  /**
   * Homebridge calls this method to restore cached accessories from disk
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info("Loading accessory from cache:", accessory.displayName);
    this.accessories.push(accessory);
    // Until discovery builds its services, a write must fail rather than be
    // stored and dropped.
    this.hold(accessory);
  }

  /**
   * Discover and initialize Tesla vehicles and energy sites
   */
  private async discoverDevices(): Promise<void> {
    // Initialize Teslemetry SDK
    this.log.info("Connecting to Teslemetry...");
    this.teslemetry = new Teslemetry(this.config.accessToken, {
      logger: createSdkLogger(this.log),
      stream: {
        cache: true, // Enable caching for immediate value access
      },
    });

    // Get all products (vehicles and energy sites). This only gives up on shutdown.
    this.log.info("Fetching Tesla products...");
    this.discoveryAbort = new AbortController();
    try {
      this.products = await this.fetchProductsWithRetry(this.teslemetry, this.discoveryAbort.signal);
    } catch {
      return;
    }

    // Connect to streaming API
    this.log.info("Connecting to streaming API...");
    this.teslemetry.sse.connect();

    // Set up streaming event handlers
    this.setupStreamingHandlers();

    this.registerProducts(this.products);
  }

  /**
   * Register every product that is not ignored, then evict cached
   * accessories that are no longer returned. Each product is set up on its
   * own, so one that fails does not keep the others out of HomeKit.
   */
  private registerProducts(products: Products): void {
    const vehicleVins = Object.keys(products.vehicles);
    const energySiteIds = Object.keys(products.energySites);

    this.log.info(
      `Found ${vehicleVins.length} vehicle(s) and ${energySiteIds.length} energy site(s)`,
    );

    const ignoredVehicles = new Set([
      ...(this.config.ignoreVehicles ?? []),
      ...(this.config.ignore_vin ?? []),
    ]);
    const ignoredSites = new Set(
      [...(this.config.ignoreEnergySites ?? []), ...(this.config.ignore_site ?? [])].map(String),
    );

    // Register vehicles
    const keepUuids = new Set<string>();
    for (const vin of vehicleVins) {
      // Check if vehicle should be ignored
      if (ignoredVehicles.has(vin)) {
        this.log.info(`Ignoring vehicle ${vin} (configured in ignore list)`);
        continue;
      }

      const vehicle = withName(products.vehicles[vin], useTeslaModel(vin));
      const uuid = this.api.hap.uuid.generate(vin);
      const cached = this.accessories.some((acc) => acc.UUID === uuid);

      const problem = unusableReason(vehicle);
      if (problem) {
        this.log.warn(
          `Vehicle ${vehicle.name} (${vin}) cannot stream: ${problem}. ` +
            (cached
              ? "Its HomeKit tiles show No Response until this is fixed and Homebridge is restarted."
              : "It is not added to HomeKit until this is fixed and Homebridge is restarted."),
        );
        if (cached) {
          keepUuids.add(uuid);
          this.unreachable.add(uuid);
        }
        continue;
      }

      keepUuids.add(uuid);
      try {
        this.registerVehicle(vehicle);
      } catch (error) {
        this.log.error(`Failed to set up vehicle ${vehicle.name} (${vin}):`, error);
        this.holdUnreachable(uuid);
      }
    }

    // Register energy sites
    for (const siteIdStr of energySiteIds) {
      const siteId = parseInt(siteIdStr, 10);

      // Check if energy site should be ignored
      if (ignoredSites.has(String(siteId))) {
        this.log.info(`Ignoring energy site ${siteId} (configured in ignore list)`);
        continue;
      }

      const site = withName(products.energySites[siteIdStr], "Energy Site");
      const uuid = this.api.hap.uuid.generate(`energy-${site.id}`);
      keepUuids.add(uuid);
      try {
        this.registerEnergySite(site);
      } catch (error) {
        this.log.error(`Failed to set up energy site ${site.name} (ID: ${site.id}):`, error);
        this.holdUnreachable(uuid);
      }
    }

    // Anything cached from a previous run that wasn't just registered
    // above is either gone from the account or newly ignored - evict it.
    this.reconcileAccessories(keepUuids);
  }

  /**
   * Hold a cached accessory whose setup failed again, so it answers No
   * Response instead of accepting writes with no service behind them.
   */
  private holdUnreachable(uuid: string): void {
    this.unreachable.add(uuid);
    const accessory = this.accessories.find((acc) => acc.UUID === uuid);
    if (accessory && !this.holds.has(uuid)) {
      this.hold(accessory);
    }
  }

  private hold(accessory: PlatformAccessory): void {
    this.holds.set(
      accessory.UUID,
      holdAccessory(
        this.api,
        accessory,
        () => this.discoveryOverdue || this.unreachable.has(accessory.UUID),
      ),
    );
  }

  /** Remove the hold on a cached accessory before its live services are built. */
  private release(uuid: string): void {
    this.holds.get(uuid)?.();
    this.holds.delete(uuid);
  }

  /**
   * Set up streaming event handlers for connection management
   */
  private setupStreamingHandlers(): void {
    if (!this.teslemetry) {
      return;
    }

    // "connect" fires on the stream's first chunk, so the server has
    // accepted the token and the subscription: tiles that showed "No
    // Response" get their last-known values back. Sensor StatusFault is not
    // cleared here - each faulted service clears its own the next time it
    // receives a real payload (the same "unknown/faulted until a real reading
    // lands" convention already used for TPMS/grid-outage/storm-watch at
    // startup), since a connect alone proves no fresh reading has arrived.
    this.teslemetry.sse.on("connect", () => {
      if (this.streamFaulted || this.unavailable) {
        this.log.info("✓ Streaming API reconnected");
        this.streamFaulted = false;
        this.setUnavailable(undefined);
      } else {
        this.log.info("✓ Streaming API connected");
      }
    });

    // Every failed attempt also emits "disconnect"; the stream_error line
    // below already names the reason, so this one stays at debug.
    this.teslemetry.sse.on("disconnect", () => {
      this.log.debug("✗ Streaming API disconnected");
    });

    this.teslemetry.sse.on("stream_error", ({ error, status, retries }) => {
      const reason = status !== undefined ? STREAM_STATUS_REASONS[status] : undefined;
      const statusText = status !== undefined ? `HTTP ${status}` : "connection lost";
      this.log.warn(
        `Streaming API error (${reason ? `${reason}, ` : ""}${statusText}, attempt ${retries}): ${describeError(error)}`,
      );
      // A lapsed subscription does not fix itself; the SDK keeps retrying
      // with its backoff and the next connect restores the tiles.
      if (status === 402) {
        this.setUnavailable(STREAM_STATUS_REASONS[402]);
      }
    });

    this.teslemetry.sse.on("auth_failure", (error) => {
      const minutes = AUTH_RETRY_DELAY_MS / 60_000;
      this.log.error(
        `Streaming API stopped: the access token was rejected twice in a row (${describeError(error)}). ` +
          `Characteristics show No Response until it is accepted. Trying again in ${minutes} minutes; ` +
          "if the token was revoked, update it in this plugin's config and restart Homebridge.",
      );
      this.streamFaulted = true;
      this.markStreamFault(true);
      this.setUnavailable(STREAM_STATUS_REASONS[401]);
      // The SDK has left its connect loop and never resumes on its own.
      clearTimeout(this.authRetryTimer);
      this.authRetryTimer = setTimeout(() => {
        this.authRetryTimer = undefined;
        this.teslemetry?.sse.connect();
      }, AUTH_RETRY_DELAY_MS);
      // Homebridge stays up on its own; the retry must not hold it open.
      this.authRetryTimer.unref?.();
    });
  }

  /**
   * Show "No Response" on every tile while the user has to act (`reason` set),
   * or give the tiles their last-known values back (`reason` undefined).
   */
  private setUnavailable(reason: string | undefined): void {
    if (reason === this.unavailableReason) return;
    const wasUnavailable = this.unavailable;
    this.unavailableReason = reason;
    if (wasUnavailable === this.unavailable) return;
    for (const accessory of this.accessories) {
      this.applyAvailability(accessory);
    }
  }

  /** A product registered while unavailable starts at "No Response" too. */
  private applyAvailabilityTo(uuid: string): void {
    const accessory = this.accessories.find(acc => acc.UUID === uuid);
    if (accessory && this.unavailable) this.applyAvailability(accessory);
  }

  /**
   * Fail every read of the accessory's characteristics with
   * SERVICE_COMMUNICATION_FAILURE (HomeKit shows "No Response") while the
   * platform is unavailable, or clear that failure and keep the stored value.
   * The accessory's information and names stay readable.
   */
  private applyAvailability(accessory: PlatformAccessory): void {
    const { Characteristic, Service, api } = this;
    const failure = new api.hap.HapStatusError(api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    for (const service of accessory.services) {
      if (service.UUID === Service.AccessoryInformation.UUID) continue;
      for (const characteristic of service.characteristics) {
        if (
          characteristic.UUID === Characteristic.Name.UUID ||
          characteristic.UUID === Characteristic.ConfiguredName.UUID
        ) {
          continue;
        }
        if (this.unavailable) {
          characteristic.updateValue(failure);
        } else if (characteristic.statusCode !== 0 && characteristic.value !== null) {
          characteristic.updateValue(characteristic.value);
        }
      }
    }
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
      this.release(uuid);
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

    this.applyAvailabilityTo(uuid);
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
      this.release(uuid);
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

    this.applyAvailabilityTo(uuid);
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
   * Fetch products, retrying every failure with capped exponential backoff
   * until it succeeds, so Homebridge starting before the network or the API
   * is reachable recovers without a restart. Throws only once `signal` aborts.
   */
  private async fetchProductsWithRetry(teslemetry: Pick<Teslemetry, "createProducts">, signal: AbortSignal): Promise<Products> {
    const startedAt = Date.now();
    let attempt = 0;
    while (true) {
      try {
        const products = await teslemetry.createProducts();
        if (this.discoveryOverdue) {
          this.log.info("Teslemetry is reachable again; setting up devices.");
          this.discoveryOverdue = false;
        }
        return products;
      } catch (error) {
        attempt++;
        if (signal.aborted) {
          throw error;
        }

        const delayMs = this.retryDelayMs(attempt);
        const message = describeError(error);
        if (!this.discoveryOverdue && Date.now() - startedAt >= DISCOVERY_GRACE_MS) {
          this.discoveryOverdue = true;
          this.log.error(
            `Fetching Tesla products has failed for ${DISCOVERY_GRACE_MS / 60_000} minutes: ${message}. ` +
              "Cached accessories show No Response until it succeeds. " +
              "Check your access token, your Teslemetry subscription and your network connection.",
          );
        }
        this.log.warn(
          `Fetching Tesla products failed (attempt ${attempt}): ${message}. Retrying in ${delayMs / 1000}s...`,
        );
        await sleep(delayMs, signal);
      }
    }
  }

  /** Wait before retry `attempt`: 2 s, doubling, at most 5 minutes. */
  private retryDelayMs(attempt: number): number {
    return Math.min(2 ** attempt, 300) * 1000;
  }
}

/**
 * How long discovery may fail before cached accessories answer No Response
 * instead of their last-known values.
 */
const DISCOVERY_GRACE_MS = 5 * 60_000;

/** A product the api sent with an empty name, renamed to `fallback`. */
function withName<T extends { name: string }>(product: T, fallback: string): T {
  return product.name ? product : { ...product, name: fallback };
}

/**
 * Why a vehicle cannot stream, from the metadata flags the api sets, or
 * undefined when nothing says it cannot. A null flag is unknown, not a problem.
 */
function unusableReason(vehicle: VehicleDetails): string | undefined {
  const { access, issue } = vehicle.metadata ?? {};
  if (access === false) return "it is not included in your Teslemetry subscription";
  switch (issue) {
    case "key":
      return "the Teslemetry virtual key is not paired with it";
    case "streaming_toggle":
      return "data streaming is turned off on its safety screen";
    case "scope":
      return "your Tesla authorization lacks the vehicle_device_data scope";
    default:
      return undefined;
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

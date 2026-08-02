import { EventEmitter } from "events";
import { TeslemetryVehicleStream } from "./TeslemetryVehicleStream.js";
import { TeslemetryEnergySiteStream } from "./TeslemetryEnergySiteStream.js";
import {
  SseCredits,
  SseEvent,
  SseState,
  SseData,
  SseErrors,
  SseAlerts,
  SseConnectivity,
  SseVehicleData,
  SseConfig,
  SseLiveStatus,
  SseSiteInfo,
  SseEnergyTotals,
  SseTariffContentV2,
  Signals,
} from "./const.js";
import { expandSseTopics, SseTopic, SseTopicPreset } from "./sseTopics.js";
import { Teslemetry } from "./Teslemetry.js";
import { Logger } from "./logger.js";
import { getSseById_ } from "./client/sdk.gen.js";
import { TeslemetryStreamAuthError } from "./exceptions.js";

export interface TeslemetryStreamOptions {
  vin?: string;
  cache?:
    | boolean
    | {
        cloud: boolean;
        local: boolean;
      };
  /** Exact topic names and/or presets (see sseTopics.ts) selecting which SSE
   *  events to receive. Omitted: legacy-all mode, unchanged forever. */
  topics?: readonly (SseTopic | SseTopicPreset)[];
}

export interface TeslemetryStreamErrorEvent {
  error: unknown;
  /** HTTP status of the failed connection attempt, when one was received */
  status?: number;
  /** Consecutive failed connection attempts since the last received event */
  retries: number;
}

// Interface for event type safety
type TeslemetryStreamEventMap = {
  all: SseEvent;
  state: SseState;
  data: SseData;
  errors: SseErrors;
  alerts: SseAlerts;
  connectivity: SseConnectivity;
  credits: SseCredits;
  vehicle_data: SseVehicleData;
  config: SseConfig;
  live_status: SseLiveStatus;
  site_info: SseSiteInfo;
  tariff_content_v2: SseTariffContentV2;
  energy_totals: SseEnergyTotals;
  connect: void;
  disconnect: void;
  stream_error: TeslemetryStreamErrorEvent;
  auth_failure: TeslemetryStreamAuthError;
};

export declare interface TeslemetryStream {
  on<K extends keyof TeslemetryStreamEventMap>(
    event: K,
    listener: (data: TeslemetryStreamEventMap[K]) => void,
  ): this;

  once<K extends keyof TeslemetryStreamEventMap>(
    event: K,
    listener: (data: TeslemetryStreamEventMap[K]) => void,
  ): this;

  off<K extends keyof TeslemetryStreamEventMap>(
    event: K,
    listener: (data: TeslemetryStreamEventMap[K]) => void,
  ): this;

  emit<K extends keyof TeslemetryStreamEventMap>(
    event: K,
    ...args: TeslemetryStreamEventMap[K] extends void
      ? []
      : [TeslemetryStreamEventMap[K]]
  ): boolean;
}

export interface VehicleCache {
  state?: SseState["state"];
  data?: SseData["data"];
  alerts?: SseAlerts["alerts"];
  errors?: SseErrors["errors"];
  connectivity?: Partial<
    Record<SseConnectivity["networkInterface"], SseConnectivity["status"]>
  >;
}

type Cache = Record<string, VehicleCache>;

export interface EnergySiteCache {
  live_status?: SseLiveStatus["live_status"];
  site_info?: SseSiteInfo["site_info"];
  /** `undefined`: never received. `null`: explicitly removed by the server. */
  tariff_content_v2?: SseTariffContentV2["tariff_content_v2"];
  energy_totals?: {
    totals: SseEnergyTotals["totals"];
  };
}

/** Merges the cached slim `site_info` document with the last received
 *  `tariff_content_v2` piece into a whole-document view resembling the full
 *  REST `site_info` response. Returns `undefined` until a `site_info` event
 *  has been cached; omits `tariff_content_v2` until a tariff event (present
 *  or explicit-removal) has been cached, rather than guessing at absence. */
export function composeEnergySiteInfo(
  cache: EnergySiteCache,
): (Record<string, unknown> & { tariff_content_v2?: Record<string, unknown> | null }) | undefined {
  if (!cache.site_info) return undefined;
  if (cache.tariff_content_v2 === undefined) return { ...cache.site_info };
  return { ...cache.site_info, tariff_content_v2: cache.tariff_content_v2 };
}

type EnergyCache = Record<string, EnergySiteCache>;

export class TeslemetryStream extends EventEmitter {
  private root: Teslemetry;
  public active: boolean = false;
  public connected: boolean = false;
  private vin: string | undefined;
  public cache: Cache = {};
  public energyCache: EnergyCache = {};
  private cloudCache: boolean | undefined;
  private localCache: boolean | undefined;
  /** Comma-separated exact wire topic names, already expanded from any
   *  presets; `undefined` means legacy-all mode (the `topics` param is
   *  omitted entirely, never sent as an empty value). */
  private topicsParam: string | undefined;
  public logger: Logger;
  public vehicles: Map<string, TeslemetryVehicleStream> = new Map();
  public energySites: Map<string, TeslemetryEnergySiteStream> = new Map();
  /** Aborts the in-flight SSE fetch and, via its shared signal, the
   *  reconnect backoff wait; created fresh per connect() so a closed stream
   *  can be reconnected without reusing an already-aborted controller. */
  private abortController: AbortController | undefined;
  private loopPromise: Promise<void> | undefined;

  // Constructor and basic setup
  constructor(root: Teslemetry, options?: TeslemetryStreamOptions) {
    super();
    this.root = root;
    this.vin = options?.vin;
    if (typeof options?.cache === "boolean") {
      this.cloudCache = options.cache;
      this.localCache = options.cache;
    } else {
      this.cloudCache = options?.cache?.cloud ?? true;
      this.localCache = options?.cache?.local ?? true;
    }
    this.logger = root.logger;
    if (options?.topics?.length) {
      this.topicsParam = expandSseTopics(options.topics).join(",");
    }
    if (this.vin) {
      this.getVehicle(this.vin);
    }
    if (this.localCache) {
      this.startLocalCache();
    }
  }

  public sendVehicleCache<K extends keyof TeslemetryStreamEventMap>(
    vin: string,
    event: K,
    listener: (data: any) => void,
  ) {
    if (this.cache) {
      const vehicleCache = this.cache[vin];
      if (!vehicleCache) return;
      if (event === "connectivity" && vehicleCache.connectivity) {
        for (const networkInterface in vehicleCache.connectivity) {
          const typedNetworkInterface =
            networkInterface as SseConnectivity["networkInterface"];
          const status = vehicleCache.connectivity[typedNetworkInterface];
          if (status !== undefined) {
            listener({
              createdAt: new Date().toISOString(),
              vin,
              networkInterface: typedNetworkInterface,
              status,
              isCache: true,
            } as any);
          }
        }
      } else if (event === "state" && vehicleCache.state) {
        listener({
          createdAt: new Date().toISOString(),
          vin,
          state: vehicleCache.state,
          isCache: true,
        } satisfies SseState);
      } else if (event === "data" && vehicleCache.data) {
        listener({
          createdAt: new Date().toISOString(),
          vin,
          data: vehicleCache.data,
          isCache: true,
        } satisfies SseData);
      } else if (event === "errors" && vehicleCache.errors) {
        listener({
          createdAt: new Date().toISOString(),
          vin,
          errors: vehicleCache.errors,
          isCache: true,
        } satisfies SseErrors);
      } else if (event === "alerts" && vehicleCache.alerts) {
        listener({
          createdAt: new Date().toISOString(),
          vin,
          alerts: vehicleCache.alerts,
          isCache: true,
        } satisfies SseAlerts);
      }
    }
  }

  public sendEnergyCache<K extends keyof TeslemetryStreamEventMap>(
    siteId: string,
    event: K,
    listener: (data: any) => void,
  ) {
    const siteCache = this.energyCache[siteId];
    if (!siteCache) return;
    if (event === "live_status" && siteCache.live_status) {
      listener({
        createdAt: new Date().toISOString(),
        site_id: siteId,
        live_status: siteCache.live_status,
        isCache: true,
      } satisfies SseLiveStatus);
    } else if (event === "site_info" && siteCache.site_info) {
      listener({
        createdAt: new Date().toISOString(),
        site_id: siteId,
        site_info: siteCache.site_info,
        isCache: true,
      } satisfies SseSiteInfo);
    } else if (
      event === "tariff_content_v2" &&
      siteCache.tariff_content_v2 !== undefined
    ) {
      listener({
        createdAt: new Date().toISOString(),
        site_id: siteId,
        tariff_content_v2: siteCache.tariff_content_v2,
        isCache: true,
      } satisfies SseTariffContentV2);
    } else if (event === "energy_totals" && siteCache.energy_totals) {
      listener({
        createdAt: new Date().toISOString(),
        id: siteId,
        totals: siteCache.energy_totals.totals,
        isCache: true,
      } satisfies SseEnergyTotals);
    }
  }

  public on<K extends keyof TeslemetryStreamEventMap>(
    event: K,
    listener: (data: TeslemetryStreamEventMap[K]) => void,
  ): this {
    // Register before replaying cached events: EventEmitter's once()
    // implements itself via on(), wrapping the caller's listener in a
    // self-removing shim. Replaying into that shim before it is registered
    // makes its self-removal a no-op (nothing to remove yet), so it marks
    // itself fired but is then added anyway - a dead listener that never
    // fires again and never goes away. Registering first lets the shim
    // remove itself correctly when the replay invokes it.
    super.on(event, listener);
    for (const vin in this.cache) {
      this.sendVehicleCache(vin, event, listener);
    }
    for (const siteId in this.energyCache) {
      this.sendEnergyCache(siteId, event, listener);
    }
    return this;
  }

  public getVehicle(vin: string): TeslemetryVehicleStream {
    if (!this.vehicles.has(vin)) {
      new TeslemetryVehicleStream(this.root, vin);
    }
    return this.vehicles.get(vin)!;
  }

  public getEnergySite(id: string): TeslemetryEnergySiteStream {
    if (!this.energySites.has(id)) {
      new TeslemetryEnergySiteStream(this.root, id);
    }
    return this.energySites.get(id)!;
  }

  public async connect(): Promise<void> {
    if (this.active) {
      return; // Already connected
    }

    this.active = true;
    this.abortController = new AbortController();
    this.loopPromise = this._connectLoop(this.abortController.signal);
  }

  private async _connectLoop(signal: AbortSignal) {
    let retries = 0;
    let authFailures = 0;
    while (this.active) {
      // The generated SSE client retries internally and never rethrows, so
      // limit it to a single attempt and capture its failure: every retry
      // then flows through this loop, which re-resolves auth (a refreshed
      // token is picked up on reconnect) and applies the policy below.
      let streamError: unknown;
      try {
        const sse = await getSseById_({
          client: this.root.client,
          path: { id: this.vin || "" },
          query: {
            cache: this.cloudCache,
            ...(this.topicsParam ? { topics: this.topicsParam } : {}),
          },
          sseMaxRetryAttempts: 1,
          signal,
          onSseError: (error) => {
            streamError = error;
          },
        });

        this.logger.info(`Connected to stream`);
        this.connected = true;
        this.emit("connect");

        if (sse.stream) {
          for await (const event of sse.stream) {
            if (!this.active) break;
            retries = 0;
            authFailures = 0;
            this._dispatch(event);
          }
        }

        if (streamError !== undefined) throw streamError;
      } catch (error) {
        if (!this.active) break;

        this.connected = false;
        this.emit("disconnect");

        retries++;
        const status = parseSseStatus(error);
        const isAuthError = status === 401 || status === 403;
        const finalError = isAuthError
          ? new TeslemetryStreamAuthError(
              error instanceof Error ? error.message : String(error),
              status,
            )
          : error;

        this.logger.error("SSE error:", finalError);
        this.emit("stream_error", { error: finalError, status, retries });

        if (isAuthError) {
          authFailures++;
          if (authFailures >= 2) {
            this.logger.error(
              "Stream authentication failed twice in a row; stopping. Call connect() with valid credentials to resume.",
            );
            this.active = false;
            this.emit("auth_failure", finalError as TeslemetryStreamAuthError);
            break;
          }
          // Reconnect immediately: the next attempt re-resolves the auth
          // callback, giving a refreshed token exactly one retry before the
          // stream stops.
          continue;
        }

        const delay = Math.min(2 ** retries, 600) * 1000;
        this.logger.info(`Reconnecting in ${delay / 1000} seconds...`);

        await sleep(delay, signal);
      }
    }
    this.connected = false;
    this.emit("disconnect");
  }

  public async disconnect(): Promise<void> {
    await this.close();
  }

  /** Aborts the in-flight fetch/reader and cancels any pending reconnect
   *  backoff wait immediately, then resolves once `_connectLoop` has fully
   *  exited - safe to await before reconnecting. */
  public async close(): Promise<void> {
    this.active = false;
    this.logger.info(`Disconnecting from stream`);
    this.abortController?.abort();
    await this.loopPromise;
  }

  public parseCreatedAt(event: SseEvent): Date {
    const [main, ns] = event.createdAt.split(".");
    const date = new Date(main + "Z");
    return new Date(date.getTime() + parseInt((ns || "000").substring(0, 3)));
  }

  private _dispatch(event: SseEvent) {
    if ("state" in event) {
      this.emit("state", event);
    } else if ("data" in event) {
      this.emit("data", event);
    } else if ("errors" in event) {
      this.emit("errors", event);
    } else if ("alerts" in event) {
      this.emit("alerts", event);
    } else if ("networkInterface" in event) {
      this.emit("connectivity", event);
    } else if ("credits" in event) {
      this.emit("credits", event);
    } else if ("vehicle_data" in event) {
      this.emit("vehicle_data", event);
    } else if ("config" in event) {
      this.emit("config", event);
    } else if ("live_status" in event) {
      this.emit("live_status", event);
    } else if ("site_info" in event) {
      this.emit("site_info", event);
    } else if ("tariff_content_v2" in event) {
      this.emit("tariff_content_v2", event);
    } else if ("totals" in event) {
      this.emit("energy_totals", event as SseEnergyTotals);
    }
    this.emit("all", event);

    if ("site_id" in event) {
      const site = this.energySites.get(event.site_id);
      if (site) {
        if ("live_status" in event) {
          site.emit("live_status", event);
        } else if ("site_info" in event) {
          site.emit("site_info", event);
        } else if ("tariff_content_v2" in event) {
          site.emit("tariff_content_v2", event);
        }
      }
      return;
    }

    if ("totals" in event) {
      const site = this.energySites.get(event.id);
      if (site) {
        site.emit("energy_totals", event as SseEnergyTotals);
      }
      return;
    }

    // "credits" events are account-wide and carry no vin, so they never route to a vehicle.
    if (!("vin" in event) || !event.vin) return;

    const vehicle = this.vehicles.get(event.vin);
    if (vehicle) {
      if ("state" in event) {
        vehicle.emit("state", event);
      } else if ("data" in event) {
        vehicle.emit("data", event);
        // Emit each signal individually
        (Object.keys(event.data) as Signals[]).forEach((key) => {
          if (event.data[key] !== undefined)
            vehicle.data.emit(key, event.data[key]);
        });
      } else if ("errors" in event) {
        vehicle.emit("errors", event);
      } else if ("alerts" in event) {
        vehicle.emit("alerts", event);
      } else if ("networkInterface" in event) {
        vehicle.emit("connectivity", event);
      } else if ("vehicle_data" in event) {
        vehicle.emit("vehicle_data", event);
      } else if ("config" in event) {
        vehicle.emit("config", event);
      }
    }
  }

  // Arrow-function fields, not methods: sendVehicleCache/sendEnergyCache
  // replay cached events by calling the listener as a bare function (not
  // through emit(), which binds `this` to the emitter itself), so an
  // unbound method reference would see `this` as undefined mid-replay.
  private cacheState = (event: SseState): void => {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].state = event.state;
  };

  private cacheData = (event: SseData): void => {
    this.cache[event.vin] ??= { data: {} };
    this.cache[event.vin].data = {
      ...this.cache[event.vin].data,
      ...event.data,
    };
  };

  private cacheErrors = (event: SseErrors): void => {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].errors = event.errors;
  };

  private cacheAlerts = (event: SseAlerts): void => {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].alerts = event.alerts;
  };

  private cacheConnectivity = (event: SseConnectivity): void => {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].connectivity ??= {};
    this.cache[event.vin].connectivity![event.networkInterface] = event.status;
  };

  private cacheLiveStatus = (event: SseLiveStatus): void => {
    this.energyCache[event.site_id] ??= {};
    this.energyCache[event.site_id].live_status = event.live_status;
  };

  private cacheSiteInfo = (event: SseSiteInfo): void => {
    this.energyCache[event.site_id] ??= {};
    this.energyCache[event.site_id].site_info = event.site_info;
  };

  private cacheTariffContentV2 = (event: SseTariffContentV2): void => {
    this.energyCache[event.site_id] ??= {};
    this.energyCache[event.site_id].tariff_content_v2 = event.tariff_content_v2;
  };

  private cacheEnergyTotals = (event: SseEnergyTotals): void => {
    this.energyCache[event.id] ??= {};
    this.energyCache[event.id].energy_totals = {
      totals: event.totals,
    };
  };

  public startLocalCache(): void {
    this.localCache = true;
    this.on("state", this.cacheState);
    this.on("data", this.cacheData);
    this.on("errors", this.cacheErrors);
    this.on("alerts", this.cacheAlerts);
    this.on("connectivity", this.cacheConnectivity);
    this.on("live_status", this.cacheLiveStatus);
    this.on("site_info", this.cacheSiteInfo);
    this.on("tariff_content_v2", this.cacheTariffContentV2);
    this.on("energy_totals", this.cacheEnergyTotals);
    this.logger.info(`Started local cache`);
  }

  public stopLocalCache(): void {
    this.localCache = false;
    this.off("state", this.cacheState);
    this.off("data", this.cacheData);
    this.off("errors", this.cacheErrors);
    this.off("alerts", this.cacheAlerts);
    this.off("connectivity", this.cacheConnectivity);
    this.off("live_status", this.cacheLiveStatus);
    this.off("site_info", this.cacheSiteInfo);
    this.off("tariff_content_v2", this.cacheTariffContentV2);
    this.off("energy_totals", this.cacheEnergyTotals);
    this.logger.info(`Stopped local cache`);
  }
}

/**
 * Extract the HTTP status from a failed SSE connection attempt. The generated
 * client throws a plain Error with the message "SSE failed: <status>
 * <statusText>" and generated code must not be hand-edited, so the status is
 * recovered from the message.
 */
function parseSseStatus(error: unknown): number | undefined {
  if (error instanceof Error) {
    const match = /^SSE failed: (\d{3})\b/.exec(error.message);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** Resolves after `ms`, or immediately if `signal` aborts first - the
 *  abort path also clears the pending timer so it never fires. */
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

import { EventEmitter } from "events";
import { TeslemetryVehicleStream } from "./TeslemetryVehicleStream.js";
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
  Signals,
} from "./const.js";
import { Teslemetry } from "./Teslemetry.js";
import { Logger } from "./logger.js";
import { getSseByVin_ } from "./client/sdk.gen.js";

export interface TeslemetryStreamOptions {
  vin?: string;
  cache?:
    | boolean
    | {
        cloud: boolean;
        local: boolean;
      };
}

// Interface for event type safety
type TeslemetryStreamEventMap = {
  state: SseState;
  data: SseData;
  errors: SseErrors;
  alerts: SseAlerts;
  connectivity: SseConnectivity;
  credits: SseCredits;
  vehicle_data: SseVehicleData;
  config: SseConfig;
  connect: void;
  disconnect: void;
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

export class TeslemetryStream extends EventEmitter {
  private root: Teslemetry;
  public active: boolean = false;
  public connected: boolean = false;
  private vin: string | undefined;
  public cache: Cache = {};
  private cloudCache: boolean | undefined;
  private localCache: boolean | undefined;
  public logger: Logger;
  public vehicles: Map<string, TeslemetryVehicleStream> = new Map();

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
    if (this.vin) {
      this.getVehicle(this.vin);
    }
    if (this.localCache) {
      this.startLocalCache();
    }
  }

  public sendCache<K extends keyof TeslemetryStreamEventMap>(
    vin: string,
    event: K,
    listener: (data: any) => void,
  ) {
    if (this.cache) {
      const vehicleCache = this.cache[vin];
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

  public on<K extends keyof TeslemetryStreamEventMap>(
    event: K,
    listener: (data: TeslemetryStreamEventMap[K]) => void,
  ): this {
    for (const vin in this.cache) {
      this.sendCache(vin, event, listener);
    }
    return super.on(event, listener);
  }

  public getVehicle(vin: string): TeslemetryVehicleStream {
    if (!this.vehicles.has(vin)) {
      new TeslemetryVehicleStream(this.root, vin);
    }
    return this.vehicles.get(vin)!;
  }

  public async connect(): Promise<void> {
    if (this.active) {
      return; // Already connected
    }

    this.active = true;
    this._connectLoop();
  }

  private async _connectLoop() {
    let retries = 0;
    while (this.active) {
      try {
        const sse = await getSseByVin_({
          client: this.root.client,
          path: { vin: this.vin || "" },
          query: {
            cache: this.cloudCache,
          },
        });

        this.logger.info(`Connected to stream`);
        retries = 0;
        this.connected = true;
        this.emit("connect");

        if (sse.stream) {
          for await (const event of sse.stream) {
            if (!this.active) break;
            this._dispatch(event);
          }
        }
      } catch (error) {
        if (!this.active) break;

        this.logger.error("SSE error:", error);

        this.connected = false;
        this.emit("disconnect");

        retries++;
        const delay = Math.min(2 ** retries, 600) * 1000;
        this.logger.info(`Reconnecting in ${delay / 1000} seconds...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    this.emit("disconnect");
  }

  public disconnect(): void {
    this.active = false;
    this.close();
  }

  public close(): void {
    this.active = false;
    this.logger.info(`Disconnecting from stream`);
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
    }

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

  private cacheState(event: SseState): void {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].state = event.state;
  }

  private cacheData(event: SseData): void {
    this.cache[event.vin] ??= { data: {} };
    this.cache[event.vin].data = {
      ...this.cache[event.vin].data,
      ...event.data,
    };
  }

  private cacheErrors(event: SseErrors): void {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].errors = event.errors;
  }

  private cacheAlerts(event: SseAlerts): void {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].alerts = event.alerts;
  }

  private cacheConnectivity(event: SseConnectivity): void {
    this.cache[event.vin] ??= {};
    this.cache[event.vin].connectivity ??= {};
    this.cache[event.vin].connectivity![event.networkInterface] = event.status;
  }

  public startLocalCache(): void {
    this.localCache = true;
    this.on("state", this.cacheState);
    this.on("data", this.cacheData);
    this.on("errors", this.cacheErrors);
    this.on("alerts", this.cacheAlerts);
    this.on("connectivity", this.cacheConnectivity);
    this.logger.info(`Started local cache`);
  }

  public stopLocalCache(): void {
    this.localCache = false;
    this.off("state", this.cacheState);
    this.off("data", this.cacheData);
    this.off("errors", this.cacheErrors);
    this.off("alerts", this.cacheAlerts);
    this.off("connectivity", this.cacheConnectivity);
    this.logger.info(`Stopped local cache`);
  }
}

/**
 * Recursively check if an event matches a filter.
 * @param filter - The filter to match against.
 * @param event - The event to match against.
 * @returns True if the event matches the filter, false otherwise.
 */
function recursiveMatch(filter: any, event: any): boolean {
  if (filter === null || filter === undefined) {
    return true;
  }

  if (
    typeof filter !== "object" ||
    filter === null ||
    typeof event !== "object" ||
    event === null
  ) {
    return filter === event;
  }

  if (Array.isArray(filter)) {
    if (!Array.isArray(event)) {
      return false;
    }
    return filter.some((fItem) =>
      event.some((eItem) => recursiveMatch(fItem, eItem)),
    );
  }

  for (const key in filter) {
    if (!(key in event)) {
      return false;
    }
    if (!recursiveMatch(filter[key], event[key])) {
      return false;
    }
  }

  return true;
}

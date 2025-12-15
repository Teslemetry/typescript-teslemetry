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
  cache?: boolean;
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

export class TeslemetryStream extends EventEmitter {
  private root: Teslemetry;
  public active: boolean = false;
  public connected: boolean = false;
  private vin: string | undefined;
  private cache: boolean | undefined;
  public logger: Logger;
  public vehicles: Map<string, TeslemetryVehicleStream> = new Map();

  // Constructor and basic setup
  constructor(root: Teslemetry, options?: TeslemetryStreamOptions) {
    super();
    this.root = root;
    this.vin = options?.vin;
    this.cache = options?.cache;
    this.logger = root.logger;
    if (this.vin) {
      this.getVehicle(this.vin);
    }
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
            cache: this.cache,
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

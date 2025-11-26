import { TeslemetryVehicleStream } from "./TeslemetryVehicleStream.js";
import {
  ISseCredits,
  ISseEvent,
  ISseState,
  ISseData,
  ISseErrors,
  ISseAlerts,
  ISseConnectivity,
  ISseVehicleData,
  ISseConfig,
} from "./const.js";
import { Teslemetry } from "./Teslemetry.js";
import { Logger } from "./logger.js";
import { getSseByVin_ } from "./client/sdk.gen.js";

type ListenerCallback<T extends ISseEvent = ISseEvent> = (event: T) => void;
type ConnectionListenerCallback = (connected: boolean) => void;
type EventType =
  | "state"
  | "data"
  | "errors"
  | "alerts"
  | "connectivity"
  | "credits"
  | "vehicle_data"
  | "config";

interface ListenerEntry {
  callback: (event: any) => void;
  filters?: Record<string, any>;
}

export class TeslemetryStream {
  private root: Teslemetry;
  public active: boolean = false;
  private vin: string | undefined;
  public logger: Logger;

  private listeners: Map<EventType, Set<ListenerEntry>> = new Map();
  private _connectionListeners: Map<() => void, ConnectionListenerCallback> =
    new Map();
  private vehicles: Map<string, TeslemetryVehicleStream> = new Map();
  private controller: AbortController | null = null;

  // Constructor and basic setup
  constructor(root: Teslemetry, vin?: string) {
    this.root = root;
    this.vin = vin;
    this.logger = root.logger;
    if (this.vin) {
      this.getVehicle(this.vin);
    }
  }

  public getVehicle(vin: string): TeslemetryVehicleStream {
    if (!this.vehicles.has(vin)) {
      this.vehicles.set(vin, new TeslemetryVehicleStream(this.root, this, vin));
    }
    return this.vehicles.get(vin)!;
  }

  // Connection status and management
  public get connected(): boolean {
    return this.active;
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
        });

        if ((sse as any).controller) {
          this.controller = (sse as any).controller;
        }

        this.logger.info(`Connected to stream`);
        retries = 0;
        this._updateConnectionListeners(true);

        if (sse.stream) {
          for await (const event of sse.stream) {
            if (!this.active) break;
            this._dispatch(event);
          }
        }
      } catch (error) {
        if (!this.active) break;

        this.logger.error("SSE error:", error);
        this._updateConnectionListeners(false);

        retries++;
        const delay = Math.min(2 ** retries, 600) * 1000;
        this.logger.info(`Reconnecting in ${delay / 1000} seconds...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    this._updateConnectionListeners(false);
  }

  public disconnect(): void {
    this.active = false;
    this.close();
  }

  public close(): void {
    this.active = false;
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    this.logger.info(`Disconnecting from stream`);
    this._updateConnectionListeners(false);
  }

  // Connection listeners
  public onConnection(callback: ConnectionListenerCallback): () => void {
    const removeListener = () => {
      this._connectionListeners.delete(removeListener);
    };
    this._connectionListeners.set(removeListener, callback);
    return removeListener;
  }

  // Event listeners (typed by event type)
  public onState(
    callback: (event: ISseState) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("state", callback, filters);
  }

  public onData(
    callback: (event: ISseData) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("data", callback, filters);
  }

  public onErrors(
    callback: (event: ISseErrors) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("errors", callback, filters);
  }

  public onAlerts(
    callback: (event: ISseAlerts) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("alerts", callback, filters);
  }

  public onConnectivity(
    callback: (event: ISseConnectivity) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("connectivity", callback, filters);
  }

  public onCredits(
    callback: (event: ISseCredits) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("credits", callback, filters);
  }

  public onVehicleData(
    callback: (event: ISseVehicleData) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("vehicle_data", callback, filters);
  }

  public onConfig(
    callback: (event: ISseConfig) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("config", callback, filters);
  }

  // Legacy and convenience methods
  public on<T extends ISseEvent>(
    callback: ListenerCallback<T>,
    filters?: Record<string, any>,
  ): () => void {
    const eventTypes = [
      "state",
      "data",
      "errors",
      "alerts",
      "connectivity",
      "credits",
      "vehicle_data",
      "config",
    ] as const;
    const removeListeners: (() => void)[] = [];

    for (const eventType of eventTypes) {
      const removeListener = this._createListener(
        eventType,
        callback as (event: any) => void,
        filters,
      );
      removeListeners.push(removeListener);
    }

    return () => {
      removeListeners.forEach((remove) => remove());
    };
  }

  // Private methods
  private _updateConnectionListeners(value: boolean): void {
    for (const listener of this._connectionListeners.values()) {
      listener(value);
    }
  }

  private _createListener<T extends ISseEvent>(
    eventType: EventType,
    callback: (event: T) => void,
    filters?: Record<string, any>,
  ): () => void {
    const entry: ListenerEntry = { callback: callback as any, filters };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(entry);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(entry);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  private _dispatch(event: any) {
    // Add timestamp if missing (parse createdAt)
    if (event.createdAt && !event.timestamp) {
      const [main, ns] = event.createdAt.split(".");
      const date = new Date(main + "Z");
      event.timestamp =
        date.getTime() + parseInt((ns || "000").substring(0, 3));
    }

    let eventType: EventType | undefined;

    if ("state" in event) eventType = "state";
    else if ("data" in event) eventType = "data";
    else if ("errors" in event) eventType = "errors";
    else if ("alerts" in event) eventType = "alerts";
    else if ("networkInterface" in event) eventType = "connectivity";
    else if ("credits" in event) eventType = "credits";
    else if ("vehicle_data" in event) eventType = "vehicle_data";
    else if ("config" in event) eventType = "config";

    if (eventType) {
      const set = this.listeners.get(eventType);
      if (set) {
        for (const entry of set) {
          if (recursiveMatch(entry.filters, event)) {
            entry.callback(event);
          }
        }
      }
    }
  }
}

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

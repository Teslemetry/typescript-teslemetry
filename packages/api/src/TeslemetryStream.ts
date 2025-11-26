import { TeslemetryVehicleStream } from "./TeslemetryVehicleStream";
import { EventSource } from "eventsource";
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
} from "./const";
import { Teslemetry } from "./Teslemetry";
import { Logger } from "./logger";

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

interface PendingListener {
  eventType: EventType;
  callback: (event: any) => void;
  filters?: Record<string, any>;
  removeFunction?: () => void;
}

export class TeslemetryStream {
  private root: Teslemetry;
  private _access_token: string;
  public active: boolean = false;
  private vin: string | undefined;
  public logger: Logger;
  private pendingListeners: PendingListener[] = [];
  private activeListeners: Map<
    () => void,
    { eventSourceCallback: (event: any) => void }
  > = new Map();
  private _connectionListeners: Map<() => void, ConnectionListenerCallback> =
    new Map();
  private retries: number = 0;
  private eventSource: EventSource | null = null;
  private vehicles: Map<string, TeslemetryVehicleStream> = new Map();

  // Constructor and basic setup
  constructor(root: Teslemetry, access_token: string, vin?: string) {
    this.root = root;
    this._access_token = access_token;
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
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    );
  }

  public async connect(): Promise<void> {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    this.active = true;
    const region = await this.root.getRegion();
    const url = new URL(`https://${region}.teslemetry.com/sse`);

    if (this.vin) {
      url.pathname += `/${this.vin}`;
    }
    const urlString = url.toString();
    url.searchParams.append("token", this._access_token);

    this.eventSource = new EventSource(url.toString());

    // Register all pending listeners ASAP
    this._registerPendingListeners();

    this.eventSource.onopen = () => {
      this.logger.info(`Connected to ${urlString}`);
      this.retries = 0;
      this._updateConnectionListeners(true);
    };

    this.eventSource.onerror = (error: any) => {
      this.logger.error("EventSource error:", error);
      this.close();
      this._updateConnectionListeners(false);

      this.retries++;
      const delay = Math.min(2 ** this.retries, 600) * 1000;
      this.logger.info(`Reconnecting in ${delay / 1000} seconds...`);
      setTimeout(
        () =>
          this.connect().catch((error) => {
            this.logger.error("Failed to reconnect:", error);
          }),
        delay,
      );
    };
  }

  public disconnect(): void {
    this.active = false;
    this.close();
  }

  public close(): void {
    if (this.eventSource) {
      this.logger.info(`Disconnecting from stream`);
      this.eventSource.close();
      this.eventSource = null;
    }
    // Clear all active listeners
    this.activeListeners.clear();
    this._updateConnectionListeners(false);
  }

  // Connection listeners
  public addConnectionListener(
    callback: ConnectionListenerCallback,
  ): () => void {
    const removeListener = () => {
      this._connectionListeners.delete(removeListener);
    };
    this._connectionListeners.set(removeListener, callback);
    return removeListener;
  }

  // Event listeners (typed by event type)
  public addStateListener(
    callback: (event: ISseState) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("state", callback, filters);
  }

  public addDataListener(
    callback: (event: ISseData) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("data", callback, filters);
  }

  public addErrorsListener(
    callback: (event: ISseErrors) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("errors", callback, filters);
  }

  public addAlertsListener(
    callback: (event: ISseAlerts) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("alerts", callback, filters);
  }

  public addConnectivityListener(
    callback: (event: ISseConnectivity) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("connectivity", callback, filters);
  }

  public addCreditsListener(
    callback: (event: ISseCredits) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("credits", callback, filters);
  }

  public addVehicleDataListener(
    callback: (event: ISseVehicleData) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("vehicle_data", callback, filters);
  }

  public addConfigListener(
    callback: (event: ISseConfig) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this._createListener("config", callback, filters);
  }

  // Legacy and convenience methods
  public listen<T extends ISseEvent>(
    callback: ListenerCallback<T>,
    filters?: Record<string, any>,
  ): () => void {
    // For backward compatibility, we'll treat this as a generic event listener
    // that works with any event type by checking all possible event types
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

  private _registerPendingListeners(): void {
    // Move pending listeners to active EventSource listeners
    for (const pendingListener of this.pendingListeners) {
      this._addEventSourceListener(
        pendingListener.eventType,
        pendingListener.callback,
        pendingListener.filters,
      );
    }
    // Clear pending listeners
    this.pendingListeners = [];
  }

  private _addEventSourceListener(
    eventType: EventType,
    callback: (event: any) => void,
    filters?: Record<string, any>,
  ): () => void {
    if (!this.eventSource) {
      throw new Error("EventSource not available");
    }

    const wrappedCallback = (event: any) => {
      const data = this._parseEventData(event.data);
      if (recursiveMatch(filters, data)) {
        callback(data);
      }
    };

    this.eventSource.addEventListener(eventType, wrappedCallback);

    const removeFunction = () => {
      this.eventSource?.removeEventListener(eventType, wrappedCallback);
      this.activeListeners.delete(removeFunction);
    };

    this.activeListeners.set(removeFunction, {
      eventSourceCallback: wrappedCallback,
    });

    return removeFunction;
  }

  private _createListener<T extends ISseEvent>(
    eventType: EventType,
    callback: (event: T) => void,
    filters?: Record<string, any>,
  ): () => void {
    if (this.eventSource) {
      // EventSource exists
      return this._addEventSourceListener(eventType, callback, filters);
    } else {
      // EventSource doesn't exist yet - store for later
      const pendingListener: PendingListener = {
        eventType,
        callback,
        filters,
      };

      this.pendingListeners.push(pendingListener);

      return () => {
        const index = this.pendingListeners.indexOf(pendingListener);
        if (index > -1) {
          this.pendingListeners.splice(index, 1);
        }
      };
    }
  }

  private _parseEventData(eventData: string): ISseEvent {
    let data = JSON.parse(eventData);
    if (data.createdAt) {
      const [main, ns] = data.createdAt.split(".");
      const date = new Date(main + "Z");
      data.timestamp = date.getTime() + parseInt((ns || "000").substring(0, 3));
    }
    return data;
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

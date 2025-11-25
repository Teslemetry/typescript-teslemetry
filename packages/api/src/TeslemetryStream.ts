import { TeslemetryVehicleStream } from "./TeslemetryVehicleStream";
import { EventSource } from "eventsource";
import { ISseCredits, ISseEvent } from "./const";
import { Teslemetry } from "./Teslemetry";

type ListenerCallback<T extends ISseEvent = ISseEvent> = (event: T) => void;
type ConnectionListenerCallback = (connected: boolean) => void;

export class TeslemetryStream {
  private root: Teslemetry;
  private _access_token: string;
  public active: boolean = false;
  private vin: string | undefined;
  private _listeners: Map<
    () => void,
    { callback: ListenerCallback; filters?: any }
  > = new Map();
  private _connectionListeners: Map<() => void, ConnectionListenerCallback> =
    new Map();
  private retries: number = 0;
  private eventSource: EventSource | null = null;
  private vehicles: Map<string, TeslemetryVehicleStream> = new Map();

  constructor(root: Teslemetry, access_token: string, vin?: string) {
    this.root = root;
    this._access_token = access_token;
    this.vin = vin;
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

  public get connected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    );
  }

  public addConnectionListener(
    callback: ConnectionListenerCallback,
  ): () => void {
    const removeListener = () => {
      this._connectionListeners.delete(removeListener);
    };
    this._connectionListeners.set(removeListener, callback);
    return removeListener;
  }

  private _updateConnectionListeners(value: boolean): void {
    for (const listener of this._connectionListeners.values()) {
      listener(value);
    }
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
    url.searchParams.append("token", this._access_token);

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onopen = () => {
      console.log(`Connected to ${url.toString()}`);
      this.retries = 0;
      this._updateConnectionListeners(true);
    };

    this.eventSource.onmessage = (event: any) => {
      let data = JSON.parse(event.data);
      if (data.createdAt) {
        const [main, ns] = data.createdAt.split(".");
        const date = new Date(main + "Z");
        data.timestamp =
          date.getTime() + parseInt((ns || "000").substring(0, 3));
      }
      this._dispatchEvent(data);
    };

    this.eventSource.onerror = (error: any) => {
      console.error("EventSource error:", error);
      this.close();
      this._updateConnectionListeners(false);

      this.retries++;
      const delay = Math.min(2 ** this.retries, 600) * 1000;
      console.log(`Reconnecting in ${delay / 1000} seconds...`);
      setTimeout(() => this.connect(), delay);
    };
  }

  public disconnect(): void {
    this.active = false;
    this.close();
  }

  public close(): void {
    if (this.eventSource) {
      console.log(`Disconnecting from stream`);
      this.eventSource.close();
      this.eventSource = null;
    }
    this._updateConnectionListeners(false);
  }

  public addListener<T extends ISseEvent>(
    callback: ListenerCallback<T>,
    filters?: Record<string, any>,
  ): () => void {
    const removeListener = () => {
      this._listeners.delete(removeListener);
    };
    this._listeners.set(removeListener, {
      callback: callback as ListenerCallback<ISseEvent>,
      filters,
    });

    return removeListener;
  }

  private _dispatchEvent(event: any): void {
    for (const { callback, filters } of this._listeners.values()) {
      if (recursiveMatch(filters, event)) {
        try {
          callback(event);
        } catch (error) {
          console.error("Uncaught error in listener:", error);
        }
      }
    }
  }

  public listenCredits(
    callback: (credits: ISseCredits["credits"]) => void,
  ): () => void {
    return this.addListener((event: ISseCredits) => callback(event.credits), {
      credits: null,
    });
  }

  public listenBalance(
    callback: (balance: ISseCredits["credits"]["balance"]) => void,
  ): () => void {
    return this.addListener(
      (event: ISseCredits) => callback(event.credits.balance),
      {
        credits: { balance: null },
      },
    );
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

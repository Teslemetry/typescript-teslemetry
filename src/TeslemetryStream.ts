import { TeslemetryStreamVehicle } from "./TeslemetryStreamVehicle";
import { EventSource, EventSourceInit } from "eventsource";
import { ValueError } from "./exceptions"; // Import custom exceptions

type ListenerCallback = (event: any) => void;
type ConnectionListenerCallback = (connected: boolean) => void;

interface StreamConfig {
  hostname?: string;
}

interface TeslemetryStreamOptions {
  access_token: string;
  server?: string;
  vin?: string;
  parse_timestamp?: boolean;
  manual?: boolean;
}

export class TeslemetryStream {
  public active: boolean = false;
  private server: string;
  private vin: string | undefined;
  private _listeners: Map<
    () => void,
    { callback: ListenerCallback; filters?: any }
  > = new Map();
  private _connectionListeners: Map<() => void, ConnectionListenerCallback> =
    new Map();
  private _apiHeaders: { [key: string]: string };
  private _accessToken: string;
  private parseTimestamp: boolean;
  private manual: boolean;
  private retries: number = 0;
  private eventSource: EventSource | null = null;
  private vehicles: Map<string, TeslemetryStreamVehicle> = new Map();

  constructor(options: TeslemetryStreamOptions) {
    const {
      access_token,
      server = "api.teslemetry.com",
      vin,
      parse_timestamp = false,
      manual = false,
    } = options;

    if (server && !server.endsWith(".teslemetry.com")) {
      throw new ValueError("Server must be on the teslemetry.com domain");
    }

    this.server = server;
    this.vin = vin;
    this._accessToken = access_token;
    this._apiHeaders = {
      Authorization: `Bearer ${access_token}`,
      "X-Library": "typescript teslemetry-stream",
    };
    this.parseTimestamp = parse_timestamp;
    this.manual = manual;

    if (this.vin) {
      this.getVehicle(this.vin);
    }
  }

  public getVehicle(vin: string): TeslemetryStreamVehicle {
    if (!this.vehicles.has(vin)) {
      this.vehicles.set(vin, new TeslemetryStreamVehicle(this, vin));
    }
    return this.vehicles.get(vin)!;
  }

  public get connected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    );
  }

  public async getConfig(vin?: string): Promise<void> {
    vin ??= this.vin;
    if (!vin) throw new Error("VIN is required");

    if (!this.server) {
      await this.findServer();
    }
    if (this.vehicles.has(vin)) {
      await this.getVehicle(vin).getConfig();
    }
  }

  public async findServer(): Promise<void> {
    const response = await fetch("https://api.teslemetry.com/api/metadata", {
      headers: this._apiHeaders,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    const data = await response.json();
    this.server = `${data.region.toLowerCase()}.teslemetry.com`;
  }

  public async updateFields(fields: any, vin: string): Promise<any> {
    const response = await fetch(
      `https://api.teslemetry.com/api/config/${vin}`,
      {
        method: "PATCH",
        headers: { ...this._apiHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      },
    );
    return await response.json();
  }

  public async replaceFields(fields: any, vin: string): Promise<any> {
    const response = await fetch(
      `https://api.teslemetry.com/api/config/${vin}`,
      {
        method: "POST",
        headers: { ...this._apiHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      },
    );
    return await response.json();
  }

  public get config(): StreamConfig {
    return {
      hostname: this.server,
    };
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
    if (!this.server) {
      await this.findServer();
    }

    const url = new URL(`https://${this.server}/sse`);
    if (this.vin) {
      url.pathname += `/${this.vin}`;
    }
    url.searchParams.append("token", this._accessToken);

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onopen = () => {
      console.log(`Connected to ${url.toString()}`);
      this.retries = 0;
      this._updateConnectionListeners(true);
    };

    this.eventSource.onmessage = (event: any) => {
      let data = JSON.parse(event.data);
      if (this.parseTimestamp && data.createdAt) {
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
      console.log(`Disconnecting from ${this.server}`);
      this.eventSource.close();
      this.eventSource = null;
    }
    this._updateConnectionListeners(false);
  }

  public addListener(callback: ListenerCallback, filters?: any): () => void {
    const removeListener = () => {
      this._listeners.delete(removeListener);
      if (this._listeners.size === 0) {
        console.log("Shutting down stream as there are no more listeners");
        this.active = false;
        this.close();
      }
    };
    this._listeners.set(removeListener, { callback, filters });

    if (this._listeners.size === 1 && !this.manual) {
      this.connect();
    }

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

  public async listen(): Promise<void> {
    if (!this.manual && !this.connected) {
      await this.connect();
    }
  }

  public listenCredits(
    callback: (credits: { [key: string]: string | number }) => void,
  ): () => void {
    return this.addListener((event: any) => callback(event.credits), {
      credits: null,
    });
  }

  public listenBalance(callback: (balance: number) => void): () => void {
    return this.addListener((event: any) => callback(event.credits.balance), {
      credits: { balance: null },
    });
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

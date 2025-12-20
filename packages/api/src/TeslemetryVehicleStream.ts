import { EventEmitter } from "events";
import { Teslemetry } from "./Teslemetry.js";
import {
  getApiConfigByVin,
  patchApiConfigByVin,
  postApiConfigByVin,
} from "./client/index.js";
import type {
  FieldsRequest,
  FieldsResponse,
  SseConfig,
  SseData,
  SseState,
  SseErrors,
  SseAlerts,
  SseConnectivity,
  SseVehicleData,
  Signals,
} from "./const.js";
import { Logger } from "./logger.js";

type TeslemetryStreamEventMap = {
  state: SseState;
  data: SseData;
  errors: SseErrors;
  alerts: SseAlerts;
  connectivity: SseConnectivity;
  vehicle_data: SseVehicleData;
  config: SseConfig;
};

// Base event emitter types
export declare interface TeslemetryVehicleStream {
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
    data: TeslemetryStreamEventMap[K],
  ): boolean;
}

// Data signal event emmiter types
export declare interface TeslemetryVehicleStreamData extends EventEmitter {
  on<T extends Signals>(
    event: T,
    listener: (event: Exclude<SseData["data"][T], undefined>) => void,
  ): this;
  once<T extends Signals>(
    event: T,
    listener: (event: Exclude<SseData["data"][T], undefined>) => void,
  ): this;
  off<T extends Signals>(
    event: T,
    listener: (event: Exclude<SseData["data"][T], undefined>) => void,
  ): this;
  emit<T extends Signals>(
    event: T,
    data: Exclude<SseData["data"][T], undefined>,
  ): boolean;
}

export class TeslemetryVehicleStream extends EventEmitter {
  private root: Teslemetry;
  public vin: string;
  public fields: FieldsRequest = {}; // Allow updates from both requests, and responses
  private _pendingFields: FieldsRequest = {}; // Used for accumulating config changes before patching
  private _debounceTimeout: NodeJS.Timeout | null = null; // Debounce timeout for patchConfig
  public logger: Logger;
  public data: TeslemetryVehicleStreamData;

  constructor(root: Teslemetry, vin: string) {
    if (root.sse.vehicles.has(vin)) {
      throw new Error("Vehicle already exists");
    }
    super();
    this.root = root;
    this.vin = vin;
    this.logger = root.sse.logger;
    this.data = new EventEmitter();

    root.sse.vehicles.set(vin, this);

    // Keep field config up to date
    this.on("config", (event) => {
      this.fields = event.config.fields;
    });
  }

  public on<K extends keyof TeslemetryStreamEventMap>(
    event: K,
    listener: (data: TeslemetryStreamEventMap[K]) => void,
  ): this {
    this.root.sse.sendCache(this.vin, event, listener);
    return super.on(event, listener);
  }

  /** Get the current configuration for the vehicle */
  public async getConfig(): Promise<void> {
    const { data, response } = await getApiConfigByVin({
      path: { vin: this.vin },
    });

    if (response.status === 200 && data) {
      this.fields = (data.fields as FieldsResponse) || {};
    } else if (response.status === 404) {
      this.logger.warn(`Config for VIN ${this.vin} not found (404).`);
      return;
    } else {
      throw new Error(`Failed to get config: ${response.statusText}`);
    }
  }

  /** Safely add field configuration to the vehicle */
  public async updateFields(fields: FieldsRequest) {
    this._pendingFields = { ...this._pendingFields, ...fields };

    // Clear existing timeout if it exists
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }

    // Set new timeout to debounce patchConfig calls
    this._debounceTimeout = setTimeout(async () => {
      const data = await this.patchConfig(this._pendingFields);
      if (data?.updated_vehicles) {
        this.logger.info(
          `Updated ${Object.keys(this._pendingFields).length} streaming fields for ${this.vin}`,
        );
        // null means default, not delete, so its okay
        this.fields = { ...this.fields, ...this._pendingFields };
        this._pendingFields = {};
      } else {
        this.logger.error(
          `Error updating streaming config for ${this.vin}`,
          data,
        );
      }
      this._debounceTimeout = null;
    }, 100);
  }

  /** Modify the field configuration of the vehicle */
  public async patchConfig(fields: FieldsRequest) {
    const { data } = await patchApiConfigByVin({
      client: this.root.client,
      path: { vin: this.vin },
      body: { fields },
    });
    return data;
  }

  /** Replace the field configuration of the vehicle */
  public async postConfig(fields: FieldsRequest): Promise<any> {
    const { data } = await postApiConfigByVin({
      client: this.root.client,
      path: { vin: this.vin },
      body: { fields },
    });
    return data;
  }

  /**
   * Add a field to the vehicles streaming configuration
   * @param field Vehicle Signal
   * @param interval
   * @returns
   */
  public async addField(field: Signals, interval?: number): Promise<void> {
    if (
      this.fields &&
      this.fields[field] &&
      (interval === undefined ||
        this.fields[field]!.interval_seconds === interval)
    ) {
      this.logger.debug(
        `Streaming field ${field} already enabled @ ${this.fields[field]?.interval_seconds || "default"}s`,
      );
      return;
    }

    const value =
      interval !== undefined ? { interval_seconds: interval } : null;
    this.updateFields({ [field]: value } as FieldsRequest);
  }

  /**
   * Helper to enable and listen for specific field signals
   * @param field Vehicle field to listen for
   * @param callback Callback function to handle signals
   * @returns Off function to stop the listener
   */
  public onSignal<T extends Signals>(
    field: T,
    callback: (value: Exclude<SseData["data"][T], undefined>) => void,
  ): () => void {
    this.addField(field).catch((error) => {
      this.logger.error(`Failed to add field ${field}:`, error);
    });
    const data = this.root.sse.cache?.[this.vin]?.data?.[field];
    if (data !== undefined) {
      callback(data as Exclude<SseData["data"][T], undefined>);
    }
    this.data.on(field, callback);
    return () => this.data.off(field, callback);
  }

  public stop(): void {
    this.removeAllListeners();
    this.data.removeAllListeners();
  }
}

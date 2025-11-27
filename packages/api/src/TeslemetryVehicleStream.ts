// src/TeslemetryVehicleStream.ts

import { Teslemetry } from "./Teslemetry.js";
import { TeslemetryStream } from "./TeslemetryStream.js";
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
  SseEvent,
  SseState,
  SseErrors,
  SseAlerts,
  SseConnectivity,
  SseCredits,
  SseVehicleData,
  Signals,
} from "./const.js";
import { Logger } from "./logger.js";

export class TeslemetryVehicleStream {
  private root: Teslemetry;
  private stream: TeslemetryStream;
  public vin: string;
  public fields: FieldsRequest = {}; // Allow updates from both requests, and responses
  private _pendingFields: FieldsRequest = {}; // Used for accumulating config changes before patching
  private _debounceTimeout: NodeJS.Timeout | null = null; // Debounce timeout for patchConfig
  public logger: Logger;

  constructor(root: Teslemetry, stream: TeslemetryStream, vin: string) {
    this.root = root;
    this.stream = stream;
    this.vin = vin;
    this.logger = stream.logger;

    stream.onConfig(
      (event) => {
        this.fields = event.config.fields;
      },
      {
        vin: this.vin,
      },
    );
  }

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

  public updateFields(fields: FieldsRequest) {
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

  public async patchConfig(fields: FieldsRequest) {
    const { data } = await patchApiConfigByVin({
      client: this.root.client,
      path: { vin: this.vin },
      body: { fields },
    });
    return data;
  }

  public async postConfig(fields: FieldsRequest): Promise<any> {
    const { data } = await postApiConfigByVin({
      client: this.root.client,
      path: { vin: this.vin },
      body: { fields },
    });
    return data;
  }

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

  // Event listeners (all pre-filtered by VIN)
  public onState(callback: (event: SseState) => void): () => void {
    return this.stream.onState(callback, {
      vin: this.vin,
    });
  }

  public onData(callback: (event: SseData) => void): () => void {
    return this.stream.onData(callback, {
      vin: this.vin,
    });
  }

  public onErrors(callback: (event: SseErrors) => void): () => void {
    return this.stream.onErrors(callback, {
      vin: this.vin,
    });
  }

  public onAlerts(callback: (event: SseAlerts) => void): () => void {
    return this.stream.onAlerts(callback, {
      vin: this.vin,
    });
  }

  public onConnectivity(
    callback: (event: SseConnectivity) => void,
  ): () => void {
    return this.stream.onConnectivity(callback, {
      vin: this.vin,
    });
  }

  public onCredits(callback: (event: SseCredits) => void): () => void {
    return this.stream.onCredits(callback, {
      vin: this.vin,
    });
  }

  public onVehicleData(callback: (event: SseVehicleData) => void): () => void {
    return this.stream.onVehicleData(callback, {
      vin: this.vin,
    });
  }

  public onConfig(callback: (event: SseConfig) => void): () => void {
    return this.stream.onConfig(callback, {
      vin: this.vin,
    });
  }

  // Legacy and generic methods
  public on(callback: (value: SseEvent) => void): () => void {
    return this.stream.on(
      (event) => {
        callback(event);
      },
      { vin: this.vin },
    );
  }

  public onSignal<T extends Signals>(
    field: T,
    callback: (value: Exclude<SseData["data"][T], undefined>) => void,
  ): () => void {
    this.addField(field).catch((error) => {
      this.logger.error(`Failed to add field ${field}:`, error);
    });
    return this.stream.onData(
      (event) => {
        const value = event.data[field];
        if (value !== undefined) {
          callback(value as Exclude<SseData["data"][T], undefined>);
        }
      },
      { vin: this.vin, data: { [field]: null } },
    );
  }
}

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
  ISseConfig,
  ISseData,
  ISseEvent,
  ISseState,
  ISseErrors,
  ISseAlerts,
  ISseConnectivity,
  ISseCredits,
  ISseVehicleData,
  Signals,
} from "./const.js";
import { Logger } from "./logger.js";

export class TeslemetryVehicleStream {
  private root: Teslemetry;
  private stream: TeslemetryStream;
  public vin: string;
  public fields: FieldsResponse = {};
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
      // this.preferTyped = data.prefer_typed || false; // Removed
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
      body: { fields: fields as any }, // Cast to any to avoid potential type mismatch with generated types if strict
    });
    return data;
  }

  public async postConfig(fields: FieldsRequest): Promise<any> {
    const { data } = await postApiConfigByVin({
      client: this.root.client,
      path: { vin: this.vin },
      body: { fields: fields as any },
    });
    return data;
  }

  public async addField(field: Signals, interval?: number): Promise<void> {
    if (
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
    this.updateFields({ [field]: value });
  }

  // Event listeners (all pre-filtered by VIN)
  public onState(callback: (event: ISseState) => void): () => void {
    return this.stream.onState(callback, {
      vin: this.vin,
    });
  }

  public onData(callback: (event: ISseData) => void): () => void {
    return this.stream.onData(callback, {
      vin: this.vin,
    });
  }

  public onErrors(callback: (event: ISseErrors) => void): () => void {
    return this.stream.onErrors(callback, {
      vin: this.vin,
    });
  }

  public onAlerts(callback: (event: ISseAlerts) => void): () => void {
    return this.stream.onAlerts(callback, {
      vin: this.vin,
    });
  }

  public onConnectivity(
    callback: (event: ISseConnectivity) => void,
  ): () => void {
    return this.stream.onConnectivity(callback, {
      vin: this.vin,
    });
  }

  public onCredits(callback: (event: ISseCredits) => void): () => void {
    return this.stream.onCredits(callback, {
      vin: this.vin,
    });
  }

  public onVehicleData(callback: (event: ISseVehicleData) => void): () => void {
    return this.stream.onVehicleData(callback, {
      vin: this.vin,
    });
  }

  public onConfig(callback: (event: ISseConfig) => void): () => void {
    return this.stream.onConfig(callback, {
      vin: this.vin,
    });
  }

  // Legacy and generic methods
  public on(callback: (value: ISseEvent) => void): () => void {
    return this.stream.on<ISseEvent>(
      (event) => {
        callback(event);
      },
      { vin: this.vin },
    );
  }

  public onSignal<T extends Signals>(
    field: T,
    callback: (value: Exclude<ISseData["data"][T], undefined>) => void,
  ): () => void {
    this.addField(field).catch((error) => {
      this.logger.error(`Failed to add field ${field}:`, error);
    });
    return this.stream.onData(
      (event) => {
        const value = event.data[field];
        if (value !== undefined) {
          callback(value as Exclude<ISseData["data"][T], undefined>);
        }
      },
      { vin: this.vin, data: { [field]: null } },
    );
  }
}

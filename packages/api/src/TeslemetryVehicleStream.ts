// src/TeslemetryVehicleStream.ts

import { Teslemetry } from "./Teslemetry";
import { TeslemetryStream } from "./TeslemetryStream";
import {
  getApiConfigByVin,
  patchApiConfigByVin,
  postApiConfigByVin,
} from "./client";
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
} from "./const";
import { Logger } from "./logger";

export class TeslemetryVehicleStream {
  private root: Teslemetry;
  private stream: TeslemetryStream;
  public vin: string;
  public fields: FieldsResponse = {};
  public preferTyped: boolean | null = null;
  private _pendingFields: FieldsRequest = {}; // Used for accumulating config changes before patching
  private _debounceTimeout: NodeJS.Timeout | null = null; // Debounce timeout for patchConfig
  public logger: Logger;

  constructor(root: Teslemetry, stream: TeslemetryStream, vin: string) {
    this.root = root;
    this.stream = stream;
    this.vin = vin;
    this.logger = stream.logger;

    stream.addConfigListener(
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
      this.fields = data.fields || {};
      this.preferTyped = data.prefer_typed || false;
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
      this.fields[field] &&
      (interval === undefined ||
        this.fields[field].interval_seconds === interval)
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
  public addStateListener(
    callback: (event: ISseState) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addStateListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  public addDataListener(
    callback: (event: ISseData) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addDataListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  public addErrorsListener(
    callback: (event: ISseErrors) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addErrorsListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  public addAlertsListener(
    callback: (event: ISseAlerts) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addAlertsListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  public addConnectivityListener(
    callback: (event: ISseConnectivity) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addConnectivityListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  public addCreditsListener(
    callback: (event: ISseCredits) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addCreditsListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  public addVehicleDataListener(
    callback: (event: ISseVehicleData) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addVehicleDataListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  public addConfigListener(
    callback: (event: ISseConfig) => void,
    filters?: Record<string, any>,
  ): () => void {
    return this.stream.addConfigListener(callback, {
      vin: this.vin,
      ...filters,
    });
  }

  // Legacy and generic methods
  public listen(callback: (value: ISseEvent) => void): () => void {
    return this.stream.listen<ISseEvent>(
      (event) => {
        callback(event);
      },
      { vin: this.vin },
    );
  }

  public addSignalListener<T extends Signals>(
    field: T,
    callback: (value: Exclude<ISseData["data"][T], undefined>) => void,
  ): () => void {
    this.addField(field).catch((error) => {
      this.logger.error(`Failed to add field ${field}:`, error);
    });
    const filter = { data: { [field]: null } };
    return this.addDataListener((event) => {
      const value = event.data[field];
      if (value !== undefined) {
        callback(value as Exclude<ISseData["data"][T], undefined>);
      }
    }, filter);
  }
}

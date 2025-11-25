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
  public logger: Logger;

  constructor(root: Teslemetry, stream: TeslemetryStream, vin: string) {
    this.root = root;
    this.stream = stream;
    this.vin = vin;
    this.logger = stream.logger;

    stream.addListener<ISseConfig>(
      (event) => {
        this.fields = event.config.fields;
      },
      {
        config: null,
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

  public async updateFields(fields: FieldsRequest) {
    this._pendingFields = { ...this._pendingFields, ...fields };

    const data = await this.patchConfig(this._pendingFields);
    if (data?.updated_vehicles) {
      this.logger.info(`Updated vehicle streaming config for ${this.vin}`);
      this.fields = { ...this.fields, ...fields };
      this._pendingFields = {};
    } else {
      this.logger.error(
        `Error updating streaming config for ${this.vin}`,
        data,
      );
    }
  }

  public async patchConfig(fields: FieldsRequest) {
    const { data } = await patchApiConfigByVin({
      path: { vin: this.vin },
      body: { fields },
    });
    return data;
  }

  public async postConfig(fields: FieldsRequest): Promise<any> {
    const { data } = await postApiConfigByVin({
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
    await this.updateFields({ [field]: value });
  }

  public listenState(
    callback: (state: ISseState["state"]) => void,
  ): () => void {
    return this.stream.addListener<ISseState>(
      (event) => callback(event["state"]),
      {
        vin: this.vin,
        state: null,
      },
    );
  }

  public listenData<T extends Signals>(
    field: T,
    callback: (value: Exclude<ISseData["data"][T], undefined>) => void,
  ): () => void {
    this.addField(field);
    return this.stream.addListener<ISseData>(
      (event) => {
        const value = event.data[field];
        if (value !== undefined) {
          callback(value as Exclude<ISseData["data"][T], undefined>);
        }
      },
      { key: this.vin, data: { [field]: null } },
    );
  }
}

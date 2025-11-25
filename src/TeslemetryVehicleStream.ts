// src/TeslemetryStreamVehicle.ts

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

export class TeslemetryStreamVehicle {
  private root: Teslemetry;
  private stream: TeslemetryStream;
  public vin: string;
  public fields: FieldsResponse = {};
  public preferTyped: boolean | null = null;
  private _pendingFields: FieldsRequest = {}; // Used for accumulating config changes before patching

  constructor(root: Teslemetry, stream: TeslemetryStream, vin: string) {
    this.root = root;
    this.stream = stream;
    this.vin = vin;

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
      console.warn(`Config for VIN ${this.vin} not found (404).`);
      return;
    } else {
      throw new Error(`Failed to get config: ${response.statusText}`);
    }
  }

  public async updateFields(fields: FieldsRequest): Promise<void> {
    this._pendingFields = { ...this._pendingFields, ...fields };

    const data = await this.patchConfig(this._pendingFields);
    if (data.error) {
      console.error(
        `Error updating streaming config for ${this.vin}: ${data.error}`,
      );
    } else if (data.response?.updated_vehicles) {
      console.info(`Updated vehicle streaming config for ${this.vin}`);
      this.fields = { ...this.fields, ...fields };
      this._pendingFields = {};
    }
  }

  public async patchConfig(fields: FieldsRequest): Promise<any> {
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
      console.debug(
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
      (event) => callback(event.data[field]),
      { key: this.vin, data: { [field]: null } },
    );
  }
}

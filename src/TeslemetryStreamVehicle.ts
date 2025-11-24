// src/TeslemetryStreamVehicle.ts

import { TeslemetryStream } from "./TeslemetryStream";
import type { ISseData, ISseEvent, ISseState } from "./const";

type FieldConfig = { [key: string]: number | null };

export class TeslemetryStreamVehicle {
  private stream: TeslemetryStream;
  public vin: string;
  public fields: { [key: string]: FieldConfig } = {};
  public preferTyped: boolean | null = null;
  private _config: any = {}; // Used for accumulating config changes before patching

  constructor(stream: TeslemetryStream, vin: string) {
    this.stream = stream;
    this.vin = vin;
  }

  public get config(): {
    fields: { [key: string]: FieldConfig };
    prefer_typed: boolean | null;
  } {
    return {
      fields: this.fields,
      prefer_typed: this.preferTyped,
    };
  }

  public async getConfig(): Promise<void> {
    const response = await fetch(
      `https://${this.stream.region}.teslemetry.com/api/config/${this.vin}`,
      {
        headers: this.stream["_headers"],
      },
    );

    if (response.status === 200) {
      const data = await response.json();
      this.fields = data.fields || {};
      this.preferTyped = data.prefer_typed || false;
    } else if (response.status === 404) {
      console.warn(`Config for VIN ${this.vin} not found (404).`);
      return;
    } else {
      throw new Error(`Failed to get config: ${response.statusText}`);
    }
  }

  public async updateConfig(config: any): Promise<void> {
    this._config = { ...this._config, ...config };

    const data = await this.patchConfig(this._config);
    if (data.error) {
      console.error(
        `Error updating streaming config for ${this.vin}: ${data.error}`,
      );
    } else if (data.response?.updated_vehicles) {
      console.info(`Updated vehicle streaming config for ${this.vin}`);
      if (config.fields) {
        this.fields = { ...this.fields, ...config.fields };
      }
      if (typeof config.prefer_typed === "boolean") {
        this.preferTyped = config.prefer_typed;
      }
      this._config = {};
    }
  }

  public async patchConfig(config: any): Promise<any> {
    const response = await fetch(
      `https://${this.stream.region}.teslemetry.com/api/config/${this.vin}`,
      {
        method: "PATCH",
        headers: this.stream["_headers"],
        body: JSON.stringify(config),
      },
    );
    return await response.json();
  }

  public async postConfig(config: any): Promise<any> {
    const response = await fetch(
      `https://${this.stream.region}.teslemetry.com/api/config/${this.vin}`,
      {
        method: "POST",
        headers: this.stream["_headers"],
        body: JSON.stringify(config),
      },
    );
    return await response.json();
  }

  public async addField(
    field: keyof ISseData["data"],
    interval?: number,
  ): Promise<void> {
    if (
      this.fields[field] &&
      (interval === undefined ||
        (this.fields[field] as FieldConfig).interval_seconds === interval)
    ) {
      console.debug(
        `Streaming field ${field} already enabled @ ${this.fields[field]?.interval_seconds || "default"}s`,
      );
      return;
    }

    const value =
      interval !== undefined ? { interval_seconds: interval } : null;
    await this.updateConfig({ fields: { [field]: value } });
  }

  private _enableField(field: keyof ISseData["data"]): void {
    this.addField(field);
  }

  // Listen methods (a selection to demonstrate different types)

  public listenState(
    callback: (state: ISseState["state"]) => void,
  ): () => void {
    return this.stream.addListener(
      (event: ISseState) => callback(event["state"]),
      {
        vin: this.vin,
        state: null,
      },
    );
  }

  public listenData<T extends keyof ISseData["data"]>(
    field: T,
    callback: (value: Exclude<ISseData["data"][T], undefined>) => void,
  ): () => void {
    this._enableField(field);
    return this.stream.addListener(
      (event: ISseData) => callback(event.data[field]),
      { key: this.vin, data: { [field]: null } },
    );
  }
}

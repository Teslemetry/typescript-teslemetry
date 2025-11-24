// src/TeslemetryStreamVehicle.ts

import { TeslemetryStream } from "./TeslemetryStream";
import {
  Signal,
  Key,
  State,
  NetworkInterface,
  BMSState,
  CableType,
  CarType,
  ChargePort,
  ChargePortLatch,
  ChargeState,
  ClimateKeeperModeState,
  ClimateOverheatProtectionTempLimit,
  DefrostModeState,
  DetailedChargeState,
  DisplayState,
  DriveInverterState,
  FastCharger,
  FollowDistance,
  ForwardCollisionSensitivity,
  GuestModeMobileAccess,
  HvacAutoModeState,
  HvacPowerState,
  HvilStatus,
  LaneAssistLevel,
  MediaStatus,
  PowershareState,
  PowershareStopReasonStatus,
  PowershareTypeStatus,
  ScheduledChargingMode,
  SentryModeState,
  ShiftState,
  SpeedAssistLevel,
  Status,
  SunroofInstalledState,
  TonneauPositionState,
  TonneauTentModeState,
  TurnSignalState,
  WindowState,
  TeslaLocation,
} from "./const";

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
      `https://api.teslemetry.com/api/config/${this.vin}`,
      {
        headers: this.stream["_apiHeaders"],
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
      `https://api.teslemetry.com/api/config/${this.vin}`,
      {
        method: "PATCH",
        headers: {
          ...this.stream["_apiHeaders"],
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      },
    );
    return await response.json();
  }

  public async postConfig(config: any): Promise<any> {
    const response = await fetch(
      `https://api.teslemetry.com/api/config/${this.vin}`,
      {
        method: "POST",
        headers: {
          ...this.stream["_apiHeaders"],
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      },
    );
    return await response.json();
  }

  public async addField(
    field: Signal | string,
    interval?: number,
  ): Promise<void> {
    const fieldName = field as string;

    if (
      this.fields[fieldName] &&
      (interval === undefined ||
        (this.fields[fieldName] as FieldConfig).interval_seconds === interval)
    ) {
      console.debug(
        `Streaming field ${fieldName} already enabled @ ${this.fields[fieldName]?.interval_seconds || "default"}s`,
      );
      return;
    }

    const value =
      interval !== undefined ? { interval_seconds: interval } : null;
    await this.updateConfig({ fields: { [fieldName]: value } });
  }

  private _enableField(field: Signal): void {
    this.addField(field);
  }

  // Listen methods (a selection to demonstrate different types)

  public listenState(callback: (state: boolean | null) => void): () => void {
    return this.stream.addListener(
      (event: any) => callback(event[Key.STATE] === State.ONLINE),
      { [Key.VIN]: this.vin, [Key.STATE]: null },
    );
  }

  public listenBatteryLevel(
    callback: (batteryLevel: number | null) => void,
  ): () => void {
    this._enableField(Signal.BATTERY_LEVEL);
    return this.stream.addListener(
      (event: any) =>
        callback(event.data?.[Signal.BATTERY_LEVEL] as number | null),
      { [Key.VIN]: this.vin, data: { [Signal.BATTERY_LEVEL]: null } },
    );
  }

  public listenVehicleSpeed(
    callback: (speed: number | null) => void,
  ): () => void {
    this._enableField(Signal.VEHICLE_SPEED);
    return this.stream.addListener(
      (event: any) =>
        callback(event.data?.[Signal.VEHICLE_SPEED] as number | null),
      { [Key.VIN]: this.vin, data: { [Signal.VEHICLE_SPEED]: null } },
    );
  }

  public listenOdometer(
    callback: (odometer: number | null) => void,
  ): () => void {
    this._enableField(Signal.ODOMETER);
    return this.stream.addListener(
      (event: any) => callback(event.data?.[Signal.ODOMETER] as number | null),
      { [Key.VIN]: this.vin, data: { [Signal.ODOMETER]: null } },
    );
  }

  public listenDoorState(
    callback: (doorState: { [key: string]: boolean } | null) => void,
  ): () => void {
    this._enableField(Signal.DOOR_STATE);
    return this.stream.addListener(
      (event: any) =>
        callback(
          event.data?.[Signal.DOOR_STATE] as { [key: string]: boolean } | null,
        ),
      { [Key.VIN]: this.vin, data: { [Signal.DOOR_STATE]: null } },
    );
  }

  public listenLocation(
    callback: (location: TeslaLocation | null) => void,
  ): () => void {
    this._enableField(Signal.LOCATION);
    return this.stream.addListener(
      (event: any) =>
        callback(event.data?.[Signal.LOCATION] as TeslaLocation | null),
      { [Key.VIN]: this.vin, data: { [Signal.LOCATION]: null } },
    );
  }

  public listenSentryMode(
    callback: (sentryMode: SentryModeState | null) => void,
  ): () => void {
    this._enableField(Signal.SENTRY_MODE);
    return this.stream.addListener(
      (event: any) => {
        const val = event.data?.[Signal.SENTRY_MODE];
        callback(Object.values(SentryModeState).includes(val) ? val : null);
      },
      { [Key.VIN]: this.vin, data: { [Signal.SENTRY_MODE]: null } },
    );
  }

  public listenShiftState(
    callback: (shiftState: ShiftState | null) => void,
  ): () => void {
    this._enableField(Signal.GEAR); // Python uses Signal.GEAR for ShiftState
    return this.stream.addListener(
      (event: any) => {
        const val = event.data?.[Signal.GEAR];
        callback(Object.values(ShiftState).includes(val) ? val : null);
      },
      { [Key.VIN]: this.vin, data: { [Signal.GEAR]: null } },
    );
  }
}

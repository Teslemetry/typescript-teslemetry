import { EventEmitter } from "events";
import { Teslemetry } from "./Teslemetry.js";
import { processDateRange, DateInput } from "./dateHelper.js";
import {
  postApi1EnergySitesByIdBackup,
  getApi1EnergySitesByIdCalendarHistory,
  postApi1EnergySitesByIdGridImportExport,
  getApi1EnergySitesByIdLiveStatus,
  getApi1EnergySitesByIdSiteInfo,
  postApi1EnergySitesByIdOffGridVehicleChargingReserve,
  postApi1EnergySitesByIdOperation,
  postApi1EnergySitesByIdStormMode,
  getApi1EnergySitesByIdTelemetryHistory,
  GetApi1EnergySitesByIdSiteInfoResponse,
  GetApi1EnergySitesByIdLiveStatusResponse,
  GetApi1EnergySitesByIdCalendarHistoryResponse,
  GetApi1EnergySitesByIdTelemetryHistoryResponse,
} from "./client/index.js";
import { reuse } from "./reuse.js";
import { scheduler } from "./scheduler.js";

// Derive event types from the calendar history response union type
type CalendarHistoryEvents = NonNullable<
  NonNullable<
    GetApi1EnergySitesByIdCalendarHistoryResponse["response"]
  >["events"]
>[number];

// Extract specific event types based on discriminating properties
export type BackupHistoryEvent = Extract<
  CalendarHistoryEvents,
  { duration?: number }
>;
export type EnergyHistoryEvent = Exclude<
  CalendarHistoryEvents,
  { duration?: number }
>;

export type BackupHistoryResponse = {
  response?: {
    events?: BackupHistoryEvent[];
    total_events?: number;
  };
};

export type EnergyHistoryResponse = {
  response?: {
    events?: EnergyHistoryEvent[];
    total_events?: number;
  };
};

// Interface for event type safety
type TeslemetryEnergyEventMap = {
  siteInfo: GetApi1EnergySitesByIdSiteInfoResponse;
  liveStatus: GetApi1EnergySitesByIdLiveStatusResponse;
  backupHistory: BackupHistoryResponse;
  energyHistory: EnergyHistoryResponse;
  chargeHistory: GetApi1EnergySitesByIdTelemetryHistoryResponse;
};

// TypeScript interface for event type safety
export declare interface TeslemetryEnergyApi {
  on<K extends keyof TeslemetryEnergyEventMap>(
    event: K,
    listener: (data: TeslemetryEnergyEventMap[K]) => void,
  ): this;
  off<K extends keyof TeslemetryEnergyEventMap>(
    event: K,
    listener: (data: TeslemetryEnergyEventMap[K]) => void,
  ): this;
  once<K extends keyof TeslemetryEnergyEventMap>(
    event: K,
    listener: (data: TeslemetryEnergyEventMap[K]) => void,
  ): this;
  emit<K extends keyof TeslemetryEnergyEventMap>(
    event: K,
    data: TeslemetryEnergyEventMap[K],
  ): boolean;
}

type PollingEndpoints = keyof TeslemetryEnergyEventMap;

export class TeslemetryEnergyApi extends EventEmitter {
  private root: Teslemetry;
  public siteId: number;
  public cache: {
    siteInfo: GetApi1EnergySitesByIdSiteInfoResponse | null;
    liveStatus: GetApi1EnergySitesByIdLiveStatusResponse | null;
  } = {
    siteInfo: null,
    liveStatus: null,
  };
  public refreshDelay: number = 30_000;
  private refreshIntervals: {
    [endpoint in PollingEndpoints]: (() => void) | null;
  } = {
    siteInfo: null,
    liveStatus: null,
    backupHistory: null,
    energyHistory: null,
    chargeHistory: null,
  };
  private refreshClients: {
    [endpoint in PollingEndpoints]: Set<symbol>;
  } = {
    siteInfo: new Set(),
    liveStatus: new Set(),
    backupHistory: new Set(),
    energyHistory: new Set(),
    chargeHistory: new Set(),
  };

  constructor(root: Teslemetry, siteId: number) {
    if (root.api.energySites.has(siteId)) {
      throw new Error("Energy site already exists");
    }
    super();
    this.root = root;
    this.siteId = siteId;

    root.api.energySites.set(siteId, this);
  }

  public on<K extends keyof TeslemetryEnergyEventMap>(
    event: K,
    listener: (data: TeslemetryEnergyEventMap[K]) => void,
  ): this {
    const cached = this.cache[event as keyof typeof this.cache];
    if (cached) {
      listener(cached as TeslemetryEnergyEventMap[K]);
    }

    return super.on(event, listener);
  }

  /**
   * Adjust the site's backup reserve.
   * @param backup_reserve_percent The backup reserve percentage
   * @return Promise to an object with response containing backup reserve adjustment confirmation
   */
  public async setBackupReserve(backup_reserve_percent: number) {
    const { data } = await postApi1EnergySitesByIdBackup({
      body: { backup_reserve_percent },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns the backup (off-grid) event history of the site, aggregated to the requested period.
   * @param kind Type of history to retrieve - "backup"
   * @param period Aggregation period
   * @param start_date Start date for the data range (string, Date, or undefined - defaults to start of today)
   * @param end_date End date for the data range (string, Date, or undefined - defaults to end of today)
   * @param time_zone IANA Time zone for the data range
   * @return Promise to an object with response containing backup event history
   */
  public async getCalendarHistory(
    kind: "backup",
    period: "day" | "week" | "month" | "year",
    start_date?: DateInput,
    end_date?: DateInput,
    time_zone?: string,
  ): Promise<BackupHistoryResponse | undefined>;

  /**
   * Returns the energy measurements of the site, aggregated to the requested period.
   * @param kind Type of history to retrieve - "energy"
   * @param period Aggregation period
   * @param start_date Start date for the data range (string, Date, or undefined - defaults to start of today)
   * @param end_date End date for the data range (string, Date, or undefined - defaults to end of today)
   * @param time_zone IANA Time zone for the data range
   * @return Promise to an object with response containing energy measurements aggregated by period
   */
  public async getCalendarHistory(
    kind: "energy",
    period: "day" | "week" | "month" | "year",
    start_date?: DateInput,
    end_date?: DateInput,
    time_zone?: string,
  ): Promise<EnergyHistoryResponse | undefined>;

  /**
   * Returns the backup (off-grid) event history of the site or the energy measurements of the site, aggregated to the requested period.
   * @param kind Type of history to retrieve
   * @param period Aggregation period
   * @param start_date Start date for the data range (string, Date, or undefined - defaults to start of today)
   * @param end_date End date for the data range (string, Date, or undefined - defaults to end of today)
   * @param time_zone IANA Time zone for the data range
   * @return Promise to an object with response containing backup event history or energy measurements aggregated by period
   */
  public async getCalendarHistory(
    kind: "backup" | "energy",
    period: "day" | "week" | "month" | "year",
    start_date?: DateInput,
    end_date?: DateInput,
    time_zone?: string,
  ): Promise<BackupHistoryResponse | EnergyHistoryResponse | undefined> {
    const { data } = await getApi1EnergySitesByIdCalendarHistory({
      query: {
        kind,
        period,
        ...processDateRange(start_date, end_date),
        time_zone,
      },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data as BackupHistoryResponse | EnergyHistoryResponse | undefined;
  }

  /**
   * Allow/disallow charging from the grid and exporting energy to the grid.
   * @param customer_preferred_export_rule The customer's preferred export rule
   * @param disallow_charge_from_grid_with_solar_installed Whether to disallow charging from the grid with a solar install
   * @return Promise to an object with response containing grid import/export settings update confirmation
   */
  public async gridImportExport(
    customer_preferred_export_rule: "battery_ok" | "pv_only" | "never",
    disallow_charge_from_grid_with_solar_installed?: boolean,
  ) {
    const { data } = await postApi1EnergySitesByIdGridImportExport({
      body: {
        customer_preferred_export_rule,
        disallow_charge_from_grid_with_solar_installed,
      },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  private getLiveStatusReuse = reuse(1000);
  /**
   * Returns the live status of the site (power, state of energy, grid status, storm mode).
   * @return Promise to an object with response containing current live status of the energy site
   */
  public async getLiveStatus() {
    return this.getLiveStatusReuse(async () => {
      const { data } = await getApi1EnergySitesByIdLiveStatus({
        path: { id: this.siteId },
        client: this.root.client,
      });
      this.cache.liveStatus = data;
      this.emit("liveStatus", data);
      return data;
    });
  }

  private getSiteInfoReuse = reuse(1000);
  /**
   * Returns information about the site. Things like assets (has solar, etc), settings (backup reserve, etc), and features (storm_mode_capable, etc).
   * @return Promise to an object with response containing detailed information about the energy site
   */
  public async getSiteInfo() {
    return this.getSiteInfoReuse(async () => {
      const { data } = await getApi1EnergySitesByIdSiteInfo({
        path: { id: this.siteId },
        client: this.root.client,
      });
      this.cache.siteInfo = data;
      this.emit("siteInfo", data);
      return data;
    });
  }

  /**
   * Adjust the site's off-grid vehicle charging backup reserve.
   * @param off_grid_vehicle_charging_reserve_percent The off-grid vehicle charging backup reserve percentage
   * @return Promise to an object with response containing off-grid vehicle charging reserve adjustment confirmation
   */
  public async setOffGridVehicleChargingReserve(
    off_grid_vehicle_charging_reserve_percent: number,
  ) {
    const { data } = await postApi1EnergySitesByIdOffGridVehicleChargingReserve(
      {
        body: { off_grid_vehicle_charging_reserve_percent },
        path: { id: this.siteId },
        client: this.root.client,
      },
    );
    return data;
  }

  /**
   * Use autonomous for time-based control and self_consumption for self-powered mode.
   * @param default_real_mode The site's operating mode
   * @return Promise to an object with response containing operating mode change confirmation
   */
  public async setOperationMode(
    default_real_mode: "self_consumption" | "backup" | "autonomous",
  ) {
    const { data } = await postApi1EnergySitesByIdOperation({
      body: { default_real_mode },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Update storm watch participation.
   * @param enabled Whether to enable storm mode
   * @return Promise to an object with response containing storm mode setting update confirmation
   */
  public async setStormMode(enabled: boolean) {
    const { data } = await postApi1EnergySitesByIdStormMode({
      body: { enabled },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns the charging history of a wall connector.
   * @param start_date Start date for the telemetry data (string, Date, or undefined - defaults to start of today)
   * @param end_date End date for the telemetry data (string, Date, or undefined - defaults to end of today)
   * @param time_zone Optional timezone for the data
   * @return Promise to an object with response containing charging history data from wall connectors
   */
  public async getTelemetryHistory(
    start_date?: DateInput,
    end_date?: DateInput,
    time_zone?: string,
  ) {
    const { data } = await getApi1EnergySitesByIdTelemetryHistory({
      query: {
        kind: "charge",
        ...processDateRange(start_date, end_date),
        time_zone,
      },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  requestPolling(endpoint: PollingEndpoints): () => void {
    if (!this.refreshIntervals[endpoint]) {
      switch (endpoint) {
        case "siteInfo": {
          const intervalHandle = setInterval(() => {
            this.getSiteInfo().catch(this.root.logger.warn);
          }, this.refreshDelay);
          this.refreshIntervals[endpoint] = () => clearInterval(intervalHandle);
          this.getSiteInfo().catch(this.root.logger.warn);
          break;
        }
        case "liveStatus": {
          const intervalHandle = setInterval(() => {
            this.getLiveStatus().catch(this.root.logger.warn);
          }, this.refreshDelay);
          this.refreshIntervals[endpoint] = () => clearInterval(intervalHandle);
          this.getLiveStatus().catch(this.root.logger.warn);
          break;
        }
        case "backupHistory":
          // Schedule 30 seconds after each 5-minute mark aligned to clock time
          this.refreshIntervals[endpoint] = scheduler(
            () => {
              this.getCalendarHistory("backup", "day").catch(
                this.root.logger.warn,
              );
            },
            300_000,
            20_000 + Math.round(10_000 * Math.random()),
          );
          break;
        case "energyHistory":
          // Schedule 30 seconds after each 5-minute mark aligned to clock time
          this.refreshIntervals[endpoint] = scheduler(
            () => {
              this.getCalendarHistory("energy", "day").catch(
                this.root.logger.warn,
              );
            },
            300_000,
            20_000 + Math.round(10_000 * Math.random()),
          );
          break;
        case "chargeHistory":
          // Schedule 30 seconds after each 5-minute mark aligned to clock time
          this.refreshIntervals[endpoint] = scheduler(
            () => {
              this.getTelemetryHistory("day").catch(this.root.logger.warn);
            },
            300_000,
            20_000 + Math.round(10_000 * Math.random()),
          );
          break;
        default:
          throw new Error(`Invalid endpoint: ${endpoint}`);
      }
    }
    const symbol = Symbol("refreshClient");
    this.refreshClients[endpoint].add(symbol);
    return () => {
      this.refreshClients[endpoint].delete(symbol);
      if (this.refreshClients[endpoint].size === 0) {
        if (this.refreshIntervals[endpoint]) {
          this.refreshIntervals[endpoint]();
          this.refreshIntervals[endpoint] = null;
        }
      }
    };
  }
}

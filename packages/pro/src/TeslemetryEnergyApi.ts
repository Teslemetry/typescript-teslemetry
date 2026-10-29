import { EventEmitter } from "events";
import { Teslemetry } from "./Teslemetry.js";
import {
  processDateRange,
  DateInput,
  getStartOfToday,
  getEndOfToday,
} from "./dateHelper.js";
import {
  postApi1EnergySitesByIdBackup,
  getApi1EnergySitesByIdCalendarHistory,
  postApi1EnergySitesByIdGridImportExport,
  getApi1EnergySitesByIdLiveStatus,
  getApi1EnergySitesByIdSiteInfo,
  postApi1EnergySitesByIdOffGridVehicleChargingReserve,
  postApi1EnergySitesByIdOperation,
  postApi1EnergySitesByIdStormMode,
  postApi1EnergySitesByIdTimeOfUseSettings,
  getApi1EnergySitesByIdTelemetryHistory,
  getApi1EnergySitesByIdPrograms,
  postApi1EnergySitesByIdCommand,
  getApi1EnergySitesByIdCommandSystemInfo,
  getApi1EnergySitesByIdCommandNetworkingStatus,
  getApi1EnergySitesByIdCommandAuthorizedClients,
  getApi1EnergySitesByIdCommandSignedCommandsPublicKey,
  getApi1EnergySitesByIdCommandWifiScan,
  getApi1EnergySitesByIdCommandDeviceCert,
  postApi1EnergySitesByIdCommandScheduleBackupEvent,
  postApi1EnergySitesByIdCommandCancelBackupEvent,
  postApi1EnergySitesByIdCommandSetLocalSiteConfig,
  postApi1EnergySitesByIdCommandSetIslandMode,
  postApi1EnergySitesByIdCommandAddAuthorizedClient,
  postApi1EnergySitesByIdCommandRemoveAuthorizedClient,
  GetApi1EnergySitesByIdSiteInfoResponse,
  GetApi1EnergySitesByIdLiveStatusResponse,
  GetApi1EnergySitesByIdCalendarHistoryResponse,
  GetApi1EnergySitesByIdTelemetryHistoryResponse,
  PostApi1EnergySitesByIdTimeOfUseSettingsData,
  PostApi1EnergySitesByIdCommandData,
  PostApi1EnergySitesByIdCommandScheduleBackupEventData,
  PostApi1EnergySitesByIdCommandSetLocalSiteConfigData,
  PostApi1EnergySitesByIdCommandAddAuthorizedClientData,
  PostApi1EnergySitesByIdCommandRemoveAuthorizedClientData,
} from "./client/index.js";
import { reuse } from "./reuse.js";
import { scheduler } from "./scheduler.js";

// Extract specific event types based on discriminating properties
export type BackupHistoryResponse = {
  response: Extract<
    GetApi1EnergySitesByIdCalendarHistoryResponse["response"],
    { events?: any }
  >;
};
export type EnergyHistoryResponse = {
  response: Extract<
    GetApi1EnergySitesByIdCalendarHistoryResponse["response"],
    { time_series?: any }
  >;
};

// The site info response bundles tariff data alongside unrelated settings/asset fields.
export type TariffInfo = Pick<
  GetApi1EnergySitesByIdSiteInfoResponse["response"],
  "tariff_id" | "tariff_content" | "tariff_content_v2"
>;

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
  listenerCount<K extends keyof TeslemetryEnergyEventMap>(event: K): number;
}

type PollingEndpoints = keyof TeslemetryEnergyEventMap;

export class TeslemetryEnergyApi extends EventEmitter {
  private root: Teslemetry;
  public siteId: number;
  public cache: {
    [K in PollingEndpoints]: TeslemetryEnergyEventMap[K] | null;
  } = {
    siteInfo: null,
    liveStatus: null,
    backupHistory: null,
    energyHistory: null,
    chargeHistory: null,
  };
  public refreshDelay: number = 30_000;
  private refreshIntervals: {
    [K in PollingEndpoints]: (() => void) | null;
  } = {
    siteInfo: null,
    liveStatus: null,
    backupHistory: null,
    energyHistory: null,
    chargeHistory: null,
  };
  private refreshClients: {
    [K in PollingEndpoints]: Set<symbol>;
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
    const cached = this.cache[event];
    if (cached) {
      listener(cached);
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
   * Returns the site's time-of-use tariff (buy/sell rate schedule). No dedicated tariff
   * endpoint exists - this reads from getSiteInfo() to give it a first-class typed accessor.
   * @return Promise to the tariff id and rate schedule (v1 and v2 content, where set)
   */
  public async getTariff(): Promise<TariffInfo> {
    const { response } = await this.getSiteInfo();
    return {
      tariff_id: response.tariff_id,
      tariff_content: response.tariff_content,
      tariff_content_v2: response.tariff_content_v2,
    };
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
   * Update the site's time-of-use tariff (buy/sell rate schedule).
   * @param body The time-of-use settings configuration
   * @return Promise to an object with response containing tariff update confirmation
   */
  public async setTimeOfUseSettings(
    body: PostApi1EnergySitesByIdTimeOfUseSettingsData["body"],
  ) {
    const { data } = await postApi1EnergySitesByIdTimeOfUseSettings({
      body,
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns the charging history of a wall connector.
   * @param start_date Start date for the telemetry data (string, Date, or undefined - defaults to start of today)
   * @param end_date End date for the telemetry data (string, Date, or undefined - defaults to end of today)
   * @param time_zone IANA timezone for the data (e.g., 'America/Los_Angeles') - defaults to local timezone
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
        ...processDateRange(
          start_date ?? getStartOfToday(),
          end_date ?? getEndOfToday(),
        ),
        time_zone: time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns the site's configured programs (e.g. utility demand-response or VPP programs).
   * @return Promise to an object with response containing the site's programs
   */
  public async getPrograms() {
    const { data } = await getApi1EnergySitesByIdPrograms({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Send an unsigned energy-device gRPC command using a category, command name, and raw protobuf JSON fields.
   * This is intended for discovery and testing of undocumented energy gateway commands.
   * @param body The category, command name, and raw protobuf JSON fields for the request
   * @return Promise to an object with the decoded energy device response payload
   */
  public async sendCommand(body: PostApi1EnergySitesByIdCommandData["body"]) {
    const { data } = await postApi1EnergySitesByIdCommand({
      body,
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Retrieve system information from the energy gateway including device ID, DIN, firmware version, update status, and device type.
   * @return Promise to an object with response containing the gateway's system information
   */
  public async getCommandSystemInfo() {
    const { data } = await getApi1EnergySitesByIdCommandSystemInfo({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Retrieve networking status from the energy gateway including WiFi configuration, WiFi interface, Ethernet interface, and GSM/cellular interface details.
   * @return Promise to an object with response containing the gateway's networking status
   */
  public async getCommandNetworkingStatus() {
    const { data } = await getApi1EnergySitesByIdCommandNetworkingStatus({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * List all authorized clients on the energy gateway, including their role, type, and verification status.
   * @return Promise to an object with response containing the gateway's authorized clients
   */
  public async getCommandAuthorizedClients() {
    const { data } = await getApi1EnergySitesByIdCommandAuthorizedClients({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Retrieve the public key used by the energy gateway for signed command verification.
   * @return Promise to an object with response containing the gateway's signed commands public key
   */
  public async getCommandSignedCommandsPublicKey() {
    const { data } = await getApi1EnergySitesByIdCommandSignedCommandsPublicKey(
      {
        path: { id: this.siteId },
        client: this.root.client,
      },
    );
    return data;
  }

  /**
   * Trigger a WiFi scan on the energy gateway and return discovered networks with signal strength information.
   * @return Promise to an object with response containing discovered WiFi networks
   */
  public async getCommandWifiScan() {
    const { data } = await getApi1EnergySitesByIdCommandWifiScan({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Retrieve the device certificate from the energy gateway.
   * @return Promise to an object with response containing the gateway's device certificate
   */
  public async getCommandDeviceCert() {
    const { data } = await getApi1EnergySitesByIdCommandDeviceCert({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Schedule a manual backup event on the Tesla Energy Gateway (TEG), triggering the Powerwall to enter backup mode for the specified duration.
   * @param scheduling_info Scheduling parameters for the backup event
   * @return Promise to an object with response containing the scheduled backup event's request ID
   */
  public async scheduleBackupEvent(
    scheduling_info?: NonNullable<
      PostApi1EnergySitesByIdCommandScheduleBackupEventData["body"]
    >["scheduling_info"],
  ) {
    const { data } = await postApi1EnergySitesByIdCommandScheduleBackupEvent({
      body: { scheduling_info },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Cancel a previously scheduled manual backup event on the Tesla Energy Gateway (TEG).
   * @return Promise to an object with response containing the cancelled backup event's request ID
   */
  public async cancelBackupEvent() {
    const { data } = await postApi1EnergySitesByIdCommandCancelBackupEvent({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Update local site configuration on the energy gateway using raw protobuf request fields.
   * @param body Raw protobuf JSON fields for the request message
   * @return Promise to an object with response containing the local site config update's request ID
   */
  public async setLocalSiteConfig(
    body: PostApi1EnergySitesByIdCommandSetLocalSiteConfigData["body"],
  ) {
    const { data } = await postApi1EnergySitesByIdCommandSetLocalSiteConfig({
      body,
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Set the Tesla Energy Gateway island mode.
   * @param mode Island mode to request from the gateway
   * @param force Whether to force the mode change even if the gateway would normally reject it
   * @return Promise to an object with response containing the island mode change's request ID
   */
  public async setIslandMode(mode: 1 | 6, force?: boolean) {
    const { data } = await postApi1EnergySitesByIdCommandSetIslandMode({
      body: { mode, force },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Add an authorized client to the energy gateway.
   * @param body The authorized client's key type, public key, client type, and description
   * @return Promise to an object with response containing the added authorized client
   */
  public async addAuthorizedClient(
    body: PostApi1EnergySitesByIdCommandAddAuthorizedClientData["body"],
  ) {
    const { data } = await postApi1EnergySitesByIdCommandAddAuthorizedClient({
      body,
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Remove an authorized client from the energy gateway.
   * @param body Raw protobuf JSON fields identifying the client to remove
   * @return Promise to an object with response containing the removed authorized client's request ID
   */
  public async removeAuthorizedClient(
    body: PostApi1EnergySitesByIdCommandRemoveAuthorizedClientData["body"],
  ) {
    const { data } = await postApi1EnergySitesByIdCommandRemoveAuthorizedClient(
      {
        body,
        path: { id: this.siteId },
        client: this.root.client,
      },
    );
    return data;
  }

  private async refreshBackupHistory(): Promise<void> {
    const backupHistory = await this.getCalendarHistory("backup", "day");
    if (backupHistory) {
      this.cache.backupHistory = backupHistory;
      this.emit("backupHistory", backupHistory);
    }
  }

  private async refreshEnergyHistory(): Promise<void> {
    const energyHistory = await this.getCalendarHistory("energy", "day");
    if (energyHistory) {
      this.cache.energyHistory = energyHistory;
      this.emit("energyHistory", energyHistory);
    }
  }

  private async refreshChargeHistory(): Promise<void> {
    const chargeHistory = await this.getTelemetryHistory();
    if (chargeHistory) {
      this.cache.chargeHistory = chargeHistory;
      this.emit("chargeHistory", chargeHistory);
    }
  }

  /**
   * Request a polling endpoint be refreshed, cached, and emitted regularly
   * @param endpoint
   */
  public requestPolling(endpoint: PollingEndpoints): () => void {
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
            () => this.refreshBackupHistory().catch(this.root.logger.warn),
            300_000,
            20_000 + Math.round(10_000 * Math.random()),
          );
          this.refreshBackupHistory().catch(this.root.logger.warn);
          break;
        case "energyHistory":
          // Schedule 30 seconds after each 5-minute mark aligned to clock time
          this.refreshIntervals[endpoint] = scheduler(
            () => this.refreshEnergyHistory().catch(this.root.logger.warn),
            300_000,
            20_000 + Math.round(10_000 * Math.random()),
          );
          this.refreshEnergyHistory().catch(this.root.logger.warn);
          break;
        case "chargeHistory": {
          const intervalHandle = setInterval(() => {
            this.refreshChargeHistory().catch(this.root.logger.warn);
          }, this.refreshDelay);
          this.refreshIntervals[endpoint] = () => clearInterval(intervalHandle);
          this.refreshChargeHistory().catch(this.root.logger.warn);
          break;
        }
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

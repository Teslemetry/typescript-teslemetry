import { Teslemetry } from "./Teslemetry.js";
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
} from "./client/index.js";

export class TeslemetryEnergyApi {
  private root: Teslemetry;
  public siteId: number;

  constructor(root: Teslemetry, siteId: number) {
    this.root = root;
    this.siteId = siteId;
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
   * Returns the backup (off-grid) event history of the site or the energy measurements of the site, aggregated to the requested period.
   * @param kind Type of history to retrieve
   * @param period Aggregation period
   * @param start_date Start date for the data range
   * @param end_date End date for the data range
   * @return Promise to an object with response containing backup event history or energy measurements aggregated by period
   */
  public async getCalendarHistory(
    kind: "backup" | "energy",
    period: "day" | "week" | "month" | "year",
    start_date: string,
    end_date: string,
  ) {
    const { data } = await getApi1EnergySitesByIdCalendarHistory({
      query: {
        kind,
        period,
        start_date,
        end_date,
      },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
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

  /**
   * Returns the live status of the site (power, state of energy, grid status, storm mode).
   * @return Promise to an object with response containing current live status of the energy site
   */
  public async getLiveStatus() {
    const { data } = await getApi1EnergySitesByIdLiveStatus({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns information about the site. Things like assets (has solar, etc), settings (backup reserve, etc), and features (storm_mode_capable, etc).
   * @return Promise to an object with response containing detailed information about the energy site
   */
  public async getSiteInfo() {
    const { data } = await getApi1EnergySitesByIdSiteInfo({
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
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
   * @param start_date Start date for the telemetry data
   * @param end_date End date for the telemetry data
   * @param time_zone Optional timezone for the data
   * @return Promise to an object with response containing charging history data from wall connectors
   */
  public async getTelemetryHistory(
    start_date: string,
    end_date: string,
    time_zone?: string,
  ) {
    const { data } = await getApi1EnergySitesByIdTelemetryHistory({
      query: { kind: "charge", start_date, end_date, time_zone },
      path: { id: this.siteId },
      client: this.root.client,
    });
    return data;
  }
}

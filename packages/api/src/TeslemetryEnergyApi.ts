import { Teslemetry } from "./Teslemetry";
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
} from "./client";

export class TeslemetryEnergyApi {
  private root: Teslemetry;
  public siteId: number;

  constructor(root: Teslemetry, siteId: number) {
    this.root = root;
    this.siteId = siteId;
  }

  /**
   * Adjust the site's backup reserve.
   * @param backup_reserve_percent The backup reserve percentage.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setBackupReserve(backup_reserve_percent: number) {
    return postApi1EnergySitesByIdBackup({
      body: { backup_reserve_percent },
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Returns the backup (off-grid) event history of the site or the energy measurements of the site.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getCalendarHistory(
    kind: "backup" | "energy",
    period: "day" | "week" | "month" | "year",
    start_date: string,
    end_date: string,
  ) {
    return getApi1EnergySitesByIdCalendarHistory({
      query: {
        kind,
        period,
        start_date,
        end_date,
      },
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Allow/disallow charging from the grid and exporting energy to the grid.
   * @param customer_preferred_export_rule The customer's preferred export rule.
   * @param disallow_charge_from_grid_with_solar_install Whether to disallow charging from the grid with a solar install.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async gridImportExport(
    customer_preferred_export_rule: "battery_ok" | "pv_only" | "never",
    disallow_charge_from_grid_with_solar_installed?: boolean,
  ) {
    return postApi1EnergySitesByIdGridImportExport({
      body: {
        customer_preferred_export_rule,
        disallow_charge_from_grid_with_solar_installed,
      },
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Returns the live status of the site.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getLiveStatus() {
    return getApi1EnergySitesByIdLiveStatus({
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Returns information about the site.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getSiteInfo() {
    return getApi1EnergySitesByIdSiteInfo({
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Adjust the site's off-grid vehicle charging backup reserve.
   * @param off_grid_vehicle_charging_reserve_percent The off-grid vehicle charging backup reserve percentage.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setOffGridVehicleChargingReserve(
    off_grid_vehicle_charging_reserve_percent: number,
  ) {
    return postApi1EnergySitesByIdOffGridVehicleChargingReserve({
      body: { off_grid_vehicle_charging_reserve_percent },
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Set the site's mode.
   * @param default_real_mode The site's mode.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setOperationMode(
    default_real_mode: "self_consumption" | "backup" | "autonomous",
  ) {
    return postApi1EnergySitesByIdOperation({
      body: { default_real_mode },
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Set the site's storm mode.
   * @param enabled Whether to enable storm mode.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setStormMode(enabled: boolean) {
    return postApi1EnergySitesByIdStormMode({
      body: { enabled },
      path: { id: this.siteId },
      client: this.root.client,
    });
  }

  /**
   * Returns the charging history of a wall connector.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getTelemetryHistory(
    start_date: string,
    end_date: string,
    time_zone?: string,
  ) {
    return getApi1EnergySitesByIdTelemetryHistory({
      query: { kind: "charge", start_date, end_date, time_zone },
      path: { id: this.siteId },
      client: this.root.client,
    });
  }
}

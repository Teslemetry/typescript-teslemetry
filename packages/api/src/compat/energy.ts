import type { TeslemetryEnergyApi } from "../TeslemetryEnergyApi.js";
import { clientOf, markRejections } from "./failover.js";

type Api = TeslemetryEnergyApi;
type ExportRule = Parameters<Api["gridImportExport"]>[0];
type Period = Parameters<Api["getCalendarHistory"]>[1];
type OperationMode = Parameters<Api["setOperationMode"]>[0];
type IslandMode = Parameters<Api["setIslandMode"]>[0];
type AuthorizedClient = Parameters<Api["addAuthorizedClient"]>[0];

function publicKeyBase64(public_key: Uint8Array | string): string {
  return typeof public_key === "string" ? public_key : Buffer.from(public_key).toString("base64");
}

/**
 * `TeslemetryEnergyApi` under the method names, arguments and reply envelopes of
 * `tesla-fleet-api`'s energy sites, so it can be an `EnergySiteRouter` backend.
 * The rules are `VehicleCompat`'s: no import of `tesla-fleet-api`, a method the
 * API has no wrapper for stays absent, and a rejection is the value the SDK
 * rejects.
 *
 * `find_gateway_address` is absent because `parse_gateway_address` is in
 * `tesla-fleet-api`. Pass `getCommandNetworkingStatus()` to it from the caller.
 */
export class EnergySiteCompat {
  readonly api: Api;
  readonly energy_site_id: number;

  constructor(api: Api) {
    this.api = api;
    this.energy_site_id = api.siteId;
    markRejections(clientOf(api));
  }

  // Settings

  async backup(backup_reserve_percent: number) {
    return this.api.setBackupReserve(backup_reserve_percent);
  }

  async operation(default_real_mode: string) {
    return this.api.setOperationMode(default_real_mode as OperationMode);
  }

  async storm_mode(enabled: boolean) {
    return this.api.setStormMode(enabled);
  }

  /**
   * Takes `disallow` first where the SDK takes `rule` first. Each setting is
   * optional and a single-setting call sends only that setting: the SDK leaves
   * an undefined one out of the body, and a derived value would overwrite the
   * other setting. `false` is a value and is sent.
   */
  async grid_import_export(
    disallow_charge_from_grid_with_solar_installed: boolean | null = null,
    customer_preferred_export_rule: string | null = null,
  ) {
    return this.api.gridImportExport(
      (customer_preferred_export_rule ?? undefined) as ExportRule,
      disallow_charge_from_grid_with_solar_installed ?? undefined,
    );
  }

  async off_grid_vehicle_charging_reserve(off_grid_vehicle_charging_reserve_percent: number) {
    return this.api.setOffGridVehicleChargingReserve(off_grid_vehicle_charging_reserve_percent);
  }

  /** @param settings The tariff, which goes under `tou_settings.tariff_content_v2`. */
  async time_of_use_settings(settings: Record<string, unknown>) {
    return this.api.setTimeOfUseSettings({ tou_settings: { tariff_content_v2: settings } });
  }

  // Reads

  async live_status() {
    return this.api.getLiveStatus();
  }

  async site_info() {
    return this.api.getSiteInfo();
  }

  async backup_history(period: string | null, start_date?: string | null, end_date?: string | null, time_zone?: string | null) {
    return this.api.getCalendarHistory(
      "backup",
      period as Period,
      start_date ?? undefined,
      end_date ?? undefined,
      time_zone ?? undefined,
    );
  }

  async energy_history(period: string | null, start_date?: string | null, end_date?: string | null, time_zone?: string | null) {
    return this.api.getCalendarHistory(
      "energy",
      period as Period,
      start_date ?? undefined,
      end_date ?? undefined,
      time_zone ?? undefined,
    );
  }

  async charge_history(start_date: string, end_date: string, time_zone?: string | null) {
    return this.api.getTelemetryHistory(start_date, end_date, time_zone ?? undefined);
  }

  // Gateway commands

  async get_system_info() {
    return this.api.getCommandSystemInfo();
  }

  async get_networking_status() {
    return this.api.getCommandNetworkingStatus();
  }

  async wifi_scan() {
    return this.api.getCommandWifiScan();
  }

  async get_device_cert() {
    return this.api.getCommandDeviceCert();
  }

  async get_signed_commands_public_key() {
    return this.api.getCommandSignedCommandsPublicKey();
  }

  async set_local_site_config(params?: Record<string, unknown> | null) {
    return this.api.setLocalSiteConfig(params ?? {});
  }

  async set_island_mode(mode: number, force?: boolean | null) {
    return this.api.setIslandMode(mode as IslandMode, force ?? undefined);
  }

  /** @param priority A string carries values beyond 2^53. */
  async schedule_backup_event(start_time?: string | null, duration_seconds?: number | null, priority?: number | string | null) {
    const given = Object.entries({ start_time, duration_seconds, priority }).filter(([, value]) => value != null);
    return this.api.scheduleBackupEvent(given.length ? Object.fromEntries(given) : undefined);
  }

  async cancel_backup_event() {
    return this.api.cancelBackupEvent();
  }

  // Authorized clients

  async list_authorized_clients() {
    return this.api.getCommandAuthorizedClients();
  }

  /** @param public_key Raw DER bytes, which are base64-encoded, or an already base64-encoded string. */
  async add_authorized_client(
    public_key?: Uint8Array | string | null,
    description?: string | null,
    key_type?: number | null,
    authorized_client_type?: number | null,
  ) {
    return this.api.addAuthorizedClient({
      public_key: public_key == null ? undefined : publicKeyBase64(public_key),
      description: description ?? undefined,
      key_type: (key_type ?? undefined) as AuthorizedClient["key_type"],
      authorized_client_type: (authorized_client_type ?? undefined) as AuthorizedClient["authorized_client_type"],
    });
  }

  /** @param public_key Raw DER bytes, which are base64-encoded, or an already base64-encoded string. */
  async remove_authorized_client(public_key: Uint8Array | string) {
    return this.api.removeAuthorizedClient({ public_key: publicKeyBase64(public_key) });
  }
}

import type { TeslemetryVehicleApi } from "../TeslemetryVehicleApi.js";
import { clientOf, markRejections, vehicleOffline } from "./failover.js";

const WAKE_TIMEOUT_MS = 60_000;
const WAKE_POLL_MS = 5_000;

/** `tesla-fleet-api`'s `Seat` names mapped to `Seat` numbers. */
const SEATS = {
  FRONT_LEFT: 0,
  FRONT_RIGHT: 1,
  REAR_LEFT: 2,
  REAR_LEFT_BACK: 3,
  REAT_LEFT_BACK: 3,
  REAR_CENTER: 4,
  REAR_RIGHT: 5,
  REAR_RIGHT_BACK: 6,
  THIRD_LEFT: 7,
  THIRD_RIGHT: 8,
  THIRD_ROW_LEFT: 7,
  THIRD_ROW_RIGHT: 8,
} as const;

/** `setSeatHeater`'s seat names, indexed by `Seat` number. */
const SEAT_NAMES = [
  "front_left",
  "front_right",
  "rear_left",
  "rear_left_back",
  "rear_center",
  "rear_right",
  "rear_right_back",
  "third_row_left",
  "third_row_right",
] as const;

/** `setSeatCooler`'s and `setAutoSeatClimate`'s names, keyed by the 1-indexed position those commands use. */
const FRONT_SEAT_NAMES = { 1: "front_left", 2: "front_right" } as const;
const FRONT_SEATS = { FRONT_LEFT: 1, FRONT_RIGHT: 2 } as const;

const CLIMATE_MODES = { Off: 0, Keep: 1, Dog: 2, Camp: 3 } as const;

type Seat = keyof typeof SEATS;
type FrontSeat = keyof typeof FRONT_SEATS;
type ClimateMode = keyof typeof CLIMATE_MODES;
type ClosureState = "none" | "move" | "stop" | "open" | "close";
type SeatHeaterLevel = "off" | "low" | "medium" | "high";
type Api = TeslemetryVehicleApi;

export type ClosureOptions = {
  front_driver_door?: ClosureState;
  front_passenger_door?: ClosureState;
  rear_driver_door?: ClosureState;
  rear_passenger_door?: ClosureState;
  rear_trunk?: ClosureState;
  front_trunk?: ClosureState;
  charge_port?: ClosureState;
  tonneau?: ClosureState;
};

export type SeatHeaterOptions = {
  front_left?: SeatHeaterLevel;
  front_right?: SeatHeaterLevel;
  rear_left?: SeatHeaterLevel;
  rear_right?: SeatHeaterLevel;
  rear_left_back?: SeatHeaterLevel;
  rear_center?: SeatHeaterLevel;
  rear_right_back?: SeatHeaterLevel;
  third_row_left?: SeatHeaterLevel;
  third_row_right?: SeatHeaterLevel;
};

/** The name of a `Seat`. An unknown seat must throw: the SDK would drop it from the body and still send the command. */
function heaterSeat(seat: Seat | number): (typeof SEAT_NAMES)[number] {
  const name = SEAT_NAMES[typeof seat === "string" ? SEATS[seat] : seat];
  if (name === undefined) throw new RangeError(`Invalid seat position: ${seat}`);
  return name;
}

/** The name of a front seat. Numbers are the 1-indexed wire positions, as in Python, not `Seat` numbers. */
function frontSeat(seat: FrontSeat | number): (typeof FRONT_SEAT_NAMES)[1 | 2] {
  const position = typeof seat === "string" ? FRONT_SEATS[seat] : seat;
  const name = FRONT_SEAT_NAMES[position as 1 | 2];
  if (name === undefined) throw new RangeError(`Invalid front seat position: ${seat}`);
  return name;
}

/**
 * `TeslemetryVehicleApi` under the method names, arguments and reply envelopes of
 * `tesla-fleet-api`'s vehicles, so it can be a `VehicleRouter` backend. The match
 * is structural: this module imports nothing from `tesla-fleet-api`, so loading
 * it loads no protobuf. A method the API has no wrapper for stays absent, and the
 * router skips this backend for it.
 *
 * A rejection is the value the SDK rejects, with hidden `status` and
 * `failover_safe` added when it is an object.
 *
 * These `tesla-fleet-api` arguments have no SDK equivalent and are not accepted:
 * `trigger_homelink`'s `token`, `clear_pin_to_drive_admin`'s `pin`,
 * `nearby_charging_sites`' filters and `release_notes`' `staged` and `language`.
 */
export class VehicleCompat {
  readonly api: Api;
  readonly vin: string;

  constructor(api: Api) {
    this.api = api;
    this.vin = api.vin;
    markRejections(clientOf(api));
  }

  // Vehicle data

  async vehicle() {
    return this.api.state();
  }

  /** `tesla-fleet-api` joins endpoints with `;`; the SDK takes a list. */
  async vehicle_data(endpoints?: string[] | string) {
    const list = typeof endpoints === "string" ? endpoints.split(/[;,]/) : endpoints;
    return this.api.vehicleData(list as Parameters<Api["vehicleData"]>[0]);
  }

  async data_refresh() {
    return this.api.refreshData();
  }

  async wake_up({ wait = false, timeoutMs = WAKE_TIMEOUT_MS }: { wait?: boolean; timeoutMs?: number } = {}) {
    const deadline = Date.now() + timeoutMs;
    let result = await this.api.wakeUp();
    if (!wait) return result;
    while (result.response?.state !== "online") {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw vehicleOffline();
      await new Promise((resolve) => setTimeout(resolve, Math.min(WAKE_POLL_MS, remaining)));
      result = await this.api.state();
    }
    return result;
  }

  async mobile_enabled() {
    return this.api.getMobileEnabled();
  }

  async nearby_charging_sites() {
    return this.api.getNearbyChargingSites();
  }

  async recent_alerts() {
    return this.api.getRecentAlerts();
  }

  async release_notes() {
    return this.api.getReleaseNotes();
  }

  async service_data() {
    return this.api.getServiceData();
  }

  /** `tesla-fleet-api` takes the VIN here as well; the SDK uses its own. */
  async options(_vin?: string) {
    return this.api.getVehicleOptions();
  }

  async warranty_details() {
    return this.api.getWarrantyDetails();
  }

  async fleet_telemetry_config_get() {
    return this.api.getFleetTelemetryConfig();
  }

  async fleet_telemetry_config_delete() {
    return this.api.deleteFleetTelemetryConfig();
  }

  // Sharing

  async drivers() {
    return this.api.getDrivers();
  }

  async drivers_remove(share_user_id?: number | string) {
    return this.api.removeDriver(share_user_id == null ? (share_user_id as never) : String(share_user_id));
  }

  async share_invites() {
    return this.api.getInvitations();
  }

  async share_invites_create() {
    return this.api.createInvitation();
  }

  async share_invites_revoke(id: string) {
    return this.api.revokeInvitation(id);
  }

  // Doors, trunks and media

  async door_lock() {
    return this.api.lockDoors();
  }

  async door_unlock() {
    return this.api.unlockDoors();
  }

  async actuate_trunk(which_trunk: "front" | "rear") {
    return this.api.actuateTrunk(which_trunk);
  }

  async window_control(command: "vent" | "close", lat: number, lon: number) {
    return this.api.windowControl(command, lat, lon);
  }

  async sun_roof_control(state: "stop" | "close" | "vent") {
    return this.api.sunRoofControl(state);
  }

  async flash_lights() {
    return this.api.flashLights();
  }

  async honk_horn() {
    return this.api.honkHorn();
  }

  async remote_boombox(sound: number = 0) {
    return this.api.remoteBoombox(sound);
  }

  async remote_start_drive() {
    return this.api.remoteStart();
  }

  async trigger_homelink(lat: number, lon: number) {
    return this.api.triggerHomelink(lat, lon);
  }

  async set_vehicle_name(vehicle_name: string) {
    return this.api.setVehicleName(vehicle_name);
  }

  async adjust_volume(volume: number) {
    return this.api.adjustVolume(volume);
  }

  async media_next_fav() {
    return this.api.mediaNextFavorite();
  }

  async media_next_track() {
    return this.api.mediaNextTrack();
  }

  async media_prev_fav() {
    return this.api.mediaPreviousFavorite();
  }

  async media_prev_track() {
    return this.api.mediaPreviousTrack();
  }

  async media_toggle_playback() {
    return this.api.mediaTogglePlayback();
  }

  async media_volume_down() {
    return this.api.mediaVolumeDown();
  }

  // Climate

  async auto_conditioning_start() {
    return this.api.startAutoConditioning();
  }

  async auto_conditioning_stop() {
    return this.api.stopAutoConditioning();
  }

  async set_temps(driver_temp: number, passenger_temp: number) {
    return this.api.setTemps(driver_temp, passenger_temp);
  }

  async set_climate_keeper_mode(climate_keeper_mode: number | ClimateMode) {
    const mode = typeof climate_keeper_mode === "string" ? CLIMATE_MODES[climate_keeper_mode] : climate_keeper_mode;
    return this.api.setClimateKeeperMode(mode as Parameters<Api["setClimateKeeperMode"]>[0]);
  }

  async set_bioweapon_mode(on: boolean, manual_override: boolean) {
    return this.api.setBioweaponDefenseMode(on, manual_override);
  }

  async set_preconditioning_max(on: boolean, manual_override: boolean) {
    return this.api.setPreconditioningMax(on, manual_override);
  }

  async set_cabin_overheat_protection(on: boolean, fan_only: boolean) {
    return this.api.setCabinOverheatProtection({ on, fan_only });
  }

  /** The API takes 0, 1 or 2. `tesla-fleet-api` also takes the Celsius and Fahrenheit values those stand for. */
  async set_cop_temp(cop_temp: 0 | 1 | 2 | 30 | 35 | 40 | 90 | 95 | 100) {
    const base = cop_temp >= 90 ? 90 : cop_temp >= 30 ? 30 : 0;
    return this.api.setCopTemp(((cop_temp - base) / (base ? 5 : 1)) as 0 | 1 | 2);
  }

  async remote_auto_seat_climate_request(auto_seat_position: FrontSeat | number, auto_climate_on: boolean) {
    return this.api.setAutoSeatClimate(frontSeat(auto_seat_position), auto_climate_on);
  }

  async remote_auto_steering_wheel_heat_climate_request(on: boolean) {
    return this.api.setAutoSteeringWheelHeat(on);
  }

  /** @param seat_position A front seat name, or 1 (front left) or 2 (front right), as in Python. */
  async remote_seat_cooler_request(seat_position: FrontSeat | number, seat_cooler_level: number) {
    return this.api.setSeatCooler(frontSeat(seat_position), seat_cooler_level);
  }

  /** @param seat_position A `Seat` name or number. */
  async remote_seat_heater_request(seat_position: Seat | number, seat_heater_level: number) {
    return this.api.setSeatHeater(heaterSeat(seat_position), seat_heater_level);
  }

  async remote_steering_wheel_heater_request(on: boolean) {
    return this.api.setSteeringWheelHeater(on);
  }

  async remote_steering_wheel_heat_level_request(level: number) {
    return this.api.setSteeringWheelHeatLevel(level as 0 | 1 | 3);
  }

  async seat_heater(options: SeatHeaterOptions = {}) {
    return this.api.setSeatHeaters({
      frontLeft: options.front_left,
      frontRight: options.front_right,
      rearLeft: options.rear_left,
      rearRight: options.rear_right,
      rearLeftBack: options.rear_left_back,
      rearCenter: options.rear_center,
      rearRightBack: options.rear_right_back,
      thirdRowLeft: options.third_row_left,
      thirdRowRight: options.third_row_right,
    });
  }

  // Charging

  async charge_start() {
    return this.api.startCharging();
  }

  async charge_stop() {
    return this.api.stopCharging();
  }

  async charge_max_range() {
    return this.api.chargeMaxRange();
  }

  async charge_standard() {
    return this.api.chargeStandard();
  }

  async charge_port_door_open() {
    return this.api.openChargePort();
  }

  async charge_port_door_close() {
    return this.api.closeChargePort();
  }

  async set_charge_limit(percent: number) {
    return this.api.setChargeLimit(percent);
  }

  async set_charging_amps(charging_amps: number) {
    return this.api.setChargingAmps(charging_amps);
  }

  async charge_on_solar(enabled?: boolean, lower_charge_limit?: number, upper_charge_limit?: number) {
    return this.api.chargeOnSolar(enabled, lower_charge_limit, upper_charge_limit);
  }

  async set_scheduled_charging(enable: boolean, time: number) {
    return this.api.setScheduledCharging(enable, time);
  }

  async set_scheduled_departure(
    enable: boolean = true,
    preconditioning_enabled: boolean = false,
    preconditioning_weekdays_only: boolean = false,
    departure_time: number = 0,
    off_peak_charging_enabled: boolean = false,
    off_peak_charging_weekdays_only: boolean = false,
    end_off_peak_time: number = 0,
  ) {
    return this.api.setScheduledDeparture({
      enable,
      preconditioning_enabled,
      preconditioning_weekdays_only,
      departure_time,
      off_peak_charging_enabled,
      off_peak_charging_weekdays_only,
      end_off_peak_time,
    });
  }

  async add_charge_schedule(
    days_of_week: string | number,
    enabled: boolean,
    lat: number,
    lon: number,
    start_time?: number,
    end_time?: number,
    one_time?: boolean,
    id?: number,
  ) {
    if (start_time == null && end_time == null) {
      throw new Error("Either start_time or end_time or both must be provided");
    }
    return this.api.addChargeSchedule({
      days_of_week,
      enabled,
      end_enabled: end_time != null,
      lat,
      lon,
      start_enabled: start_time != null,
      start_time,
      end_time,
      id,
      one_time,
    });
  }

  async remove_charge_schedule(id: number) {
    return this.api.removeChargeSchedule(id);
  }

  async add_precondition_schedule(
    days_of_week: string | number,
    enabled: boolean,
    lat: number,
    lon: number,
    precondition_time: number,
    id?: number,
    one_time?: boolean,
  ) {
    return this.api.addPreconditionSchedule({
      days_of_week: days_of_week as string,
      enabled,
      lat,
      lon,
      precondition_time,
      id,
      one_time,
    });
  }

  async remove_precondition_schedule(id: number) {
    return this.api.removePreconditionSchedule(id);
  }

  // Security

  async set_sentry_mode(on: boolean) {
    return this.api.setSentryMode(on);
  }

  async guest_mode(enable: boolean) {
    return this.api.setGuestMode(enable);
  }

  async set_valet_mode(on: boolean, password: string | number) {
    return this.api.setValetMode(on, String(password));
  }

  async reset_valet_pin() {
    return this.api.resetValetPin();
  }

  async set_pin_to_drive(on: boolean, password: string | number) {
    return this.api.setPinToDrive(on, String(password));
  }

  async reset_pin_to_drive_pin() {
    return this.api.resetPinToDrive();
  }

  async clear_pin_to_drive(pin: string) {
    return this.api.clearPinToDrive(pin);
  }

  async clear_pin_to_drive_admin() {
    return this.api.clearPinToDriveAdmin();
  }

  async speed_limit_activate(pin: string | number) {
    return this.api.speedLimitActivate(String(pin));
  }

  async speed_limit_deactivate(pin: string | number) {
    return this.api.speedLimitDeactivate(String(pin));
  }

  async speed_limit_clear_pin(pin: string | number) {
    return this.api.speedLimitClearPin(String(pin));
  }

  async speed_limit_clear_pin_admin() {
    return this.api.speedLimitClearPinAdmin();
  }

  async speed_limit_set_limit(limit_mph: number) {
    return this.api.speedLimitSetLimit(limit_mph);
  }

  async erase_user_data() {
    return this.api.eraseUserData();
  }

  async remove_key() {
    return this.api.removeAllImpermanentKeys();
  }

  // Software updates

  async schedule_software_update(offset_sec: number) {
    return this.api.scheduleSoftwareUpdate(offset_sec);
  }

  async cancel_software_update() {
    return this.api.cancelSoftwareUpdate();
  }

  // Navigation

  /** `value` is sent as the plain string the public API spec documents, not `tesla-fleet-api`'s `android.intent.extra.TEXT` object. */
  async navigation_request(value: string, locale?: string, type: string = "share_ext_content_raw") {
    return this.api.navigationRequest({ value, locale, type, timestamp_ms: Date.now() });
  }

  async navigation_gps_request(lat: number, lon: number, order?: number) {
    return this.api.navigationGpsRequest({ lat, lon, order: order as 0 | 1 | 2 | 3 });
  }

  async navigation_sc_request(id: number, order?: number) {
    return this.api.navigationSuperchargerRequest({ id, order: order as 0 | 1 | 2 | 3 });
  }

  async navigation_waypoints_request(waypoints: string) {
    return this.api.navigationWaypointsRequest({ waypoints });
  }

  async upcoming_calendar_entries(calendar_data: string | Record<string, unknown>) {
    return this.api.upcomingCalendarEntries(calendar_data as Record<string, unknown>);
  }

  // Teslemetry custom commands

  async ping() {
    return this.api.ping();
  }

  async closure(options: ClosureOptions = {}) {
    const keys: [string, ClosureState | undefined][] = [
      ["frontDriverDoor", options.front_driver_door],
      ["frontPassengerDoor", options.front_passenger_door],
      ["rearDriverDoor", options.rear_driver_door],
      ["rearPassengerDoor", options.rear_passenger_door],
      ["rearTrunk", options.rear_trunk],
      ["frontTrunk", options.front_trunk],
      ["chargePort", options.charge_port],
      ["tonneau", options.tonneau],
    ];
    return this.api.closure(Object.fromEntries(keys.filter(([, state]) => state !== "none")));
  }

  async dashcam_save() {
    return this.api.dashcamSave();
  }

  async play_video(url: string) {
    return this.api.playVideo(url);
  }

  async start_light_show(show_index: number, start_time?: number, volume?: number, dance_moves?: boolean) {
    return this.api.startLightShow(show_index, start_time, volume, dance_moves);
  }

  async stop_light_show() {
    return this.api.stopLightShow();
  }
}

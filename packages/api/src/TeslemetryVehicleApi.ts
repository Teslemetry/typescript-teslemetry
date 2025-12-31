import { EventEmitter } from "events";
import { Teslemetry } from "./Teslemetry.js";
import {
  // Vehicle Data
  getApi1VehiclesByVinVehicleData,
  getApi1VehiclesByVin,
  getApiRefreshByVin,
  getApiVehicleConfigByVin,
  getApiConfigByVin,
  patchApiConfigByVin,
  postApiConfigByVin,
  deleteApiConfigByVin,
  getApi1VehiclesByVinMobileEnabled,
  getApi1VehiclesByVinNearbyChargingSites,
  getApi1VehiclesByVinRecentAlerts,
  getApi1VehiclesByVinReleaseNotes,
  getApi1VehiclesByVinServiceData,
  wakeUp,

  // Fleet Telemetry
  getApi1VehiclesByVinFleetTelemetryConfig,
  deleteApi1VehiclesByVinFleetTelemetryConfig,
  getApi1VehiclesByVinFleetTelemetryErrors,

  // Commands
  postApi1VehiclesByVinCommandActuateTrunk,
  postApi1VehiclesByVinCommandAdjustVolume,
  postApi1VehiclesByVinCommandAutoConditioningStart,
  postApi1VehiclesByVinCommandAutoConditioningStop,
  postApi1VehiclesByVinCommandChargeMaxRange,
  postApi1VehiclesByVinCommandChargePortDoorClose,
  postApi1VehiclesByVinCommandChargePortDoorOpen,
  postApi1VehiclesByVinCommandChargeStandard,
  postApi1VehiclesByVinCommandChargeStart,
  postApi1VehiclesByVinCommandChargeStop,
  postApi1VehiclesByVinCommandDoorLock,
  postApi1VehiclesByVinCommandDoorUnlock,
  postApi1VehiclesByVinCommandEraseUserData,
  postApi1VehiclesByVinCommandFlashLights,
  postApi1VehiclesByVinCommandHonkHorn,
  postApi1VehiclesByVinCommandMediaNextFav,
  postApi1VehiclesByVinCommandMediaNextTrack,
  postApi1VehiclesByVinCommandMediaPrevFav,
  postApi1VehiclesByVinCommandMediaPrevTrack,
  postApi1VehiclesByVinCommandMediaTogglePlayback,
  postApi1VehiclesByVinCommandMediaVolumeDown,
  postApi1VehiclesByVinCommandRemoteStartDrive,
  postApi1VehiclesByVinCommandSetVehicleName,
  postApi1VehiclesByVinCommandTriggerHomelink,
  postApi1VehiclesByVinCommandWindowControl,

  // Climate Commands
  postApi1VehiclesByVinCommandSetTemps,
  postApi1VehiclesByVinCommandSetClimateKeeperMode,
  postApi1VehiclesByVinCommandSetBioweaponMode,
  postApi1VehiclesByVinCommandSetPreconditioningMax,
  postApi1VehiclesByVinCommandRemoteAutoSeatClimateRequest,
  postApi1VehiclesByVinCommandRemoteAutoSteeringWheelHeatClimateRequest,
  postApi1VehiclesByVinCommandRemoteSeatCoolerRequest,
  postApi1VehiclesByVinCommandRemoteSeatHeaterRequest,
  postApi1VehiclesByVinCommandRemoteSteeringWheelHeaterRequest,
  postApi1VehiclesByVinCommandRemoteSteeringWheelHeatLevelRequest,

  // Charging Commands
  postApi1VehiclesByVinCommandSetChargeLimit,
  postApi1VehiclesByVinCommandSetChargingAmps,
  postApi1VehiclesByVinCommandSetScheduledCharging,
  postApi1VehiclesByVinCommandSetScheduledDeparture,
  postApi1VehiclesByVinCommandAddChargeSchedule,
  postApi1VehiclesByVinCommandRemoveChargeSchedule,

  // Schedules
  postApi1VehiclesByVinCommandAddPreconditionSchedule,
  postApi1VehiclesByVinCommandRemovePreconditionSchedule,

  // Overheat Protection
  postApi1VehiclesByVinCommandSetCabinOverheatProtection,
  postApi1VehiclesByVinCommandSetCopTemp,

  // Sentry Mode
  postApi1VehiclesByVinCommandSetSentryMode,

  // Valet Mode
  postApi1VehiclesByVinCommandSetValetMode,
  postApi1VehiclesByVinCommandResetValetPin,

  // PIN to Drive
  postApi1VehiclesByVinCommandSetPinToDrive,
  postApi1VehiclesByVinCommandClearPinToDriveAdmin,
  postApi1VehiclesByVinCommandResetPinToDrivePin,

  // Speed Limit
  postApi1VehiclesByVinCommandSpeedLimitActivate,
  postApi1VehiclesByVinCommandSpeedLimitDeactivate,
  postApi1VehiclesByVinCommandSpeedLimitClearPin,
  postApi1VehiclesByVinCommandSpeedLimitClearPinAdmin,
  postApi1VehiclesByVinCommandSpeedLimitSetLimit,

  // Software Update
  postApi1VehiclesByVinCommandScheduleSoftwareUpdate,
  postApi1VehiclesByVinCommandCancelSoftwareUpdate,

  // Navigation
  postApi1VehiclesByVinCommandNavigationRequest,
  postApi1VehiclesByVinCommandNavigationGpsRequest,
  postApi1VehiclesByVinCommandNavigationScRequest,
  postApi1VehiclesByVinCommandNavigationWaypointsRequest,

  // Sharing & Drivers
  getApi1VehiclesByVinDrivers,
  deleteApi1VehiclesByVinDrivers,
  getApi1VehiclesByVinInvitations,
  postApi1VehiclesByVinInvitations,
  postApi1VehiclesByVinInvitationsByIdRevoke,

  // Custom Commands
  postApi1VehiclesByVinCustomCommandPing,
  postApi1VehiclesByVinCustomCommandClosure,
  postApi1VehiclesByVinCustomCommandSeatHeater,
  postApi1VehiclesByVinCustomCommandChargeOnSolar,
  postApi1VehiclesByVinCustomCommandDashcamSave,
  postApi1VehiclesByVinCustomCommandPlayVideo,
  postApi1VehiclesByVinCustomCommandStopLightShow,
  postApi1VehiclesByVinCustomCommandStartLightShow,
  postApi1VehiclesByVinCustomCommandClearPinToDrive,
  postApi1VehiclesByVinCustomCommandRemoveKey,
  getApi1DxVehiclesOptions,
  getApi1DxWarrantyDetails,
  getApi1DxVehiclesSubscriptionsEligible,
  getApi1DxVehiclesUpgradeEligibility,
  postApi1VehiclesByVinChargeHistory,
  postApi1VehiclesByVinCommandGuestMode,
  postApi1VehiclesByVinCommandRemoteBoombox,
  postApi1VehiclesByVinCommandSunRoofControl,
  postApi1VehiclesByVinCommandUpcomingCalendarEntries,
  // Response types
  GetApi1VehiclesByVinResponse,
  GetApi1VehiclesByVinVehicleDataResponse,
  GetApiVehicleConfigByVinResponse,
  GetApiConfigByVinResponse,
  GetApi1VehiclesByVinMobileEnabledResponse,
  GetApi1VehiclesByVinNearbyChargingSitesResponse,
  GetApi1VehiclesByVinRecentAlertsResponse,
  GetApi1VehiclesByVinReleaseNotesResponse,
  GetApi1VehiclesByVinServiceDataResponse,
  GetApi1VehiclesByVinFleetTelemetryConfigResponse,
  GetApi1VehiclesByVinFleetTelemetryErrorsResponse,
  GetApi1VehiclesByVinDriversResponse,
  GetApi1VehiclesByVinInvitationsResponse,
} from "./client/index.js";
import {
  PostApi1VehiclesByVinCommandSetScheduledDepartureData,
  PostApi1VehiclesByVinCommandAddChargeScheduleData,
  PostApi1VehiclesByVinCommandAddPreconditionScheduleData,
  PostApi1VehiclesByVinCommandSetCabinOverheatProtectionData,
  PostApi1VehiclesByVinCommandNavigationRequestData,
  PostApi1VehiclesByVinCommandNavigationGpsRequestData,
  PostApi1VehiclesByVinCommandNavigationScRequestData,
  PostApi1VehiclesByVinCommandNavigationWaypointsRequestData,
  PostApi1VehiclesByVinCustomCommandClosureData,
  PostApi1VehiclesByVinCustomCommandSeatHeaterData,
  PatchApiConfigByVinData,
  PostApiConfigByVinData,
  PostApi1VehiclesByVinCommandUpcomingCalendarEntriesData,
} from "./client/types.gen.js";

const FRONT_SEATS = {
  front_left: 1,
  front_right: 2,
  1: 1,
  2: 2,
} as const;

const ALL_SEATS = {
  front_left: 0,
  front_right: 1,
  rear_left: 2,
  rear_left_back: 3,
  rear_center: 4,
  rear_right: 5,
  rear_right_back: 6,
  third_row_left: 7,
  third_row_right: 8,
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
} as const;

type VehicleDataEndpoints =
  | "*"
  | "charge_state"
  | "climate_state"
  | "closures_state"
  | "drive_state"
  | "gui_settings"
  | "location_data"
  | "vehicle_config"
  | "vehicle_state"
  | "vehicle_data_combo";

// Interface for event type safety
type TeslemetryVehicleEventMap = {
  state: GetApi1VehiclesByVinResponse;
  vehicleData: GetApi1VehiclesByVinVehicleDataResponse;
  vehicleConfig: GetApiVehicleConfigByVinResponse;
  config: GetApiConfigByVinResponse;
  mobileEnabled: GetApi1VehiclesByVinMobileEnabledResponse;
  nearbyChargingSites: GetApi1VehiclesByVinNearbyChargingSitesResponse;
  recentAlerts: GetApi1VehiclesByVinRecentAlertsResponse;
  releaseNotes: GetApi1VehiclesByVinReleaseNotesResponse;
  serviceData: GetApi1VehiclesByVinServiceDataResponse;
  fleetTelemetryConfig: GetApi1VehiclesByVinFleetTelemetryConfigResponse;
  fleetTelemetryErrors: GetApi1VehiclesByVinFleetTelemetryErrorsResponse;
  drivers: GetApi1VehiclesByVinDriversResponse;
  invitations: GetApi1VehiclesByVinInvitationsResponse;
};

// TypeScript interface for event type safety
export declare interface TeslemetryVehicleApi {
  on<K extends keyof TeslemetryVehicleEventMap>(
    event: K,
    listener: (data: TeslemetryVehicleEventMap[K]) => void,
  ): this;
  off<K extends keyof TeslemetryVehicleEventMap>(
    event: K,
    listener: (data: TeslemetryVehicleEventMap[K]) => void,
  ): this;
  once<K extends keyof TeslemetryVehicleEventMap>(
    event: K,
    listener: (data: TeslemetryVehicleEventMap[K]) => void,
  ): this;
  emit<K extends keyof TeslemetryVehicleEventMap>(
    event: K,
    data: TeslemetryVehicleEventMap[K],
  ): boolean;
}

export class TeslemetryVehicleApi extends EventEmitter {
  private root: Teslemetry;
  public vin: string;

  constructor(root: Teslemetry, vin: string) {
    if (root.api.vehicles.has(vin)) {
      throw new Error("Vehicle already exists");
    }
    super();
    this.root = root;
    this.vin = vin;

    root.api.vehicles.set(vin, this);
  }

  /**
   * Data about the vehicle.
   * @return Promise to an object with response containing the vehicle's state information
   */
  public async state() {
    const { data } = await getApi1VehiclesByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("state", data);
    return data;
  }

  // --------------------------------------------------------------------------------
  // Vehicle Data
  // --------------------------------------------------------------------------------

  /**
   * Returns the cached vehicle data for this vehicle. location_data will only be present if you have provided the location_data scope.
   * @param endpoints An array of endpoint strings to retrieve data for
   * @param use_cache Whether to use cached data
   * @return Promise to an object with response containing the cached vehicle data
   */
  public async vehicleData(
    endpoints?: VehicleDataEndpoints[],
    use_cache: boolean = true,
  ) {
    const { data } = await getApi1VehiclesByVinVehicleData({
      query: {
        endpoints: endpoints ? endpoints.join(",") : undefined,
        use_cache,
      },
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("vehicleData", data);
    return data;
  }

  /**
   * Refresh the cached vehicle data immediately. Consumes 2 command credits.
   * @return Promise to an object with response containing confirmation of refresh
   */
  public async refreshData() {
    const { data } = await getApiRefreshByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Get the saved vehicle config.
   * @return Promise to an object with response containing the vehicle configuration
   */
  public async getVehicleConfig() {
    const { data } = await getApiVehicleConfigByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("vehicleConfig", data);
    return data;
  }

  /**
   * Get the streaming configuration for a specific vehicle.
   * @return Promise to an object with response containing the streaming configuration
   */
  public async getConfig() {
    const { data } = await getApiConfigByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("config", data);
    return data;
  }

  /**
   * Modify the streaming configuration for a specific vehicle.
   * @param fields The fields to update in the configuration
   * @return Promise to an object with response containing the updated configuration
   */
  public async patchConfig(
    fields: NonNullable<PatchApiConfigByVinData["body"]>["fields"],
  ) {
    const { data } = await patchApiConfigByVin({
      body: { fields },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Create the streaming configuration for a specific vehicle.
   * @param body The request body containing configuration details
   * @return Promise to an object with response containing the created configuration
   */
  public async postConfig(body: NonNullable<PostApiConfigByVinData["body"]>) {
    const { data } = await postApiConfigByVin({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Stop streaming data from a specific vehicle.
   * @return Promise to an object with response containing confirmation of configuration deletion
   */
  public async deleteConfig() {
    const { data } = await deleteApiConfigByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns whether or not mobile access is enabled for the vehicle.
   * @return Promise to an object with response containing mobile access status
   */
  public async getMobileEnabled() {
    const { data } = await getApi1VehiclesByVinMobileEnabled({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("mobileEnabled", data);
    return data;
  }

  /**
   * Returns the charging sites near the current location of the vehicle.
   * @return Promise to an object with response containing nearby charging sites
   */
  public async getNearbyChargingSites() {
    const { data } = await getApi1VehiclesByVinNearbyChargingSites({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("nearbyChargingSites", data);
    return data;
  }

  /**
   * List of recent alerts
   * @return Promise to an object with response containing recent alerts
   */
  public async getRecentAlerts() {
    const { data } = await getApi1VehiclesByVinRecentAlerts({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("recentAlerts", data);
    return data;
  }

  /**
   * Returns firmware release notes.
   * @return Promise to an object with response containing firmware release notes
   */
  public async getReleaseNotes() {
    const { data } = await getApi1VehiclesByVinReleaseNotes({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("releaseNotes", data);
    return data;
  }

  /**
   * Fetches information about the service status of the vehicle.
   * @return Promise to an object with response containing service status information
   */
  public async getServiceData() {
    const { data } = await getApi1VehiclesByVinServiceData({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("serviceData", data);
    return data;
  }

  /**
   * Returns the charge history for the vehicle.
   * @return Promise to an object with response containing charge history
   */
  public async chargeHistory() {
    const { data } = await postApi1VehiclesByVinChargeHistory({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Wakes the vehicle from sleep. This command costs 20 command credits
   * @return Promise to an object with response containing wake up confirmation
   */
  public async wakeUp() {
    const { data } = await wakeUp({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Fleet Telemetry
  // --------------------------------------------------------------------------------
  /**
   * Fetches a vehicle's fleet telemetry config.
   * @return Promise to an object with response containing fleet telemetry configuration
   */
  public async getFleetTelemetryConfig() {
    const { data } = await getApi1VehiclesByVinFleetTelemetryConfig({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("fleetTelemetryConfig", data);
    return data;
  }

  /**
   * Stop Fleet Telemetry
   * @return Promise to an object with response containing confirmation of telemetry deletion
   */
  public async deleteFleetTelemetryConfig() {
    const { data } = await deleteApi1VehiclesByVinFleetTelemetryConfig({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns recent fleet telemetry errors reported for the specified vehicle.
   * @return Promise to an object with response containing recent fleet telemetry errors
   */
  public async getFleetTelemetryErrors() {
    const { data } = await getApi1VehiclesByVinFleetTelemetryErrors({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("fleetTelemetryErrors", data);
    return data;
  }

  // --------------------------------------------------------------------------------
  // Vehicle Commands
  // --------------------------------------------------------------------------------
  /**
   * Controls the front or rear trunk.
   * @param which_trunk The trunk to actuate
   * @return Promise to an object with response containing trunk actuation result
   */
  public async actuateTrunk(which_trunk: "front" | "rear") {
    const { data } = await postApi1VehiclesByVinCommandActuateTrunk({
      body: { which_trunk },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Adjusts vehicle media playback volume.
   * @param volume The volume level
   * @return Promise to an object with response containing volume adjustment result
   */
  public async adjustVolume(volume: number) {
    const { data } = await postApi1VehiclesByVinCommandAdjustVolume({
      body: { volume },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Plays a sound through the vehicle external speaker.
   * @param sound The sound to play
   * @return Promise to an object with response containing remote boombox result
   */
  public async remoteBoombox(sound?: number) {
    const { data } = await postApi1VehiclesByVinCommandRemoteBoombox({
      body: { sound },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Starts climate preconditioning.
   * @return Promise to an object with response containing auto conditioning start result
   */
  public async startAutoConditioning() {
    const { data } = await postApi1VehiclesByVinCommandAutoConditioningStart({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Stops climate preconditioning.
   * @return Promise to an object with response containing auto conditioning stop result
   */
  public async stopAutoConditioning() {
    const { data } = await postApi1VehiclesByVinCommandAutoConditioningStop({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Locks the vehicle.
   * @return Promise to an object with response containing door lock result
   */
  public async lockDoors() {
    const { data } = await postApi1VehiclesByVinCommandDoorLock({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Unlocks the vehicle.
   * @return Promise to an object with response containing door unlock result
   */
  public async unlockDoors() {
    const { data } = await postApi1VehiclesByVinCommandDoorUnlock({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Erases user's data from the user interface.
   * @return Promise to an object with response containing user data erase result
   */
  public async eraseUserData() {
    const { data } = await postApi1VehiclesByVinCommandEraseUserData({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Enable/disable guest mode.
   * @param enable Whether to enable guest mode
   * @return Promise to an object with response containing guest mode set result
   */
  public async setGuestMode(enable: boolean) {
    const { data } = await postApi1VehiclesByVinCommandGuestMode({
      body: { enable },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Briefly flashes the vehicle headlights.
   * @return Promise to an object with response containing flash lights result
   */
  public async flashLights() {
    const { data } = await postApi1VehiclesByVinCommandFlashLights({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Honks the vehicle horn.
   * @return Promise to an object with response containing honk horn result
   */
  public async honkHorn() {
    const { data } = await postApi1VehiclesByVinCommandHonkHorn({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Skips to the next favorite in media playback.
   * @return Promise to an object with response containing media next favorite result
   */
  public async mediaNextFavorite() {
    const { data } = await postApi1VehiclesByVinCommandMediaNextFav({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Skips to the next track in media playback.
   * @return Promise to an object with response containing media next track result
   */
  public async mediaNextTrack() {
    const { data } = await postApi1VehiclesByVinCommandMediaNextTrack({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Skips to the previous favorite in media playback.
   * @return Promise to an object with response containing media previous favorite result
   */
  public async mediaPreviousFavorite() {
    const { data } = await postApi1VehiclesByVinCommandMediaPrevFav({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Skips to the previous track in media playback.
   * @return Promise to an object with response containing media previous track result
   */
  public async mediaPreviousTrack() {
    const { data } = await postApi1VehiclesByVinCommandMediaPrevTrack({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Toggles media playback on/off.
   * @return Promise to an object with response containing media toggle playback result
   */
  public async mediaTogglePlayback() {
    const { data } = await postApi1VehiclesByVinCommandMediaTogglePlayback({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Turns down the media volume.
   * @return Promise to an object with response containing media volume down result
   */
  public async mediaVolumeDown() {
    const { data } = await postApi1VehiclesByVinCommandMediaVolumeDown({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Starts the vehicle remotely.
   * @return Promise to an object with response containing remote start result
   */
  public async remoteStart() {
    const { data } = await postApi1VehiclesByVinCommandRemoteStartDrive({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Resets the valet PIN.
   * @return Promise to an object with response containing valet pin reset result
   */
  public async resetValetPin() {
    const { data } = await postApi1VehiclesByVinCommandResetValetPin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets the vehicle name.
   * @param vehicle_name The new vehicle name
   * @return Promise to an object with response containing vehicle name set result
   */
  public async setVehicleName(vehicle_name: string) {
    const { data } = await postApi1VehiclesByVinCommandSetVehicleName({
      body: { vehicle_name },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Triggers HomeLink (garage door opener or gate).
   * @param lat Latitude
   * @param lon Longitude
   * @return Promise to an object with response containing homelink trigger result
   */
  public async triggerHomelink(lat: number, lon: number) {
    const { data } = await postApi1VehiclesByVinCommandTriggerHomelink({
      body: { lat, lon },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Controls vehicle windows.
   * @param command The window control command
   * @param lat Latitude
   * @param lon Longitude
   * @return Promise to an object with response containing window control result
   */
  public async windowControl(
    command: "vent" | "close",
    lat: number,
    lon: number,
  ) {
    const { data } = await postApi1VehiclesByVinCommandWindowControl({
      body: { command, lat, lon },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Controls the sunroof on sunroof-enabled vehicles.
   * @param state The sunroof state
   * @return Promise to an object with response containing sunroof control result
   */
  public async sunRoofControl(state: "vent" | "close" | "stop") {
    const { data } = await postApi1VehiclesByVinCommandSunRoofControl({
      body: { state },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Climate Commands
  // --------------------------------------------------------------------------------

  /**
   * Sets the target temperature for the driver and passenger.
   * @param driver_temp Driver temperature in Celsius
   * @param passenger_temp Passenger temperature in Celsius
   * @return Promise to an object with response containing temperature set result
   */
  public async setTemps(driver_temp: number, passenger_temp: number) {
    const { data } = await postApi1VehiclesByVinCommandSetTemps({
      body: { driver_temp, passenger_temp },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets the climate keeper mode.
   * @param climate_keeper_mode The climate keeper mode
   * @return Promise to an object with response containing climate keeper mode set result
   */
  public async setClimateKeeperMode(climate_keeper_mode: 0 | 1 | 2 | 3) {
    const { data } = await postApi1VehiclesByVinCommandSetClimateKeeperMode({
      body: { climate_keeper_mode },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Turns bioweapon defense mode on or off.
   * @param on Whether to enable bioweapon defense mode
   * @return Promise to an object with response containing bioweapon defense mode set result
   */
  public async setBioweaponDefenseMode(on: boolean, manual_override: boolean) {
    const { data } = await postApi1VehiclesByVinCommandSetBioweaponMode({
      body: { on, manual_override },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Starts or stops preconditioning at maximum power.
   * @param on Whether to enable preconditioning max
   * @param manual_override Whether to manually override
   * @return Promise to an object with response containing preconditioning max set result
   */
  public async setPreconditioningMax(on: boolean, manual_override: boolean) {
    const { data } = await postApi1VehiclesByVinCommandSetPreconditioningMax({
      body: { on, manual_override },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Turns automatic seat heating/cooling on or off.
   * @param auto_seat_position The seat position
   * @param auto_climate_on Whether to enable auto climate
   * @return Promise to an object with response containing auto seat climate set result
   */
  public async setAutoSeatClimate(
    auto_seat_position: keyof typeof FRONT_SEATS,
    auto_climate_on: boolean,
  ) {
    const { data } =
      await postApi1VehiclesByVinCommandRemoteAutoSeatClimateRequest({
        body: {
          auto_seat_position: FRONT_SEATS[auto_seat_position],
          auto_climate_on,
        },
        path: { vin: this.vin },
        client: this.root.client,
      });
    return data;
  }

  /**
   * Turns automatic steering wheel heating on or off.
   * @param auto_steering_wheel_heat_on Whether to enable auto steering wheel heat
   * @return Promise to an object with response containing auto steering wheel heat set result
   */
  public async setAutoSteeringWheelHeat(on: boolean) {
    const { data } =
      await postApi1VehiclesByVinCommandRemoteAutoSteeringWheelHeatClimateRequest(
        {
          body: { on },
          path: { vin: this.vin },
          client: this.root.client,
        },
      );
    return data;
  }

  /**
   * Sets seat cooler level.
   * @param seat_position The seat position
   * @param seat_cooler_level The cooler level
   * @return Promise to an object with response containing seat cooler set result
   */
  public async setSeatCooler(
    seat_position: keyof typeof FRONT_SEATS,
    seat_cooler_level: number,
  ) {
    const { data } = await postApi1VehiclesByVinCommandRemoteSeatCoolerRequest({
      body: {
        seat_position: FRONT_SEATS[seat_position],
        seat_cooler_level,
      },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets seat heater level.
   * @param heater The heater position
   * @param level The heater level
   * @return Promise to an object with response containing seat heater set result
   */
  public async setSeatHeater(seat: keyof typeof ALL_SEATS, level: number) {
    const { data } = await postApi1VehiclesByVinCommandRemoteSeatHeaterRequest({
      body: {
        heater: ALL_SEATS[seat],
        level,
      },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Turns steering wheel heater on or off.
   * @param on Whether to turn on the steering wheel heater
   * @return Promise to an object with response containing steering wheel heater set result
   */
  public async setSteeringWheelHeater(on: boolean) {
    const { data } =
      await postApi1VehiclesByVinCommandRemoteSteeringWheelHeaterRequest({
        body: { on },
        path: { vin: this.vin },
        client: this.root.client,
      });
    return data;
  }

  /**
   * Sets steering wheel heater level.
   * @param level The heater level
   * @return Promise to an object with response containing steering wheel heat level set result
   */
  public async setSteeringWheelHeatLevel(level: 0 | 1 | 3) {
    const { data } =
      await postApi1VehiclesByVinCommandRemoteSteeringWheelHeatLevelRequest({
        body: { level },
        path: { vin: this.vin },
        client: this.root.client,
      });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Charging Commands
  // --------------------------------------------------------------------------------

  /**
   * Sets the charge limit to max range.
   * @return Promise to an object with response containing charge max range result
   */
  public async chargeMaxRange() {
    const { data } = await postApi1VehiclesByVinCommandChargeMaxRange({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Closes the charge port door.
   * @return Promise to an object with response containing charge port close result
   */
  public async closeChargePort() {
    const { data } = await postApi1VehiclesByVinCommandChargePortDoorClose({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Opens the charge port door.
   * @return Promise to an object with response containing charge port open result
   */
  public async openChargePort() {
    const { data } = await postApi1VehiclesByVinCommandChargePortDoorOpen({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets the charge limit to standard range.
   * @return Promise to an object with response containing charge standard result
   */
  public async chargeStandard() {
    const { data } = await postApi1VehiclesByVinCommandChargeStandard({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Starts charging the vehicle.
   * @return Promise to an object with response containing charge start result
   */
  public async startCharging() {
    const { data } = await postApi1VehiclesByVinCommandChargeStart({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Stops charging the vehicle.
   * @return Promise to an object with response containing charge stop result
   */
  public async stopCharging() {
    const { data } = await postApi1VehiclesByVinCommandChargeStop({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets the charge limit.
   * @param percent The charge limit percentage
   * @return Promise to an object with response containing charge limit set result
   */
  public async setChargeLimit(percent: number) {
    const { data } = await postApi1VehiclesByVinCommandSetChargeLimit({
      body: { percent },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets the charging amps.
   * @param charging_amps The charging amps value
   * @return Promise to an object with response containing charging amps set result
   */
  public async setChargingAmps(charging_amps: number) {
    const { data } = await postApi1VehiclesByVinCommandSetChargingAmps({
      body: { charging_amps },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets scheduled charging.
   * @param enable Whether to enable scheduled charging
   * @param time The scheduled charging time
   * @return Promise to an object with response containing scheduled charging set result
   */
  public async setScheduledCharging(enable: boolean, time: number) {
    const { data } = await postApi1VehiclesByVinCommandSetScheduledCharging({
      body: { enable, time },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets scheduled departure.
   * @param body The scheduled departure configuration
   * @return Promise to an object with response containing scheduled departure set result
   */
  public async setScheduledDeparture(
    body: PostApi1VehiclesByVinCommandSetScheduledDepartureData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCommandSetScheduledDeparture({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Adds a charge schedule.
   * @param body The charge schedule configuration
   * @return Promise to an object with response containing add charge schedule result
   */
  public async addChargeSchedule(
    body: PostApi1VehiclesByVinCommandAddChargeScheduleData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCommandAddChargeSchedule({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Removes a charge schedule.
   * @param id The schedule ID to remove
   * @return Promise to an object with response containing remove charge schedule result
   */
  public async removeChargeSchedule(id: number) {
    const { data } = await postApi1VehiclesByVinCommandRemoveChargeSchedule({
      body: { id },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Schedules
  // --------------------------------------------------------------------------------

  /**
   * Adds a precondition schedule.
   * @param body The precondition schedule configuration
   * @return Promise to an object with response containing add precondition schedule result
   */
  public async addPreconditionSchedule(
    body: PostApi1VehiclesByVinCommandAddPreconditionScheduleData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCommandAddPreconditionSchedule({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Removes a precondition schedule.
   * @param id The schedule ID to remove
   * @return Promise to an object with response containing remove precondition schedule result
   */
  public async removePreconditionSchedule(id: number) {
    const { data } =
      await postApi1VehiclesByVinCommandRemovePreconditionSchedule({
        body: { id },
        path: { vin: this.vin },
        client: this.root.client,
      });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Overheat Protection
  // --------------------------------------------------------------------------------

  /**
   * Sets cabin overheat protection.
   * @param body The cabin overheat protection configuration
   * @return Promise to an object with response containing cabin overheat protection set result
   */
  public async setCabinOverheatProtection(
    body: PostApi1VehiclesByVinCommandSetCabinOverheatProtectionData["body"],
  ) {
    const { data } =
      await postApi1VehiclesByVinCommandSetCabinOverheatProtection({
        body,
        path: { vin: this.vin },
        client: this.root.client,
      });
    return data;
  }

  /**
   * Sets the cabin overheat protection temperature.
   * @param cop_temp The cabin overheat protection temperature (0=Low, 1=Medium, 2=High)
   * @return Promise to an object with response containing cabin overheat protection temperature set result
   */
  public async setCopTemp(cop_temp: 0 | 1 | 2) {
    const { data } = await postApi1VehiclesByVinCommandSetCopTemp({
      body: { cop_temp },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Sentry Mode
  // --------------------------------------------------------------------------------

  /**
   * Sets sentry mode.
   * @param on Whether to enable sentry mode
   * @return Promise to an object with response containing sentry mode set result
   */
  public async setSentryMode(on: boolean) {
    const { data } = await postApi1VehiclesByVinCommandSetSentryMode({
      body: { on },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Valet Mode
  // --------------------------------------------------------------------------------

  /**
   * Sets valet mode.
   * @param on Whether to enable valet mode
   * @param password The valet mode password
   * @return Promise to an object with response containing valet mode set result
   */
  public async setValetMode(on: boolean, password: string) {
    const { data } = await postApi1VehiclesByVinCommandSetValetMode({
      body: { on, password },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // PIN to Drive
  // --------------------------------------------------------------------------------

  /**
   * Sets PIN to drive.
   * @param on Whether to enable PIN to drive
   * @param password The PIN password
   * @return Promise to an object with response containing PIN to drive set result
   */
  public async setPinToDrive(on: boolean, password: string) {
    const { data } = await postApi1VehiclesByVinCommandSetPinToDrive({
      body: { on, password },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Clears PIN to Drive admin mode.
   * @return Promise to an object with response containing PIN to Drive admin clear result
   */
  public async clearPinToDriveAdmin() {
    const { data } = await postApi1VehiclesByVinCommandClearPinToDriveAdmin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Resets the PIN to Drive PIN.
   * @return Promise to an object with response containing PIN to Drive reset result
   */
  public async resetPinToDrive() {
    const { data } = await postApi1VehiclesByVinCommandResetPinToDrivePin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Speed Limit
  // --------------------------------------------------------------------------------

  /**
   * Activates speed limit.
   * @param pin The PIN for speed limit
   * @return Promise to an object with response containing speed limit activation result
   */
  public async speedLimitActivate(pin: string) {
    const { data } = await postApi1VehiclesByVinCommandSpeedLimitActivate({
      body: { pin },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Deactivates speed limit.
   * @param pin The PIN for speed limit
   * @return Promise to an object with response containing speed limit deactivation result
   */
  public async speedLimitDeactivate(pin: string) {
    const { data } = await postApi1VehiclesByVinCommandSpeedLimitDeactivate({
      body: { pin },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Clears speed limit PIN.
   * @param pin The PIN for speed limit
   * @return Promise to an object with response containing speed limit PIN clear result
   */
  public async speedLimitClearPin(pin: string) {
    const { data } = await postApi1VehiclesByVinCommandSpeedLimitClearPin({
      body: { pin },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Clears speed limit PIN admin mode.
   * @return Promise to an object with response containing speed limit PIN admin clear result
   */
  public async speedLimitClearPinAdmin() {
    const { data } = await postApi1VehiclesByVinCommandSpeedLimitClearPinAdmin({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets speed limit.
   * @param limit_mph The speed limit in mph
   * @return Promise to an object with response containing speed limit set result
   */
  public async speedLimitSetLimit(limit_mph: number) {
    const { data } = await postApi1VehiclesByVinCommandSpeedLimitSetLimit({
      body: { limit_mph },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Software Update
  // --------------------------------------------------------------------------------

  /**
   * Schedules software update.
   * @param offset_sec The offset in seconds for the update
   * @return Promise to an object with response containing software update schedule result
   */
  public async scheduleSoftwareUpdate(offset_sec: number) {
    const { data } = await postApi1VehiclesByVinCommandScheduleSoftwareUpdate({
      body: { offset_sec },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Cancels a software update.
   * @return Promise to an object with response containing software update cancel result
   */
  public async cancelSoftwareUpdate() {
    const { data } = await postApi1VehiclesByVinCommandCancelSoftwareUpdate({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------------

  /**
   * Sends a navigation request.
   * @param body The navigation request configuration
   * @return Promise to an object with response containing navigation request result
   */
  public async navigationRequest(
    body: PostApi1VehiclesByVinCommandNavigationRequestData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCommandNavigationRequest({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sends a navigation GPS request.
   * @param body The GPS navigation request configuration
   * @return Promise to an object with response containing navigation GPS request result
   */
  public async navigationGpsRequest(
    body: PostApi1VehiclesByVinCommandNavigationGpsRequestData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCommandNavigationGpsRequest({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sends a navigation supercharger request.
   * @param body The supercharger navigation request configuration
   * @return Promise to an object with response containing navigation supercharger request result
   */
  public async navigationSuperchargerRequest(
    body: PostApi1VehiclesByVinCommandNavigationScRequestData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCommandNavigationScRequest({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sends a navigation waypoints request.
   * @param body The waypoints navigation request configuration
   * @return Promise to an object with response containing navigation waypoints request result
   */
  public async navigationWaypointsRequest(
    body: PostApi1VehiclesByVinCommandNavigationWaypointsRequestData["body"],
  ) {
    const { data } =
      await postApi1VehiclesByVinCommandNavigationWaypointsRequest({
        body,
        path: { vin: this.vin },
        client: this.root.client,
      });
    return data;
  }

  /**
   * Syncs upcoming calendar entries to the vehicle.
   * @param calendar_data The calendar data
   * @return Promise to an object with response containing upcoming calendar entries result
   */
  public async upcomingCalendarEntries(
    calendar_data: PostApi1VehiclesByVinCommandUpcomingCalendarEntriesData["body"]["calendar_data"],
  ) {
    const { data } = await postApi1VehiclesByVinCommandUpcomingCalendarEntries({
      body: { calendar_data },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Sharing & Drivers
  // --------------------------------------------------------------------------------

  /**
   * Fetches drivers associated with a vehicle.
   * @return Promise to an object with response containing vehicle drivers
   */
  public async getDrivers() {
    const { data } = await getApi1VehiclesByVinDrivers({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("drivers", data);
    return data;
  }

  /**
   * Removes a driver.
   * @param share_user_id The driver to remove
   * @return Promise to an object with response containing remove driver result
   */
  public async removeDriver(share_user_id: string) {
    const { data } = await deleteApi1VehiclesByVinDrivers({
      query: { share_user_id },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Gets invitations.
   * @return Promise to an object with response containing invitations
   */
  public async getInvitations() {
    const { data } = await getApi1VehiclesByVinInvitations({
      path: { vin: this.vin },
      client: this.root.client,
    });
    this.emit("invitations", data);
    return data;
  }

  /**
   * Creates a vehicle share invitation.
   * @return Promise to an object with response containing invitation creation result
   */
  public async createInvitation() {
    const { data } = await postApi1VehiclesByVinInvitations({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Revokes a share invitation.
   * @param id The invitation ID to revoke
   * @return Promise to an object with response containing invitation revocation result
   */
  public async revokeInvitation(id: string) {
    const { data } = await postApi1VehiclesByVinInvitationsByIdRevoke({
      path: { id, vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  // --------------------------------------------------------------------------------
  // Custom Commands
  // --------------------------------------------------------------------------------

  /**
   * Sends a ping command to the vehicle.
   * @return Promise to an object with response containing ping result
   */
  public async ping() {
    const { data } = await postApi1VehiclesByVinCustomCommandPing({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sends a closure command.
   * @param body The closure configuration
   * @return Promise to an object with response containing closure result
   */
  public async closure(
    body: PostApi1VehiclesByVinCustomCommandClosureData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCustomCommandClosure({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Sets multiple seat heaters simultaneously.
   * @param body The seat heaters configuration
   * @return Promise to an object with response containing seat heaters set result
   */
  public async setSeatHeaters(
    body: PostApi1VehiclesByVinCustomCommandSeatHeaterData["body"],
  ) {
    const { data } = await postApi1VehiclesByVinCustomCommandSeatHeater({
      body,
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Enables or disables charging on solar.
   * @param enabled Whether to enable charging on solar
   * @param lowerChargeLimit Lower charge limit for solar charging
   * @param upperChargeLimit Upper charge limit for solar charging
   * @return Promise to an object with response containing charge on solar result
   */
  public async chargeOnSolar(
    enabled?: boolean,
    lowerChargeLimit?: number,
    upperChargeLimit?: number,
  ) {
    const { data } = await postApi1VehiclesByVinCustomCommandChargeOnSolar({
      body: {
        enabled,
        lowerChargeLimit,
        upperChargeLimit,
      },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Saves dashcam footage.
   * @return Promise to an object with response containing dashcam save result
   */
  public async dashcamSave() {
    const { data } = await postApi1VehiclesByVinCustomCommandDashcamSave({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Plays video on the vehicle screen.
   * @param url The url of the video
   * @return Promise to an object with response containing video play result
   */
  public async playVideo(url: string) {
    const { data } = await postApi1VehiclesByVinCustomCommandPlayVideo({
      body: { url },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Stops the currently playing light show.
   * @return Promise to an object with response containing light show stop result
   */
  public async stopLightShow() {
    const { data } = await postApi1VehiclesByVinCustomCommandStopLightShow({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Starts a light show.
   * @param show_index The light show index
   * @param start_time Optional start time for the light show
   * @param volume Optional volume level for the light show
   * @param dance_moves Optional flag to enable dance moves
   * @return Promise to an object with response containing light show start result
   */
  public async startLightShow(
    show_index: number,
    start_time?: number,
    volume?: number,
    dance_moves?: boolean,
  ) {
    const { data } = await postApi1VehiclesByVinCustomCommandStartLightShow({
      body: {
        show_index,
        start_time,
        volume,
        dance_moves,
      },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Clears PIN to Drive mode.
   * @param pin 4 digit pin as a string
   * @return Promise to an object with response containing PIN to Drive clear result
   */
  public async clearPinToDrive(pin: string) {
    const { data } = await postApi1VehiclesByVinCustomCommandClearPinToDrive({
      body: {
        pin,
      },
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Removes all impermanent keys from the vehicle.
   * @return Promise to an object with response containing impermanent key removal result
   */
  public async removeAllImpermanentKeys() {
    const { data } = await postApi1VehiclesByVinCustomCommandRemoveKey({
      path: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns eligible vehicle subscriptions.
   * @return Promise to an object with response containing eligible subscriptions
   */
  public async getEligibleSubscriptions() {
    const { data } = await getApi1DxVehiclesSubscriptionsEligible({
      query: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns eligible vehicle upgrades.
   * @return Promise to an object with response containing eligible upgrades
   */
  public async getEligibleUpgrades() {
    const { data } = await getApi1DxVehiclesUpgradeEligibility({
      query: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns vehicle option details.
   * @return Promise to an object with response containing vehicle options
   */
  public async getVehicleOptions() {
    const { data } = await getApi1DxVehiclesOptions({
      query: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }

  /**
   * Returns warranty information for the vehicle.
   * @return Promise to an object with response containing warranty details
   */
  public async getWarrantyDetails() {
    const { data } = await getApi1DxWarrantyDetails({
      query: { vin: this.vin },
      client: this.root.client,
    });
    return data;
  }
}

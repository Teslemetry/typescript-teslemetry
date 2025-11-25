import { Teslemetry } from "./Teslemetry";
import {
  // Vehicle Data
  getApi1VehiclesByVinVehicleData,
  getApi1VehiclesByVin,
  getApiRefreshByVin,
  getApiImageByVin,
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
} from "./client";
import {
  PostApi1VehiclesByVinCommandSetChargeLimitData,
  PostApi1VehiclesByVinCommandSetChargingAmpsData,
  PostApi1VehiclesByVinCommandSetScheduledChargingData,
  PostApi1VehiclesByVinCommandSetScheduledDepartureData,
  PostApi1VehiclesByVinCommandAddChargeScheduleData,
  PostApi1VehiclesByVinCommandRemoveChargeScheduleData,
  PostApi1VehiclesByVinCommandAddPreconditionScheduleData,
  PostApi1VehiclesByVinCommandRemovePreconditionScheduleData,
  PostApi1VehiclesByVinCommandSetCabinOverheatProtectionData,
  PostApi1VehiclesByVinCommandSetCopTempData,
  PostApi1VehiclesByVinCommandSetSentryModeData,
  PostApi1VehiclesByVinCommandSetValetModeData,
  PostApi1VehiclesByVinCommandSetPinToDriveData,
  PostApi1VehiclesByVinCommandSpeedLimitActivateData,
  PostApi1VehiclesByVinCommandSpeedLimitDeactivateData,
  PostApi1VehiclesByVinCommandSpeedLimitClearPinData,
  PostApi1VehiclesByVinCommandSpeedLimitSetLimitData,
  PostApi1VehiclesByVinCommandScheduleSoftwareUpdateData,
  PostApi1VehiclesByVinCommandNavigationRequestData,
  PostApi1VehiclesByVinCommandNavigationGpsRequestData,
  PostApi1VehiclesByVinCommandNavigationScRequestData,
  PostApi1VehiclesByVinCommandNavigationWaypointsRequestData,
  DeleteApi1VehiclesByVinDriversData,
  PostApi1VehiclesByVinInvitationsData,
  PostApi1VehiclesByVinCustomCommandClosureData,
  PostApi1VehiclesByVinCustomCommandSeatHeaterData,
  PostApi1VehiclesByVinCustomCommandChargeOnSolarData,
  PostApi1VehiclesByVinCustomCommandPlayVideoData,
  PostApi1VehiclesByVinCustomCommandStartLightShowData,
  PostApi1VehiclesByVinCustomCommandClearPinToDriveData,
  PatchApiConfigByVinData,
  PostApiConfigByVinData,
  GetApi1VehiclesByVinVehicleDataData,
  GetApi1VehiclesByVinFleetTelemetryErrorsData,
  GetApi1VehiclesByVinInvitationsData,
} from "./client/types.gen";

const SEATS = { front_left: 1, front_right: 2 } as const;

export class TeslemetryVehicleApi {
  private root: Teslemetry;
  public vin: string;

  constructor(root: Teslemetry, vin: string) {
    this.root = root;
    this.vin = vin;
  }

  // --------------------------------------------------------------------------------
  // Vehicle Data
  // --------------------------------------------------------------------------------
  /**
   * Returns the cached vehicle data for this vehicle.
   * @param query.endpoints - A comma-separated list of endpoints to retrieve data for.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async vehicleData(query?: GetApi1VehiclesByVinVehicleDataData) {
    return getApi1VehiclesByVinVehicleData({
      ...query,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Data about the vehicle
   * @returns A promise that resolves to a data object containing the response.
   */
  public async get() {
    return getApi1VehiclesByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Refresh the cached vehicle data immediately. Consumes 2 command credits.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async refreshData() {
    return getApiRefreshByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Redirect to the Tesla Design Studio image of a vehicle
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getImage() {
    return getApiImageByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Get the saved vehicle config.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getVehicleConfig() {
    return getApiVehicleConfigByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Get the streaming configuration for a specific vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getConfig() {
    return getApiConfigByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Modify the streaming configuration for a specific vehicle.
   * @param body The request body.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async patchConfig(body: PatchApiConfigByVinData) {
    return patchApiConfigByVin({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Modify the streaming configuration for a specific vehicle.
   * @param body The request body.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async postConfig(body: PostApiConfigByVinData) {
    return postApiConfigByVin({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Stop streaming data from a specific vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async deleteConfig() {
    return deleteApiConfigByVin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns whether or not mobile access is enabled for the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getMobileEnabled() {
    return getApi1VehiclesByVinMobileEnabled({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns the charging sites near the current location of the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getNearbyChargingSites() {
    return getApi1VehiclesByVinNearbyChargingSites({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * List of recent alerts
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getRecentAlerts() {
    return getApi1VehiclesByVinRecentAlerts({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns firmware release notes.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getReleaseNotes() {
    return getApi1VehiclesByVinReleaseNotes({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Fetches information about the service status of the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getServiceData() {
    return getApi1VehiclesByVinServiceData({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Wakes the vehicle from sleep. **This command costs 20 command credits**
   * @returns A promise that resolves to a data object containing the response.
   */
  public async wakeUp() {
    return wakeUp({ path: { vin: this.vin }, client: this.root.client });
  }

  // --------------------------------------------------------------------------------
  // Fleet Telemetry
  // --------------------------------------------------------------------------------
  /**
   * Fetches a vehicle's fleet telemetry config.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getFleetTelemetryConfig() {
    return getApi1VehiclesByVinFleetTelemetryConfig({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Stop Fleet Telemetry
   * @returns A promise that resolves to a data object containing the response.
   */
  public async deleteFleetTelemetryConfig() {
    return deleteApi1VehiclesByVinFleetTelemetryConfig({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns recent fleet telemetry errors reported for the specified vehicle.
   * @param query.type - The type of error to filter by.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getFleetTelemetryErrors(
    query?: GetApi1VehiclesByVinFleetTelemetryErrorsData,
  ) {
    return getApi1VehiclesByVinFleetTelemetryErrors({
      ...query,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Vehicle Commands
  // --------------------------------------------------------------------------------
  /**
   * Controls the front or rear trunk.
   * @param which_trunk The trunk to actuate.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async actuateTrunk(which_trunk: "front" | "rear") {
    return postApi1VehiclesByVinCommandActuateTrunk({
      body: { which_trunk },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Adjusts vehicle media playback volume.
   * @param volume The volume level.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async adjustVolume(volume: number) {
    return postApi1VehiclesByVinCommandAdjustVolume({
      body: { volume },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Starts climate preconditioning.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async startAutoConditioning() {
    return postApi1VehiclesByVinCommandAutoConditioningStart({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Stops climate preconditioning.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async stopAutoConditioning() {
    return postApi1VehiclesByVinCommandAutoConditioningStop({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Locks the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async lockDoors() {
    return postApi1VehiclesByVinCommandDoorLock({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Unlocks the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async unlockDoors() {
    return postApi1VehiclesByVinCommandDoorUnlock({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Erases user's data from the user interface.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async eraseUserData() {
    return postApi1VehiclesByVinCommandEraseUserData({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Briefly flashes the vehicle headlights.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async flashLights() {
    return postApi1VehiclesByVinCommandFlashLights({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Honks the vehicle horn.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async honkHorn() {
    return postApi1VehiclesByVinCommandHonkHorn({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Advances media player to next favorite track.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async mediaNextFavorite() {
    return postApi1VehiclesByVinCommandMediaNextFav({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Advances media player to next track.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async mediaNextTrack() {
    return postApi1VehiclesByVinCommandMediaNextTrack({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Advances media player to previous favorite track.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async mediaPreviousFavorite() {
    return postApi1VehiclesByVinCommandMediaPrevFav({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Advances media player to previous track.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async mediaPreviousTrack() {
    return postApi1VehiclesByVinCommandMediaPrevTrack({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Toggles current play/pause state.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async mediaTogglePlayback() {
    return postApi1VehiclesByVinCommandMediaTogglePlayback({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Turns the volume down by one.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async mediaVolumeDown() {
    return postApi1VehiclesByVinCommandMediaVolumeDown({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Starts the vehicle remotely.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async remoteStart() {
    return postApi1VehiclesByVinCommandRemoteStartDrive({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Removes PIN for Valet Mode.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async resetValetPin() {
    return postApi1VehiclesByVinCommandResetValetPin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Changes the name of a vehicle.
   * @param vehicle_name The new name for the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setVehicleName(vehicle_name: string) {
    return postApi1VehiclesByVinCommandSetVehicleName({
      body: { vehicle_name },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Turns on HomeLink (used to open and close garage doors).
   * @param lat The latitude of the location.
   * @param lon The longitude of the location.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async triggerHomelink(lat: number, lon: number) {
    return postApi1VehiclesByVinCommandTriggerHomelink({
      body: { lat, lon },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Control the windows of a parked vehicle.
   * @param command The command to send to the windows.
   * @param lat The latitude of the location.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async windowControl(command: "vent" | "close", lat?: number) {
    return postApi1VehiclesByVinCommandWindowControl({
      body: { command, lat },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Climate Commands
  // --------------------------------------------------------------------------------
  /**
   * Sets the driver and/or passenger-side cabin temperature.
   * @param driver_temp The driver's side temperature.
   * @param passenger_temp The passenger's side temperature.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setTemps(driver_temp: number, passenger_temp: number) {
    return postApi1VehiclesByVinCommandSetTemps({
      body: { driver_temp, passenger_temp },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Enables climate keeper mode.
   * @param climate_keeper_mode The climate keeper mode to set.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setClimateKeeperMode(climate_keeper_mode: 0 | 1 | 2 | 3) {
    return postApi1VehiclesByVinCommandSetClimateKeeperMode({
      body: { climate_keeper_mode },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Turns Bioweapon Defense Mode on and off.
   * @param on Whether to turn on Bioweapon Defense Mode.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setBioweaponDefenseMode(on: boolean, manual_override: boolean) {
    return postApi1VehiclesByVinCommandSetBioweaponMode({
      body: { on, manual_override },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets an override for preconditioning.
   * @param on Whether to turn on preconditioning.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setPreconditioningMax(
    on: boolean,
    manual_override: boolean = true,
  ) {
    return postApi1VehiclesByVinCommandSetPreconditioningMax({
      body: { on, manual_override },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets automatic seat heating and cooling.
   * @param auto_seat_position The seat to control.
   * @param on Whether to turn on auto seat climate.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setAutoSeatClimate(
    auto_seat_position: "front_left" | "front_right",
    on: boolean,
  ) {
    return postApi1VehiclesByVinCommandRemoteAutoSeatClimateRequest({
      body: { auto_seat_position: SEATS[auto_seat_position], on },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets automatic steering wheel heating on/off.
   * @param on Whether to turn on auto steering wheel heat.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setAutoSteeringWheelHeat(on: boolean) {
    return postApi1VehiclesByVinCommandRemoteAutoSteeringWheelHeatClimateRequest(
      { body: { on }, path: { vin: this.vin }, client: this.root.client },
    );
  }

  /**
   * Sets seat cooling.
   * @param seat_position The seat to control.
   * @param level The cooling level.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setSeatCooler(
    seat_position: "front_left" | "front_right",
    level: 0 | 1 | 2 | 3,
  ) {
    return postApi1VehiclesByVinCommandRemoteSeatCoolerRequest({
      body: { seat_position: SEATS[seat_position], level },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets seat heating.
   * @param heater The heater to control.
   * @param level The heating level.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setSeatHeater(
    heater: 0 | 1 | 2 | 3 | 4 | 5,
    level: 0 | 1 | 2 | 3,
  ) {
    return postApi1VehiclesByVinCommandRemoteSeatHeaterRequest({
      body: { heater, level },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets steering wheel heating on/off.
   * @param on Whether to turn on the steering wheel heater.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setSteeringWheelHeater(on: boolean) {
    return postApi1VehiclesByVinCommandRemoteSteeringWheelHeaterRequest({
      body: { on },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets steering wheel heat level.
   * @param level The heating level.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setSteeringWheelHeatLevel(level: 0 | 1 | 3) {
    return postApi1VehiclesByVinCommandRemoteSteeringWheelHeatLevelRequest({
      body: { level },
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Charging Commands
  // --------------------------------------------------------------------------------
  /**
   * Charges in max range mode.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async chargeMaxRange() {
    return postApi1VehiclesByVinCommandChargeMaxRange({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Closes the charge port door.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async closeChargePort() {
    return postApi1VehiclesByVinCommandChargePortDoorClose({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Opens the charge port door.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async openChargePort() {
    return postApi1VehiclesByVinCommandChargePortDoorOpen({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Charges in Standard mode.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async chargeStandard() {
    return postApi1VehiclesByVinCommandChargeStandard({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Starts charging the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async startCharging() {
    return postApi1VehiclesByVinCommandChargeStart({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Stops charging the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async stopCharging() {
    return postApi1VehiclesByVinCommandChargeStop({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets the charge limit.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setChargeLimit(
    body: PostApi1VehiclesByVinCommandSetChargeLimitData,
  ) {
    return postApi1VehiclesByVinCommandSetChargeLimit({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets the vehicle charging amps.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setChargingAmps(
    body: PostApi1VehiclesByVinCommandSetChargingAmpsData,
  ) {
    return postApi1VehiclesByVinCommandSetChargingAmps({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets a time at which charging should be completed.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setScheduledCharging(
    body: PostApi1VehiclesByVinCommandSetScheduledChargingData,
  ) {
    return postApi1VehiclesByVinCommandSetScheduledCharging({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets a time at which departure should be completed.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setScheduledDeparture(
    body: PostApi1VehiclesByVinCommandSetScheduledDepartureData,
  ) {
    return postApi1VehiclesByVinCommandSetScheduledDeparture({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Add or modify a schedule for vehicle charging.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async addChargeSchedule(
    body: PostApi1VehiclesByVinCommandAddChargeScheduleData,
  ) {
    return postApi1VehiclesByVinCommandAddChargeSchedule({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Remove a charge schedule by ID.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async removeChargeSchedule(
    body: PostApi1VehiclesByVinCommandRemoveChargeScheduleData,
  ) {
    return postApi1VehiclesByVinCommandRemoveChargeSchedule({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Schedules
  // --------------------------------------------------------------------------------
  /**
   * Add or modify a preconditioning schedule.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async addPreconditionSchedule(
    body: PostApi1VehiclesByVinCommandAddPreconditionScheduleData,
  ) {
    return postApi1VehiclesByVinCommandAddPreconditionSchedule({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Remove a precondition schedule by ID.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async removePreconditionSchedule(
    body: PostApi1VehiclesByVinCommandRemovePreconditionScheduleData,
  ) {
    return postApi1VehiclesByVinCommandRemovePreconditionSchedule({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Overheat Protection
  // --------------------------------------------------------------------------------
  /**
   * Sets the vehicle overheat protection.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setCabinOverheatProtection(
    body: PostApi1VehiclesByVinCommandSetCabinOverheatProtectionData,
  ) {
    return postApi1VehiclesByVinCommandSetCabinOverheatProtection({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Adjusts the Cabin Overheat Protection temperature (COP).
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setCopTemp(body: PostApi1VehiclesByVinCommandSetCopTempData) {
    return postApi1VehiclesByVinCommandSetCopTemp({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Sentry Mode
  // --------------------------------------------------------------------------------
  /**
   * Enables and disables Sentry Mode.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setSentryMode(
    body: PostApi1VehiclesByVinCommandSetSentryModeData,
  ) {
    return postApi1VehiclesByVinCommandSetSentryMode({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Valet Mode
  // --------------------------------------------------------------------------------
  /**
   * Turns on Valet Mode.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setValetMode(
    body: PostApi1VehiclesByVinCommandSetValetModeData,
  ) {
    return postApi1VehiclesByVinCommandSetValetMode({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // PIN to Drive
  // --------------------------------------------------------------------------------
  /**
   * Sets a four-digit passcode for PIN to Drive.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setPinToDrive(
    body: PostApi1VehiclesByVinCommandSetPinToDriveData,
  ) {
    return postApi1VehiclesByVinCommandSetPinToDrive({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Deactivates PIN to Drive and resets the associated PIN.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async clearPinToDriveAdmin() {
    return postApi1VehiclesByVinCommandClearPinToDriveAdmin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Removes the PIN from PIN to Drive mode.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async resetPinToDrive() {
    return postApi1VehiclesByVinCommandResetPinToDrivePin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Speed Limit
  // --------------------------------------------------------------------------------
  /**
   * Activates Speed Limit Mode with a four-digit PIN.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async speedLimitActivate(
    body: PostApi1VehiclesByVinCommandSpeedLimitActivateData,
  ) {
    return postApi1VehiclesByVinCommandSpeedLimitActivate({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Deactivates Speed Limit Mode.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async speedLimitDeactivate(
    body: PostApi1VehiclesByVinCommandSpeedLimitDeactivateData,
  ) {
    return postApi1VehiclesByVinCommandSpeedLimitDeactivate({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Deactivates Speed Limit Mode and resets the associated PIN.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async speedLimitClearPin(
    body: PostApi1VehiclesByVinCommandSpeedLimitClearPinData,
  ) {
    return postApi1VehiclesByVinCommandSpeedLimitClearPin({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Deactivates Speed Limit Mode and resets the associated PIN for vehicles running firmware versions 2023.38+.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async speedLimitClearPinAdmin() {
    return postApi1VehiclesByVinCommandSpeedLimitClearPinAdmin({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets the maximum speed for Speed Limit Mode.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async speedLimitSetLimit(
    body: PostApi1VehiclesByVinCommandSpeedLimitSetLimitData,
  ) {
    return postApi1VehiclesByVinCommandSpeedLimitSetLimit({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Software Update
  // --------------------------------------------------------------------------------
  /**
   * Schedules a vehicle software update.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async scheduleSoftwareUpdate(
    body: PostApi1VehiclesByVinCommandScheduleSoftwareUpdateData,
  ) {
    return postApi1VehiclesByVinCommandScheduleSoftwareUpdate({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Cancels the countdown to install the vehicle software update.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async cancelSoftwareUpdate() {
    return postApi1VehiclesByVinCommandCancelSoftwareUpdate({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------------
  /**
   * Sends a location to the in-vehicle navigation system.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async navigationRequest(
    body: PostApi1VehiclesByVinCommandNavigationRequestData,
  ) {
    return postApi1VehiclesByVinCommandNavigationRequest({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Start navigation to given coordinates.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async navigationGpsRequest(
    body: PostApi1VehiclesByVinCommandNavigationGpsRequestData,
  ) {
    return postApi1VehiclesByVinCommandNavigationGpsRequest({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Start navigation to a supercharger.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async navigationSuperchargerRequest(
    body: PostApi1VehiclesByVinCommandNavigationScRequestData,
  ) {
    return postApi1VehiclesByVinCommandNavigationScRequest({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sends a list of waypoints to the vehicle's navigation system.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async navigationWaypointsRequest(
    body: PostApi1VehiclesByVinCommandNavigationWaypointsRequestData,
  ) {
    return postApi1VehiclesByVinCommandNavigationWaypointsRequest({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Sharing & Drivers
  // --------------------------------------------------------------------------------
  /**
   * Fetches drivers associated with a vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getDrivers() {
    return getApi1VehiclesByVinDrivers({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Removes driver access from a vehicle.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async removeDriver(body: DeleteApi1VehiclesByVinDriversData) {
    return deleteApi1VehiclesByVinDrivers({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns the active share invites for a vehicle.
   * @param query.after - The cursor for the next page of results.
   * @param query.limit - The maximum number of results to return.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getInvitations(query?: GetApi1VehiclesByVinInvitationsData) {
    return getApi1VehiclesByVinInvitations({
      ...query,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Creates a share invitation for the vehicle.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async createInvitation(body: PostApi1VehiclesByVinInvitationsData) {
    return postApi1VehiclesByVinInvitations({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Revokes a share invite.
   * @param id - The ID of the invitation to revoke.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async revokeInvitation(id: string) {
    return postApi1VehiclesByVinInvitationsByIdRevoke({
      path: { id, vin: this.vin },
      client: this.root.client,
    });
  }

  // --------------------------------------------------------------------------------
  // Custom Commands
  // --------------------------------------------------------------------------------
  /**
   * Performs a no-op on the vehicle.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async ping() {
    return postApi1VehiclesByVinCustomCommandPing({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Open, Close, Move and Stop the vehicle's windows, doors, and frunk/trunk.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async closure(body: PostApi1VehiclesByVinCustomCommandClosureData) {
    return postApi1VehiclesByVinCustomCommandClosure({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Sets multiple seat heaters at once.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async setSeatHeaters(
    body: PostApi1VehiclesByVinCustomCommandSeatHeaterData,
  ) {
    return postApi1VehiclesByVinCustomCommandSeatHeater({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Enable or disable charging on solar.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async chargeOnSolar(
    body: PostApi1VehiclesByVinCustomCommandChargeOnSolarData,
  ) {
    return postApi1VehiclesByVinCustomCommandChargeOnSolar({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Save the last 10 minutes of dashcam footage.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async dashcamSave() {
    return postApi1VehiclesByVinCustomCommandDashcamSave({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Play a supported video URL in the vehicle.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async playVideo(
    body: PostApi1VehiclesByVinCustomCommandPlayVideoData,
  ) {
    return postApi1VehiclesByVinCustomCommandPlayVideo({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Stop the currently playing light show.
   * @returns A promise that resolves to a data object containing the response.
   */
  public async stopLightShow() {
    return postApi1VehiclesByVinCustomCommandStopLightShow({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Start a light show on the vehicle.
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async startLightShow(
    body: PostApi1VehiclesByVinCustomCommandStartLightShowData,
  ) {
    return postApi1VehiclesByVinCustomCommandStartLightShow({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Deactivates PIN to Drive
   * @param body
   * @returns A promise that resolves to a data object containing the response.
   */
  public async clearPinToDrive(
    body: PostApi1VehiclesByVinCustomCommandClearPinToDriveData,
  ) {
    return postApi1VehiclesByVinCustomCommandClearPinToDrive({
      ...body,
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Remove all impermanent keys
   * @returns A promise that resolves to a data object containing the response.
   */
  public async removeAllImpermanentKeys() {
    return postApi1VehiclesByVinCustomCommandRemoveKey({
      path: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns eligible vehicle subscriptions.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getEligibleSubscriptions() {
    return getApi1DxVehiclesSubscriptionsEligible({
      query: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns eligibile vehicle upgrades.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getEligibleUpgrades() {
    return getApi1DxVehiclesUpgradeEligibility({
      query: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns vehicle option details.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getVehicleOptions() {
    return getApi1DxVehiclesOptions({
      query: { vin: this.vin },
      client: this.root.client,
    });
  }

  /**
   * Returns the warranty information for a vehicle.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getWarrantyDetails() {
    return getApi1DxWarrantyDetails({
      query: { vin: this.vin },
      client: this.root.client,
    });
  }
}

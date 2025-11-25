// Alert types - names for alerts
type Alert =
  | "POWER_REDUCED"
  | "BMS_high_voltage_immediate_action"
  | "BMS_low_voltage_immediate_action"
  | "BMS_over_current"
  | "BMS_cell_imbalance"
  | "BMS_temp_high_charge"
  | "BMS_temp_low_charge"
  | "BMS_temp_high_discharge"
  | "BMS_temp_low_discharge"
  | "BMS_max_pack_volt_high"
  | "BMS_min_pack_volt_low"
  | "BMS_high_cell_volt"
  | "BMS_low_cell_volt"
  | "CC_over_current"
  | "CC_voltage_too_high"
  | "CC_voltage_too_low"
  | "CC_temp_too_high"
  | "CC_internal_fault"
  | "DC_bus_undercurrent"
  | "DC_bus_overcurrent"
  | "ISO_fault"
  | "ISO_fault_charging"
  | "ISO_fault_driving"
  | "DI_A_temp_limit"
  | "DI_B_temp_limit"
  | "DI_C_temp_limit"
  | "DI_DC_volt_supply_low"
  | "DI_DC_volt_supply_high"
  | "DI_volt_sensor_fault"
  | "DI_current_sensor_fault"
  | "DI_temp_sensor_fault"
  | "VEHICLE_low_12v_power"
  | "VEHICLE_critical_12v_power"
  | "VEHICLE_12v_power_failure"
  | "VEHICLE_power_reduced"
  | "VCFRONT_air_suspension_fail"
  | "VCFRONT_parking_brake_fail"
  | "VCFRONT_brake_fluid_low"
  | "VCFRONT_power_steering_fail"
  | "VCFRONT_abs_fail"
  | "VCFRONT_esp_fail"
  | "VCFRONT_epas_fail"
  | "VCFRONT_driver_door_open"
  | "VCFRONT_psgr_door_open"
  | "VCFRONT_driveunit_fail"
  | "VCFRONT_charger_fail"
  | "VCFRONT_bms_fail"
  | "VCFRONT_hvac_fail"
  | "VCFRONT_seatbelt_driver_unbuckled"
  | "VCFRONT_seatbelt_passenger_unbuckled"
  | "VCFRONT_tpms_fault"
  | "VCFRONT_washer_fluid_low"
  | "VCFRONT_wheel_fault"
  | "VCFRONT_adapter_fault"
  | "VCFRONT_sunroof_fault"
  | "VCFRONT_trunk_open"
  | "VCFRONT_frunk_open"
  | "VCFRONT_gear_not_park"
  | "VCFRONT_door_open"
  | "VCFRONT_key_not_present"
  | "VCFRONT_charge_port_open"
  | "VCFRONT_tow_haul_mode"
  | "VCFRONT_sentry_mode_event"
  | "VCFRONT_home_link_failure"
  | "VCFRONT_door_lock_failure"
  | "VCREAR_air_suspension_fail"
  | "VCREAR_brake_fluid_low"
  | "VCREAR_power_steering_fail"
  | "VCREAR_abs_fail"
  | "VCREAR_esp_fail"
  | "VCREAR_epas_fail"
  | "VCREAR_driveunit_fail"
  | "VCREAR_charger_fail"
  | "VCREAR_bms_fail"
  | "VCREAR_hvac_fail"
  | "VCREAR_seatbelt_driver_unbuckled"
  | "VCREAR_seatbelt_passenger_unbuckled"
  | "VCREAR_tpms_fault"
  | "VCREAR_washer_fluid_low"
  | "VCREAR_wheel_fault"
  | "VCREAR_adapter_fault"
  | "VCREAR_sunroof_fault"
  | "VCREAR_trunk_open"
  | "VCREAR_frunk_open"
  | "VCREAR_gear_not_park"
  | "VCREAR_door_open"
  | "VCREAR_key_not_present"
  | "VCREAR_charge_port_open"
  | "VCREAR_tow_haul_mode"
  | "VCREAR_sentry_mode_event"
  | "VCREAR_home_link_failure"
  | "VCREAR_door_lock_failure"
  | "UNKNOWN"
  | "GENERIC"
  | "OTHER";

// Value type unions with accurate string values from const.ts
type BMSState = "Discharging" | "Charging" | "Idle" | "Balancing";
type CabinOverheatProtectionMode = "Off" | "On" | "FanOnly" | "CoolOnly";
type CableType =
  | "TypeUnknown"
  | "TypeJ1772"
  | "TypeMennekes"
  | "TypeCCS"
  | "TypeCHAdeMO"
  | "TypeGB"
  | "TypeTesla"
  | "TypeSAE"
  | "TypeCCS2"
  | "TypeAdapter";
type CarType =
  | "ModelS"
  | "ModelX"
  | "Model3"
  | "ModelY"
  | "Cybertruck"
  | "Semi"
  | "Roadster";
type ChargePort = "Open" | "Closed";
type ChargePortLatch = "Engaged" | "Disengaged" | "Unknown";
type ChargeState =
  | "Disconnected"
  | "Charging"
  | "Complete"
  | "Stopped"
  | "NoPower"
  | "Scheduled"
  | "Starting"
  | "Preconditioning"
  | "WaitingForCar"
  | "WaitingForScheduledCharge"
  | "Error";
type ClimateKeeperMode = "Off" | "On" | "Dog" | "Camp" | "Sentry";
type ClimateOverheatProtectionTempLimit = "Off" | "Low" | "Normal";
type DefrostMode = "Off" | "On" | "Auto";
type DetailedChargeState =
  | "Disconnected"
  | "Charging"
  | "Complete"
  | "WaitingForCar"
  | "WaitingForScheduledCharge"
  | "Error"
  | "Unknown";
type DisplayState = "On" | "Off" | "Standby";
type DistanceUnit = "mi" | "km";
type DriveInverterState =
  | "Off"
  | "Standby"
  | "PreparingToDrive"
  | "Drive"
  | "Error";
type FastCharger = "Tesla" | "CCS" | "CHAdeMO" | "Unknown";
type FollowDistance = "Close" | "Medium" | "Far";
type ForwardCollisionSensitivity = "Off" | "Low" | "Medium" | "High";
type GuestModeMobileAccess = "FullAccess" | "LimitedAccess" | "NoAccess";
type HvacAutoMode = "Off" | "On";
type HvacPower = "Off" | "On";
type MediaStatus = "Playing" | "Paused" | "Stopped" | "Unknown";
type NetworkInterface = "Cellular" | "WiFi" | "Ethernet";
type PowershareState = "Off" | "On" | "Standby" | "Active";
type PowershareStopReason =
  | "UserRequested"
  | "BatteryLow"
  | "BatteryHigh"
  | "Timeout"
  | "Error"
  | "GridConnected"
  | "LoadTooHigh"
  | "LoadTooLow"
  | "Unknown";
type PowershareType = "Load" | "Grid";
type PressureUnit = "psi" | "bar" | "kPa";
type ScheduledChargingMode = "Off" | "StartAt" | "DepartBy";
type SentryMode = "Off" | "On" | "Enabled";
type ShiftState = "P" | "D" | "R" | "N";
type SpeedAssistLevel = "Off" | "Low" | "Medium" | "High";
type State = "online" | "offline" | "asleep";
type Status = "connected" | "disconnected";
type SunroofInstalled = "None" | "Installed" | "NotInstalled";
type TemperatureUnit = "F" | "C";
type TonneauPosition = "Closed" | "Open" | "Partial";
type TonneauTentMode = "Off" | "On";
type TurnSignal = "Off" | "Left" | "Right";
type WindowState = "Closed" | "Open" | "Venting";

interface ISseBase {
  createdAt: string;
  vin: string;
  isCache?: boolean;
}

export interface ISseState extends ISseBase {
  state: "online" | "offline" | "asleep";
}

export interface ISseData extends ISseBase {
  data: {
    // Vehicle basic info
    DriveRail?: number | null;
    ChargeState?: ChargeState | null;
    BmsFullchargecomplete?: boolean | null;
    VehicleSpeed?: number | null;
    Odometer?: number | null;
    PackVoltage?: number | null;
    PackCurrent?: number | null;
    Soc?: number | null;
    DCDCEnable?: boolean | null;
    Gear?: ShiftState | null;
    IsolationResistance?: number | null;
    PedalPosition?: number | null;
    BrakePedal?: boolean | null;

    // Drive inverter data
    DiStateR?: DriveInverterState | null;
    DiHeatsinkTR?: number | null;
    DiAxleSpeedR?: number | null;
    DiTorquemotor?: number | null;
    DiStatorTempR?: number | null;
    DiVBatR?: number | null;
    DiMotorCurrentR?: number | null;
    DiStateF?: DriveInverterState | null;
    DiStateREL?: DriveInverterState | null;
    DiStateRER?: DriveInverterState | null;
    DiHeatsinkTF?: number | null;
    DiHeatsinkTREL?: number | null;
    DiHeatsinkTRER?: number | null;
    DiAxleSpeedF?: number | null;
    DiAxleSpeedREL?: number | null;
    DiAxleSpeedRER?: number | null;
    DiSlaveTorqueCmd?: number | null;
    DiTorqueActualR?: number | null;
    DiTorqueActualF?: number | null;
    DiTorqueActualREL?: number | null;
    DiTorqueActualRER?: number | null;
    DiStatorTempF?: number | null;
    DiStatorTempREL?: number | null;
    DiStatorTempRER?: number | null;
    DiVBatF?: number | null;
    DiVBatREL?: number | null;
    DiVBatRER?: number | null;
    DiMotorCurrentF?: number | null;
    DiMotorCurrentREL?: number | null;
    DiMotorCurrentRER?: number | null;
    DiInverterTR?: number | null;
    DiInverterTF?: number | null;
    DiInverterTREL?: number | null;
    DiInverterTRER?: number | null;

    // Location and GPS
    Location?: LocationValue | null;
    GpsState?: number | null;
    GpsHeading?: number | null;
    OriginLocation?: LocationValue | null;
    DestinationLocation?: LocationValue | null;

    // Battery data
    NumBrickVoltageMax?: number | null;
    BrickVoltageMax?: number | null;
    NumBrickVoltageMin?: number | null;
    BrickVoltageMin?: number | null;
    NumModuleTempMax?: number | null;
    ModuleTempMax?: number | null;
    NumModuleTempMin?: number | null;
    ModuleTempMin?: number | null;
    RatedRange?: number | null;
    Hvil?: number | null;
    EstBatteryRange?: number | null;
    IdealBatteryRange?: number | null;
    BatteryLevel?: number | null;
    EnergyRemaining?: number | null;
    BatteryHeaterOn?: boolean | null;
    NotEnoughPowerToHeat?: boolean | null;
    BMSState?: BMSState | null;

    // Charging data
    DCChargingEnergyIn?: number | null;
    DCChargingPower?: number | null;
    ACChargingEnergyIn?: number | null;
    ACChargingPower?: number | null;
    ChargeLimitSoc?: number | null;
    FastChargerPresent?: boolean | null;
    TimeToFullCharge?: number | null;
    ScheduledChargingStartTime?: number | null;
    ScheduledChargingPending?: boolean | null;
    ScheduledDepartureTime?: number | null;
    PreconditioningEnabled?: boolean | null;
    ScheduledChargingMode?: ScheduledChargingMode | null;
    ChargeAmps?: number | null;
    ChargeEnableRequest?: boolean | null;
    ChargerPhases?: number | null;
    ChargePortColdWeatherMode?: boolean | null;
    ChargeCurrentRequest?: number | null;
    ChargeCurrentRequestMax?: number | null;
    SuperchargerSessionTripPlanner?: boolean | null;
    ChargePort?: ChargePort | null;
    ChargePortLatch?: ChargePortLatch | null;
    ChargePortDoorOpen?: boolean | null;
    ChargerVoltage?: number | null;
    ChargingCableType?: CableType | null;
    DetailedChargeState?: DetailedChargeState | null;
    EstimatedHoursToChargeTermination?: number | null;
    FastChargerType?: FastCharger | null;
    ChargeRateMilePerHour?: number | null;

    // Doors and windows
    DoorState?: Doors | null;
    Locked?: boolean | null;
    FdWindow?: WindowState | null;
    FpWindow?: WindowState | null;
    RdWindow?: WindowState | null;
    RpWindow?: WindowState | null;

    // Vehicle info
    VehicleName?: string | null;
    Version?: string | null;
    CarType?: CarType | null;
    Trim?: string | null;
    ExteriorColor?: string | null;
    RoofColor?: string | null;
    EfficiencyPackage?: boolean | null;
    EuropeVehicle?: boolean | null;
    RightHandDrive?: boolean | null;
    WheelType?: string | null;

    // Security and access
    SentryMode?: SentryMode | null;
    SpeedLimitMode?: boolean | null;
    CurrentLimitMph?: number | null;
    GuestModeEnabled?: boolean | null;
    PinToDriveEnabled?: boolean | null;
    PairedPhoneKeyAndKeyFobQty?: number | null;
    GuestModeMobileAccessState?: GuestModeMobileAccess | null;
    ValetModeEnabled?: boolean | null;
    RemoteStartEnabled?: boolean | null;

    // TPMS data
    TpmsPressureFl?: number | null;
    TpmsPressureFr?: number | null;
    TpmsPressureRl?: number | null;
    TpmsPressureRr?: number | null;
    SemitruckTpmsPressureRe1L0?: number | null;
    SemitruckTpmsPressureRe1L1?: number | null;
    SemitruckTpmsPressureRe1R0?: number | null;
    SemitruckTpmsPressureRe1R1?: number | null;
    SemitruckTpmsPressureRe2L0?: number | null;
    SemitruckTpmsPressureRe2L1?: number | null;
    SemitruckTpmsPressureRe2R0?: number | null;
    SemitruckTpmsPressureRe2R1?: number | null;
    TpmsLastSeenPressureTimeFl?: TireLocation | null;
    TpmsLastSeenPressureTimeFr?: TireLocation | null;
    TpmsLastSeenPressureTimeRl?: TireLocation | null;
    TpmsLastSeenPressureTimeRr?: TireLocation | null;
    TpmsHardWarnings?: TireLocation | null;
    TpmsSoftWarnings?: TireLocation | null;

    // Climate control
    InsideTemp?: number | null;
    OutsideTemp?: number | null;
    SeatHeaterLeft?: number | null;
    SeatHeaterRight?: number | null;
    SeatHeaterRearLeft?: number | null;
    SeatHeaterRearRight?: number | null;
    SeatHeaterRearCenter?: number | null;
    AutoSeatClimateLeft?: number | null;
    AutoSeatClimateRight?: number | null;
    ClimateSeatCoolingFrontLeft?: number | null;
    ClimateSeatCoolingFrontRight?: number | null;
    CabinOverheatProtectionMode?: CabinOverheatProtectionMode | null;
    CabinOverheatProtectionTemperatureLimit?: ClimateOverheatProtectionTempLimit | null;
    ClimateKeeperMode?: ClimateKeeperMode | null;
    DefrostForPreconditioning?: boolean | null;
    DefrostMode?: DefrostMode | null;
    HvacACEnabled?: boolean | null;
    HvacAutoMode?: HvacAutoMode | null;
    HvacFanSpeed?: number | null;
    HvacFanStatus?: number | null;
    HvacLeftTemperatureRequest?: number | null;
    HvacPower?: HvacPower | null;
    HvacRightTemperatureRequest?: number | null;
    HvacSteeringWheelHeatAuto?: boolean | null;
    HvacSteeringWheelHeatLevel?: number | null;
    RearDisplayHvacEnabled?: boolean | null;
    RearSeatHeaters?: boolean | null;
    SeatVentEnabled?: boolean | null;
    RearDefrostEnabled?: boolean | null;
    WiperHeatEnabled?: boolean | null;

    // Seat occupancy
    DriverSeatBelt?: string | null;
    PassengerSeatBelt?: string | null;
    DriverSeatOccupied?: boolean | null;
    SemitruckPassengerSeatFoldPosition?: string | null;

    // Vehicle dynamics
    LateralAcceleration?: number | null;
    LongitudinalAcceleration?: number | null;
    CruiseSetSpeed?: number | null;
    CruiseFollowDistance?: FollowDistance | null;
    BrakePedalPos?: number | null;

    // Energy usage
    LifetimeEnergyUsed?: number | null;
    LifetimeEnergyUsedDrive?: number | null;
    LifetimeEnergyGainedRegen?: number | null;

    // Semi-truck specific
    SemitruckTractorParkBrakeStatus?: string | null;
    SemitruckTrailerParkBrakeStatus?: string | null;

    // Navigation
    RouteLastUpdated?: number | null;
    RouteLine?: string | null;
    MilesToArrival?: number | null;
    MinutesToArrival?: number | null;
    DestinationName?: string | null;
    RouteTrafficMinutesDelay?: number | null;

    // Safety features
    AutomaticBlindSpotCamera?: boolean | null;
    BlindSpotCollisionWarningChime?: boolean | null;
    SpeedLimitWarning?: boolean | null;
    ForwardCollisionWarning?: ForwardCollisionSensitivity | null;
    LaneDepartureAvoidance?: string | null;
    EmergencyLaneDepartureAvoidance?: boolean | null;
    AutomaticEmergencyBrakingOff?: boolean | null;

    // Experimental fields
    Experimental_1?: number | null;
    Experimental_2?: number | null;
    Experimental_3?: number | null;
    Experimental_4?: number | null;
    Experimental_5?: number | null;
    Experimental_6?: number | null;
    Experimental_7?: number | null;
    Experimental_8?: number | null;
    Experimental_9?: number | null;
    Experimental_10?: number | null;
    Experimental_11?: number | null;
    Experimental_12?: number | null;
    Experimental_13?: number | null;
    Experimental_14?: number | null;
    Experimental_15?: number | null;

    // Service and diagnostics
    ServiceMode?: boolean | null;

    // Deprecated fields
    Deprecated_1?: number | null;
    Deprecated_2?: number | null;
    Deprecated_3?: number | null;

    // Display and UI
    CenterDisplay?: DisplayState | null;

    // Homelink
    HomelinkDeviceCount?: number | null;
    HomelinkNearby?: boolean | null;

    // Powershare
    PowershareHoursLeft?: number | null;
    PowershareInstantaneousPowerKW?: number | null;
    PowershareStatus?: PowershareState | null;
    PowershareStopReason?: PowershareStopReason | null;
    PowershareType?: PowershareType | null;

    // Software updates
    SoftwareUpdateDownloadPercentComplete?: number | null;
    SoftwareUpdateExpectedDurationMinutes?: number | null;
    SoftwareUpdateInstallationPercentComplete?: number | null;
    SoftwareUpdateScheduledStartTime?: number | null;
    SoftwareUpdateVersion?: string | null;

    // Tonneau cover
    TonneauOpenPercent?: number | null;
    TonneauPosition?: TonneauPosition | null;
    TonneauTentMode?: TonneauTentMode | null;

    // Offroad features
    OffroadLightbarPresent?: boolean | null;

    // Location-based features
    LocatedAtHome?: boolean | null;
    LocatedAtWork?: boolean | null;
    LocatedAtFavorite?: boolean | null;

    // Settings
    SettingDistanceUnit?: DistanceUnit | null;
    SettingTemperatureUnit?: TemperatureUnit | null;
    Setting24HourTime?: boolean | null;
    SettingTirePressureUnit?: PressureUnit | null;
    SettingChargeUnit?: string | null;

    // Lights
    LightsHazardsActive?: boolean | null;
    LightsTurnSignal?: TurnSignal | null;
    LightsHighBeams?: boolean | null;

    // Media
    MediaPlaybackStatus?: MediaStatus | null;
    MediaPlaybackSource?: string | null;
    MediaAudioVolume?: number | null;
    MediaNowPlayingDuration?: number | null;
    MediaNowPlayingElapsed?: number | null;
    MediaNowPlayingArtist?: string | null;
    MediaNowPlayingTitle?: string | null;
    MediaNowPlayingAlbum?: string | null;
    MediaNowPlayingStation?: string | null;
    MediaAudioVolumeIncrement?: number | null;
    MediaAudioVolumeMax?: number | null;

    // Sunroof
    SunroofInstalled?: SunroofInstalled | null;

    // Trip data
    ExpectedEnergyPercentAtTripArrival?: number | null;
  };
}
export type Signals = keyof ISseData["data"];

export interface ISseErrors extends ISseBase {
  errors: Array<{
    createdAt: string;
    name: Alert;
    tags: {
      field_name: string;
      name: string;
    };
    body: string;
  }>;
}

export interface ISseAlerts extends ISseBase {
  alerts: Array<{
    name: Alert;
    audiences: string[];
    startedAt: string;
    endedAt?: string;
    condition: string;
    clearCondition: string;
    description: string;
    potentialImpact: string;
    customerFacingMessage1?: string;
    customerFacingMessage2?: string;
  }>;
}

export interface ISseConnectivity extends ISseBase {
  networkInterface: NetworkInterface;
  status: Status;
}

export interface ISseCredits extends ISseBase {
  credits: {
    balance: number;
    cost: number;
    name: string;
    type: string;
  };
}

export interface ISseVehicleData extends ISseBase {
  vehicle_data: Record<string, any>;
}

export interface ISseConfig extends ISseBase {
  config: { fields: FieldsResponse };
}
export type FieldsResponse = { [key in Signals]?: FieldResponse };
export type FieldResponse = {
  interval_seconds: number;
  minimum_delta?: number;
  resend_interval_seconds?: number;
};
export type FieldsRequest = { [key in Signals]?: FieldResponse };
export type FieldRequest = {
  interval_seconds: number | null;
  minimum_delta?: number | null;
  resend_interval_seconds?: number | null;
};

interface LocationValue {
  latitude: number;
  longitude: number;
}

interface Doors {
  DriverFront: boolean;
  DriverRear: boolean;
  PassengerFront: boolean;
  PassengerRear: boolean;
  TrunkFront: boolean;
  TrunkRear: boolean;
}

interface TireLocation {
  frontLeft: boolean;
  frontRight: boolean;
  rearLeft: boolean;
  rearRight: boolean;
  semiMiddleAxleLeft2: boolean;
  semiMiddleAxleRight2: boolean;
  semiRearAxleLeft: boolean;
  semiRearAxleRight: boolean;
  semiRearAxleLeft2: boolean;
  semiRearAxleRight2: boolean;
}

interface Time {
  hour: number;
  minute: number;
  second: number;
}

// the unified SSE type including all message types
export type ISseEvent =
  | ISseState
  | ISseData
  | ISseErrors
  | ISseAlerts
  | ISseConnectivity
  | ISseCredits
  | ISseVehicleData
  | ISseConfig;

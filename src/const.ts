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
    drive_rail?: number | null;
    charge_state?: ChargeState | null;
    bms_full_charge_complete?: boolean | null;
    vehicle_speed?: number | null;
    odometer?: number | null;
    pack_voltage?: number | null;
    pack_current?: number | null;
    soc?: number | null;
    dcdc_enable?: boolean | null;
    gear?: ShiftState | null;
    isolation_resistance?: number | null;
    pedal_position?: number | null;
    brake_pedal?: boolean | null;

    // Drive inverter data
    di_state_r?: DriveInverterState | null;
    di_heatsink_tr?: number | null;
    di_axle_speed_r?: number | null;
    di_torquemotor?: number | null;
    di_stator_temp_r?: number | null;
    di_v_bat_r?: number | null;
    di_motor_current_r?: number | null;
    di_state_f?: DriveInverterState | null;
    di_state_rel?: DriveInverterState | null;
    di_state_rer?: DriveInverterState | null;
    di_heatsink_tf?: number | null;
    di_heatsink_trel?: number | null;
    di_heatsink_trer?: number | null;
    di_axle_speed_f?: number | null;
    di_axle_speed_rel?: number | null;
    di_axle_speed_rer?: number | null;
    di_slave_torque_cmd?: number | null;
    di_torque_actual_r?: number | null;
    di_torque_actual_f?: number | null;
    di_torque_actual_rel?: number | null;
    di_torque_actual_rer?: number | null;
    di_stator_temp_f?: number | null;
    di_stator_temp_rel?: number | null;
    di_stator_temp_rer?: number | null;
    di_v_bat_f?: number | null;
    di_v_bat_rel?: number | null;
    di_v_bat_rer?: number | null;
    di_motor_current_f?: number | null;
    di_motor_current_rel?: number | null;
    di_motor_current_rer?: number | null;
    di_inverter_tr?: number | null;
    di_inverter_tf?: number | null;
    di_inverter_trel?: number | null;
    di_inverter_trer?: number | null;

    // Location and GPS
    location?: LocationValue | null;
    gps_state?: number | null;
    gps_heading?: number | null;
    origin_location?: LocationValue | null;
    destination_location?: LocationValue | null;

    // Battery data
    num_brick_voltage_max?: number | null;
    brick_voltage_max?: number | null;
    num_brick_voltage_min?: number | null;
    brick_voltage_min?: number | null;
    num_module_temp_max?: number | null;
    module_temp_max?: number | null;
    num_module_temp_min?: number | null;
    module_temp_min?: number | null;
    rated_range?: number | null;
    hvil?: number | null;
    est_battery_range?: number | null;
    ideal_battery_range?: number | null;
    battery_level?: number | null;
    energy_remaining?: number | null;
    battery_heater_on?: boolean | null;
    not_enough_power_to_heat?: boolean | null;
    bms_state?: BMSState | null;

    // Charging data
    dc_charging_energy_in?: number | null;
    dc_charging_power?: number | null;
    ac_charging_energy_in?: number | null;
    ac_charging_power?: number | null;
    charge_limit_soc?: number | null;
    fast_charger_present?: boolean | null;
    time_to_full_charge?: number | null;
    scheduled_charging_start_time?: number | null;
    scheduled_charging_pending?: boolean | null;
    scheduled_departure_time?: number | null;
    preconditioning_enabled?: boolean | null;
    scheduled_charging_mode?: ScheduledChargingMode | null;
    charge_amps?: number | null;
    charge_enable_request?: boolean | null;
    charger_phases?: number | null;
    charge_port_cold_weather_mode?: boolean | null;
    charge_current_request?: number | null;
    charge_current_request_max?: number | null;
    supercharger_session_trip_planner?: boolean | null;
    charge_port?: ChargePort | null;
    charge_port_latch?: ChargePortLatch | null;
    charge_port_door_open?: boolean | null;
    charger_voltage?: number | null;
    charging_cable_type?: CableType | null;
    detailed_charge_state?: DetailedChargeState | null;
    estimated_hours_to_charge_termination?: number | null;
    fast_charger_type?: FastCharger | null;
    charge_rate_mile_per_hour?: number | null;

    // Doors and windows
    door_state?: Doors | null;
    locked?: boolean | null;
    fd_window?: WindowState | null;
    fp_window?: WindowState | null;
    rd_window?: WindowState | null;
    rp_window?: WindowState | null;

    // Vehicle info
    vehicle_name?: string | null;
    version?: string | null;
    car_type?: CarType | null;
    trim?: string | null;
    exterior_color?: string | null;
    roof_color?: string | null;
    efficiency_package?: boolean | null;
    europe_vehicle?: boolean | null;
    right_hand_drive?: boolean | null;
    wheel_type?: string | null;

    // Security and access
    sentry_mode?: SentryMode | null;
    speed_limit_mode?: boolean | null;
    current_limit_mph?: number | null;
    guest_mode_enabled?: boolean | null;
    pin_to_drive_enabled?: boolean | null;
    paired_phone_key_and_key_fob_qty?: number | null;
    guest_mode_mobile_access_state?: GuestModeMobileAccess | null;
    valet_mode_enabled?: boolean | null;
    remote_start_enabled?: boolean | null;

    // TPMS data
    tpms_pressure_fl?: number | null;
    tpms_pressure_fr?: number | null;
    tpms_pressure_rl?: number | null;
    tpms_pressure_rr?: number | null;
    semitruck_tpms_pressure_re1_l0?: number | null;
    semitruck_tpms_pressure_re1_l1?: number | null;
    semitruck_tpms_pressure_re1_r0?: number | null;
    semitruck_tpms_pressure_re1_r1?: number | null;
    semitruck_tpms_pressure_re2_l0?: number | null;
    semitruck_tpms_pressure_re2_l1?: number | null;
    semitruck_tpms_pressure_re2_r0?: number | null;
    semitruck_tpms_pressure_re2_r1?: number | null;
    tpms_last_seen_pressure_time_fl?: TireLocation | null;
    tpms_last_seen_pressure_time_fr?: TireLocation | null;
    tpms_last_seen_pressure_time_rl?: TireLocation | null;
    tpms_last_seen_pressure_time_rr?: TireLocation | null;
    tpms_hard_warnings?: TireLocation | null;
    tpms_soft_warnings?: TireLocation | null;

    // Climate control
    inside_temp?: number | null;
    outside_temp?: number | null;
    seat_heater_left?: number | null;
    seat_heater_right?: number | null;
    seat_heater_rear_left?: number | null;
    seat_heater_rear_right?: number | null;
    seat_heater_rear_center?: number | null;
    auto_seat_climate_left?: number | null;
    auto_seat_climate_right?: number | null;
    climate_seat_cooling_front_left?: number | null;
    climate_seat_cooling_front_right?: number | null;
    cabin_overheat_protection_mode?: CabinOverheatProtectionMode | null;
    cabin_overheat_protection_temperature_limit?: ClimateOverheatProtectionTempLimit | null;
    climate_keeper_mode?: ClimateKeeperMode | null;
    defrost_for_preconditioning?: boolean | null;
    defrost_mode?: DefrostMode | null;
    hvac_ac_enabled?: boolean | null;
    hvac_auto_mode?: HvacAutoMode | null;
    hvac_fan_speed?: number | null;
    hvac_fan_status?: number | null;
    hvac_left_temperature_request?: number | null;
    hvac_power?: HvacPower | null;
    hvac_right_temperature_request?: number | null;
    hvac_steering_wheel_heat_auto?: boolean | null;
    hvac_steering_wheel_heat_level?: number | null;
    rear_display_hvac_enabled?: boolean | null;
    rear_seat_heaters?: boolean | null;
    seat_vent_enabled?: boolean | null;
    rear_defrost_enabled?: boolean | null;
    wiper_heat_enabled?: boolean | null;

    // Seat occupancy
    driver_seat_belt?: string | null;
    passenger_seat_belt?: string | null;
    driver_seat_occupied?: boolean | null;
    semitruck_passenger_seat_fold_position?: string | null;

    // Vehicle dynamics
    lateral_acceleration?: number | null;
    longitudinal_acceleration?: number | null;
    cruise_set_speed?: number | null;
    cruise_follow_distance?: FollowDistance | null;
    brake_pedal_pos?: number | null;

    // Energy usage
    lifetime_energy_used?: number | null;
    lifetime_energy_used_drive?: number | null;
    lifetime_energy_gained_regen?: number | null;

    // Semi-truck specific
    semitruck_tractor_park_brake_status?: string | null;
    semitruck_trailer_park_brake_status?: string | null;

    // Navigation
    route_last_updated?: number | null;
    route_line?: string | null;
    miles_to_arrival?: number | null;
    minutes_to_arrival?: number | null;
    destination_name?: string | null;
    route_traffic_minutes_delay?: number | null;

    // Safety features
    automatic_blind_spot_camera?: boolean | null;
    blind_spot_collision_warning_chime?: boolean | null;
    speed_limit_warning?: boolean | null;
    forward_collision_warning?: ForwardCollisionSensitivity | null;
    lane_departure_avoidance?: string | null;
    emergency_lane_departure_avoidance?: boolean | null;
    automatic_emergency_braking_off?: boolean | null;

    // Experimental fields
    experimental_1?: number | null;
    experimental_2?: number | null;
    experimental_3?: number | null;
    experimental_4?: number | null;
    experimental_5?: number | null;
    experimental_6?: number | null;
    experimental_7?: number | null;
    experimental_8?: number | null;
    experimental_9?: number | null;
    experimental_10?: number | null;
    experimental_11?: number | null;
    experimental_12?: number | null;
    experimental_13?: number | null;
    experimental_14?: number | null;
    experimental_15?: number | null;

    // Service and diagnostics
    service_mode?: boolean | null;

    // Deprecated fields
    deprecated_1?: number | null;
    deprecated_2?: number | null;
    deprecated_3?: number | null;

    // Display and UI
    center_display?: DisplayState | null;

    // Homelink
    homelink_device_count?: number | null;
    homelink_nearby?: boolean | null;

    // Powershare
    powershare_hours_left?: number | null;
    powershare_instantaneous_power_kw?: number | null;
    powershare_status?: PowershareState | null;
    powershare_stop_reason?: PowershareStopReason | null;
    powershare_type?: PowershareType | null;

    // Software updates
    software_update_download_percent_complete?: number | null;
    software_update_expected_duration_minutes?: number | null;
    software_update_installation_percent_complete?: number | null;
    software_update_scheduled_start_time?: number | null;
    software_update_version?: string | null;

    // Tonneau cover
    tonneau_open_percent?: number | null;
    tonneau_position?: TonneauPosition | null;
    tonneau_tent_mode?: TonneauTentMode | null;

    // Offroad features
    offroad_lightbar_present?: boolean | null;

    // Location-based features
    located_at_home?: boolean | null;
    located_at_work?: boolean | null;
    located_at_favorite?: boolean | null;

    // Settings
    setting_distance_unit?: DistanceUnit | null;
    setting_temperature_unit?: TemperatureUnit | null;
    setting_24_hour_time?: boolean | null;
    setting_tire_pressure_unit?: PressureUnit | null;
    setting_charge_unit?: string | null;

    // Lights
    lights_hazards_active?: boolean | null;
    lights_turn_signal?: TurnSignal | null;
    lights_high_beams?: boolean | null;

    // Media
    media_playback_status?: MediaStatus | null;
    media_playback_source?: string | null;
    media_audio_volume?: number | null;
    media_now_playing_duration?: number | null;
    media_now_playing_elapsed?: number | null;
    media_now_playing_artist?: string | null;
    media_now_playing_title?: string | null;
    media_now_playing_album?: string | null;
    media_now_playing_station?: string | null;
    media_audio_volume_increment?: number | null;
    media_audio_volume_max?: number | null;

    // Sunroof
    sunroof_installed?: SunroofInstalled | null;

    // Trip data
    expected_energy_percent_at_trip_arrival?: number | null;

    // Additional properties from Signal enum
    speed_limit_acclimation?: number | null;
    state_of_charge?: number | null;
    steering_wheel_heated?: boolean | null;
    sunroof_state?: string | null;
    sunroof_tilt_only?: boolean | null;
    supercharger_session_active?: boolean | null;
    tailgating_warning?: boolean | null;
    tire_pressure_front_left?: number | null;
    tire_pressure_front_right?: number | null;
    tire_pressure_rear_left?: number | null;
    tire_pressure_rear_right?: number | null;
    traffic_based_cruise_control?: boolean | null;
    traffic_warning?: boolean | null;
    trailer_brake_controller_connected?: boolean | null;
    trailer_hitch_active?: boolean | null;
    turn_signal?: TurnSignal | null;
    tyre_pressure_cold_warning?: boolean | null;
    unsafe_ride_exit?: boolean | null;
    update_available?: boolean | null;
    user_present?: boolean | null;
    vehicle_data?: any | null;
    vehicle_home_link?: any | null;
    vehicle_power?: number | null;
    vehicle_range?: number | null;
    vent_driver_window?: boolean | null;
    vent_passenger_window?: boolean | null;
    vent_rear_driver_window?: boolean | null;
    vent_rear_passenger_window?: boolean | null;
    wall_connector_max_amps?: number | null;
    wipers_on?: boolean | null;
    charging_state_change?: any | null;
    connection_state?: string | null;
    credits?: number | null;
    status?: Status | null;
    alerts?: any | null;
    errors?: any | null;
    network_interface?: NetworkInterface | null;
    battery_charge_state?: ChargeState | null;
    charge_current_requested?: number | null;
    charge_port_open?: boolean | null;
    charge_rate?: number | null;
    charge_total_charge_miles?: number | null;
    estimated_charge_time?: number | null;
    trip_energy_added?: number | null;
    trip_miles_added?: number | null;
    trip_remaining_supercharger_session_minutes?: number | null;
    trip_supercharger_session_active?: boolean | null;
    trip_supercharger_session_energy_added?: number | null;
    trip_supercharger_session_miles_added?: number | null;
    supercharger_location?: LocationValue | null;
    state?: State | null;
    credits_balance?: number | null;
    charge_with_solar_history_daily?: number | null;
    charge_with_solar_history_monthly?: number | null;
    charge_with_solar_history_yearly?: number | null;
    charge_with_solar_history_lifetime?: number | null;
    charge_with_solar_status?: string | null;
    charge_with_solar_start_time?: number | null;
    charge_with_solar_end_time?: number | null;
    charge_with_solar_min_limit?: number | null;
    charge_with_solar_max_limit?: number | null;
    charge_with_solar_grid_export_enabled?: boolean | null;
    charge_with_solar_min_soc?: number | null;
    charge_with_solar_max_soc?: number | null;
    charge_with_solar_solar_offset?: number | null;
    charge_with_solar_estimated_duration_seconds?: number | null;
    charge_with_solar_estimated_energy_gained_kwh?: number | null;
  };
}

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
  | ISseVehicleData;

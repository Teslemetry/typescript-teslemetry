// src/const.ts

export enum Signal {
  AC_CHARGING_ENERGY_IN = "ac_charging_energy_in",
  AC_CHARGING_POWER = "ac_charging_power",
  AUTO_SEAT_CLIMATE_LEFT = "auto_seat_climate_left",
  AUTO_SEAT_CLIMATE_RIGHT = "auto_seat_climate_right",
  AUTOMATIC_BLIND_SPOT_CAMERA = "automatic_blind_spot_camera",
  AUTOMATIC_EMERGENCY_BRAKING_OFF = "automatic_emergency_braking_off",
  BMS_STATE = "bms_state",
  BATTERY_HEATER_ON = "battery_heater_on",
  BATTERY_LEVEL = "battery_level",
  BLIND_SPOT_COLLISION_WARNING_CHIME = "blind_spot_collision_warning_chime",
  BMS_FULL_CHARGE_COMPLETE = "bms_full_charge_complete",
  BRAKE_PEDAL = "brake_pedal",
  BRAKE_PEDAL_POS = "brake_pedal_pos",
  BRICK_VOLTAGE_MAX = "brick_voltage_max",
  BRICK_VOLTAGE_MIN = "brick_voltage_min",
  CABIN_OVERHEAT_PROTECTION_MODE = "cabin_overheat_protection_mode",
  CABIN_OVERHEAT_PROTECTION_TEMPERATURE_LIMIT = "cabin_overheat_protection_temperature_limit",
  CAR_TYPE = "car_type",
  CENTER_DISPLAY = "center_display",
  CHARGE_AMPS = "charge_amps",
  CHARGE_CURRENT_REQUEST = "charge_current_request",
  CHARGE_CURRENT_REQUEST_MAX = "charge_current_request_max",
  CHARGE_ENABLE_REQUEST = "charge_enable_request",
  CHARGE_LIMIT_SOC = "charge_limit_soc",
  CHARGE_PORT = "charge_port",
  CHARGE_PORT_COLD_WEATHER_MODE = "charge_port_cold_weather_mode",
  CHARGE_PORT_DOOR_OPEN = "charge_port_door_open",
  CHARGE_PORT_LATCH = "charge_port_latch",
  CHARGER_VOLTAGE = "charger_voltage",
  CHARGE_STATE = "charge_state",
  CHARGER_PHASES = "charger_phases",
  CHARGING_CABLE_TYPE = "charging_cable_type",
  CLIMATE_KEEPER_MODE = "climate_keeper_mode",
  CLIMATE_SEAT_COOLING_FRONT_LEFT = "climate_seat_cooling_front_left",
  CLIMATE_SEAT_COOLING_FRONT_RIGHT = "climate_seat_cooling_front_right",
  CRUISE_FOLLOW_DISTANCE = "cruise_follow_distance",
  CRUISE_SET_SPEED = "cruise_set_speed",
  CURRENT_LIMIT_MPH = "current_limit_mph",
  DC_CHARGING_ENERGY_IN = "dc_charging_energy_in",
  DC_CHARGING_POWER = "dc_charging_power",
  DCDC_ENABLE = "dcdc_enable",
  DEFROST_FOR_PRECONDITIONING = "defrost_for_preconditioning",
  DEFROST_MODE = "defrost_mode",
  DESTINATION_LOCATION = "destination_location",
  DESTINATION_NAME = "destination_name",
  DETAILED_CHARGE_STATE = "detailed_charge_state",
  DI_AXLE_SPEED_F = "di_axle_speed_f",
  DI_AXLE_SPEED_R = "di_axle_speed_r",
  DI_AXLE_SPEED_REL = "di_axle_speed_rel",
  DI_AXLE_SPEED_RER = "di_axle_speed_rer",
  DI_HEATSINK_TF = "di_heatsink_tf",
  DI_HEATSINK_TR = "di_heatsink_tr",
  DI_HEATSINK_TREL = "di_heatsink_trel",
  DI_HEATSINK_TRER = "di_heatsink_trer",
  DI_INVERTER_TF = "di_inverter_tf",
  DI_INVERTER_TR = "di_inverter_tr",
  DI_INVERTER_TREL = "di_inverter_trel",
  DI_INVERTER_TRER = "di_inverter_trer",
  DI_MOTOR_CURRENT_F = "di_motor_current_f",
  DI_MOTOR_CURRENT_R = "di_motor_current_r",
  DI_MOTOR_CURRENT_REL = "di_motor_current_rel",
  DI_MOTOR_CURRENT_RER = "di_motor_current_rer",
  DI_SLAVE_TORQUE_CMD = "di_slave_torque_cmd",
  DI_STATE_F = "di_state_f",
  DI_STATE_R = "di_state_r",
  DI_STATE_REL = "di_state_rel",
  DI_STATE_RER = "di_state_rer",
  DI_STATOR_TEMP_F = "di_stator_temp_f",
  DI_STATOR_TEMP_R = "di_stator_temp_r",
  DI_STATOR_TEMP_REL = "di_stator_temp_rel",
  DI_STATOR_TEMP_RER = "di_stator_temp_rer",
  DI_TORQUE_ACTUAL_F = "di_torque_actual_f",
  DI_TORQUE_ACTUAL_R = "di_torque_actual_r",
  DI_TORQUE_ACTUAL_REL = "di_torque_actual_rel",
  DI_TORQUE_ACTUAL_RER = "di_torque_actual_rer",
  DI_TORQUEMOTOR = "di_torquemotor",
  DI_V_BAT_F = "di_v_bat_f",
  DI_V_BAT_R = "di_v_bat_r",
  DI_V_BAT_REL = "di_v_bat_rel",
  DI_V_BAT_RER = "di_v_bat_rer",
  DOOR_STATE = "door_state",
  DRIVE_RAIL = "drive_rail",
  DRIVER_SEAT_BELT = "driver_seat_belt",
  DRIVER_SEAT_OCCUPIED = "driver_seat_occupied",
  EFFICIENCY_PACKAGE = "efficiency_package",
  EMERGENCY_LANE_DEPARTURE_AVOIDANCE = "emergency_lane_departure_avoidance",
  ENERGY_REMAINING = "energy_remaining",
  EST_BATTERY_RANGE = "est_battery_range",
  ESTIMATED_HOURS_TO_CHARGE_TERMINATION = "estimated_hours_to_charge_termination",
  EUROPE_VEHICLE = "europe_vehicle",
  EXPECTED_ENERGY_PERCENT_AT_TRIP_ARRIVAL = "expected_energy_percent_at_trip_arrival",
  EXTERIOR_COLOR = "exterior_color",
  FAST_CHARGER_PRESENT = "fast_charger_present",
  FAST_CHARGER_TYPE = "fast_charger_type",
  FD_WINDOW = "fd_window",
  FORWARD_COLLISION_WARNING = "forward_collision_warning",
  FP_WINDOW = "fp_window",
  GEAR = "gear",
  GPS_HEADING = "gps_heading",
  GPS_STATE = "gps_state",
  GUEST_MODE_ENABLED = "guest_mode_enabled",
  GUEST_MODE_MOBILE_ACCESS_STATE = "guest_mode_mobile_access_state",
  HOMELINK_DEVICE_COUNT = "homelink_device_count",
  HOMELINK_NEARBY = "homelink_nearby",
  HVAC_AC_ENABLED = "hvac_ac_enabled",
  HVAC_AUTO_MODE = "hvac_auto_mode",
  HVAC_FAN_SPEED = "hvac_fan_speed",
  HVAC_FAN_STATUS = "hvac_fan_status",
  HVAC_LEFT_TEMPERATURE_REQUEST = "hvac_left_temperature_request",
  HVAC_POWER = "hvac_power",
  HVAC_RIGHT_TEMPERATURE_REQUEST = "hvac_right_temperature_request",
  HVAC_STEERING_WHEEL_HEAT_AUTO = "hvac_steering_wheel_heat_auto",
  HVAC_STEERING_WHEEL_HEAT_LEVEL = "hvac_steering_wheel_heat_level",
  HVIL = "hvil",
  IDEAL_BATTERY_RANGE = "ideal_battery_range",
  INSIDE_TEMP = "inside_temp",
  ISOLATION_RESISTANCE = "isolation_resistance",
  LANE_DEPARTURE_AVOIDANCE = "lane_departure_avoidance",
  LATERAL_ACCELERATION = "lateral_acceleration",
  LIFETIME_ENERGY_USED = "lifetime_energy_used",
  LOCATED_AT_FAVORITE = "located_at_favorite",
  LOCATED_AT_HOME = "located_at_home",
  LOCATED_AT_WORK = "located_at_work",
  LOCATION = "location",
  LOCKED = "locked",
  LONGITUDINAL_ACCELERATION = "longitudinal_acceleration",
  MILES_TO_ARRIVAL = "miles_to_arrival",
  MINUTES_TO_ARRIVAL = "minutes_to_arrival",
  MODULE_TEMP_MAX = "module_temp_max",
  MODULE_TEMP_MIN = "module_temp_min",
  NOT_ENOUGH_POWER_TO_HEAT = "not_enough_power_to_heat",
  NUM_BRICK_VOLTAGE_MAX = "num_brick_voltage_max",
  NUM_BRICK_VOLTAGE_MIN = "num_brick_voltage_min",
  NUM_MODULE_TEMP_MAX = "num_module_temp_max",
  NUM_MODULE_TEMP_MIN = "num_module_temp_min",
  ODOMETER = "odometer",
  OFFROAD_LIGHTBAR_PRESENT = "offroad_lightbar_present",
  ORIGIN_LOCATION = "origin_location",
  OUTSIDE_TEMP = "outside_temp",
  PACK_CURRENT = "pack_current",
  PACK_VOLTAGE = "pack_voltage",
  PAIRED_PHONE_KEY_AND_KEY_FOB_QTY = "paired_phone_key_and_key_fob_qty",
  PASSENGER_SEAT_BELT = "passenger_seat_belt",
  PEDAL_POSITION = "pedal_position",
  PIN_TO_DRIVE_ENABLED = "pin_to_drive_enabled",
  POWERSHARE_HOURS_LEFT = "powershare_hours_left",
  POWERSHARE_INSTANTANEOUS_POWER_KW = "powershare_instantaneous_power_kw",
  POWERSHARE_STATUS = "powershare_status",
  POWERSHARE_STOP_REASON = "powershare_stop_reason",
  POWERSHARE_TYPE = "powershare_type",
  PRECONDITIONING_ENABLED = "preconditioning_enabled",
  RATED_RANGE = "rated_range",
  RD_WINDOW = "rd_window",
  REAR_DISPLAY_HVAC_ENABLED = "rear_display_hvac_enabled",
  REAR_SEAT_HEATERS = "rear_seat_heaters",
  REMOTE_START_ENABLED = "remote_start_enabled",
  RIGHT_HAND_DRIVE = "right_hand_drive",
  ROOF_COLOR = "roof_color",
  ROUTE_LAST_UPDATED = "route_last_updated",
  ROUTE_LINE = "route_line",
  ROUTE_TRAFFIC_MINUTES_DELAY = "route_traffic_minutes_delay",
  RP_WINDOW = "rp_window",
  SCHEDULED_CHARGING_MODE = "scheduled_charging_mode",
  SCHEDULED_CHARGING_PENDING = "scheduled_charging_pending",
  SCHEDULED_CHARGING_START_TIME = "scheduled_charging_start_time",
  SCHEDULED_DEPARTURE_TIME = "scheduled_departure_time",
  SEAT_HEATER_LEFT = "seat_heater_left",
  SEAT_HEATER_REAR_LEFT = "seat_heater_rear_left",
  SEAT_HEATER_REAR_RIGHT = "seat_heater_rear_right",
  SEAT_HEATER_RIGHT = "seat_heater_right",
  SENTRY_MODE = "sentry_mode",
  SENTRY_MODE_HUNTER_ACTIVE = "sentry_mode_hunter_active",
  SENTRY_MODE_REASON = "sentry_mode_reason",
  SIDE_MIRRORS_HEATED = "side_mirrors_heated",
  SOAP_REQUEST_STATE = "soap_request_state",
  SPEED = "speed",
  SPEED_LIMIT_ACCLIMATION = "speed_limit_acclimation",
  SPEED_LIMIT_MODE = "speed_limit_mode",
  STATE_OF_CHARGE = "state_of_charge",
  STEERING_WHEEL_HEATED = "steering_wheel_heated",
  SUNROOF_STATE = "sunroof_state",
  SUNROOF_TILT_ONLY = "sunroof_tilt_only",
  SUPERCHARGER_SESSION_ACTIVE = "supercharger_session_active",
  TAILGATING_WARNING = "tailgating_warning",
  TIRE_PRESSURE_FRONT_LEFT = "tire_pressure_front_left",
  TIRE_PRESSURE_FRONT_RIGHT = "tire_pressure_front_right",
  TIRE_PRESSURE_REAR_LEFT = "tire_pressure_rear_left",
  TIRE_PRESSURE_REAR_RIGHT = "tire_pressure_rear_right",
  TONNEAU_POSITION = "tonneau_position",
  TONNEAU_TENT_MODE = "tonneau_tent_mode",
  TRAFFIC_BASED_CRUISE_CONTROL = "traffic_based_cruise_control",
  TRAFFIC_WARNING = "traffic_warning",
  TRAILER_BRAKE_CONTROLLER_CONNECTED = "trailer_brake_controller_connected",
  TRAILER_HITCH_ACTIVE = "trailer_hitch_active",
  TURN_SIGNAL = "turn_signal",
  TYRE_PRESSURE_COLD_WARNING = "tyre_pressure_cold_warning",
  UNSAFE_RIDE_EXIT = "unsafe_ride_exit",
  UPDATE_AVAILABLE = "update_available",
  USER_PRESENT = "user_present",
  VEHICLE_DATA = "vehicle_data",
  VEHICLE_HOME_LINK = "vehicle_home_link",
  VEHICLE_NAME = "vehicle_name",
  VEHICLE_POWER = "vehicle_power",
  VEHICLE_RANGE = "vehicle_range",
  VEHICLE_SPEED = "vehicle_speed",
  VENT_DRIVER_WINDOW = "vent_driver_window",
  VENT_PASSENGER_WINDOW = "vent_passenger_window",
  VENT_REAR_DRIVER_WINDOW = "vent_rear_driver_window",
  VENT_REAR_PASSENGER_WINDOW = "vent_rear_passenger_window",
  WALL_CONNECTOR_MAX_AMPS = "wall_connector_max_amps",
  WHEEL_TYPE = "wheel_type",
  WIPERS_ON = "wipers_on",
  CHARGING_STATE_CHANGE = "charging_state_change",
  CONNECTION_STATE = "connection_state",
  CREDITS = "credits",
  STATUS = "status",
  ALERTS = "alerts",
  ERRORS = "errors",
  NETWORK_INTERFACE = "network_interface",
  BATTERY_CHARGE_STATE = "battery_charge_state",
  CHARGE_CURRENT_REQUESTED = "charge_current_requested",
  CHARGE_PORT_OPEN = "charge_port_open",
  CHARGE_RATE = "charge_rate",
  CHARGE_TOTAL_CHARGE_MILES = "charge_total_charge_miles",
  ESTIMATED_CHARGE_TIME = "estimated_charge_time",
  TIME_TO_FULL_CHARGE = "time_to_full_charge",
  TRIP_ENERGY_ADDED = "trip_energy_added",
  TRIP_MILES_ADDED = "trip_miles_added",
  TRIP_REMAINING_SUPERCHARGER_SESSION_MINUTES = "trip_remaining_supercharger_session_minutes",
  TRIP_SUPERCHARGER_SESSION_ACTIVE = "trip_supercharger_session_active",
  TRIP_SUPERCHARGER_SESSION_ENERGY_ADDED = "trip_supercharger_session_energy_added",
  TRIP_SUPERCHARGER_SESSION_MILES_ADDED = "trip_supercharger_session_miles_added",
  SUPERCHARGER_LOCATION = "supercharger_location",
  STATE = "state",
  CREDITS_BALANCE = "credits_balance",
  CHARGE_WITH_SOLAR_HISTORY_DAILY = "charge_with_solar_history_daily",
  CHARGE_WITH_SOLAR_HISTORY_MONTHLY = "charge_with_solar_history_monthly",
  CHARGE_WITH_SOLAR_HISTORY_YEARLY = "charge_with_solar_history_yearly",
  CHARGE_WITH_SOLAR_HISTORY_LIFETIME = "charge_with_solar_history_lifetime",
  CHARGE_WITH_SOLAR_STATUS = "charge_with_solar_status",
  CHARGE_WITH_SOLAR_START_TIME = "charge_with_solar_start_time",
  CHARGE_WITH_SOLAR_END_TIME = "charge_with_solar_end_time",
  CHARGE_WITH_SOLAR_MIN_LIMIT = "charge_with_solar_min_limit",
  CHARGE_WITH_SOLAR_MAX_LIMIT = "charge_with_solar_max_limit",
  CHARGE_WITH_SOLAR_GRID_EXPORT_ENABLED = "charge_with_solar_grid_export_enabled",
  CHARGE_WITH_SOLAR_MIN_SOC = "charge_with_solar_min_soc",
  CHARGE_WITH_SOLAR_MAX_SOC = "charge_with_solar_max_soc",
  CHARGE_WITH_SOLAR_SOLAR_OFFSET = "charge_with_solar_solar_offset",
  CHARGE_WITH_SOLAR_ESTIMATED_DURATION_SECONDS = "charge_with_solar_estimated_duration_seconds",
  CHARGE_WITH_SOLAR_ESTIMATED_ENERGY_GAINED_KWH = "charge_with_solar_estimated_energy_gained_kwh",
}

export enum Alert {
  POWER_REDUCED = "POWER_REDUCED",
  BMS_HIGH_VOLTAGE_IMMEDIATE_ACTION = "BMS_high_voltage_immediate_action",
  BMS_LOW_VOLTAGE_IMMEDIATE_ACTION = "BMS_low_voltage_immediate_action",
  BMS_OVER_CURRENT = "BMS_over_current",
  BMS_CELL_IMBALANCE = "BMS_cell_imbalance",
  BMS_TEMP_HIGH_CHARGE = "BMS_temp_high_charge",
  BMS_TEMP_LOW_CHARGE = "BMS_temp_low_charge",
  BMS_TEMP_HIGH_DISCHARGE = "BMS_temp_high_discharge",
  BMS_TEMP_LOW_DISCHARGE = "BMS_temp_low_discharge",
  BMS_MAX_PACK_VOLT_HIGH = "BMS_max_pack_volt_high",
  BMS_MIN_PACK_VOLT_LOW = "BMS_min_pack_volt_low",
  BMS_HIGH_CELL_VOLT = "BMS_high_cell_volt",
  BMS_LOW_CELL_VOLT = "BMS_low_cell_volt",
  CC_OVER_CURRENT = "CC_over_current",
  CC_VOLTAGE_TOO_HIGH = "CC_voltage_too_high",
  CC_VOLTAGE_TOO_LOW = "CC_voltage_too_low",
  CC_TEMP_TOO_HIGH = "CC_temp_too_high",
  CC_INTERNAL_FAULT = "CC_internal_fault",
  DC_BUS_UNDERCURRENT = "DC_bus_undercurrent",
  DC_BUS_OVERCURRENT = "DC_bus_overcurrent",
  ISO_FAULT = "ISO_fault",
  ISO_FAULT_CHARGING = "ISO_fault_charging",
  ISO_FAULT_DRIVING = "ISO_fault_driving",
  DI_A_TEMP_LIMIT = "DI_A_temp_limit",
  DI_B_TEMP_LIMIT = "DI_B_temp_limit",
  DI_C_TEMP_LIMIT = "DI_C_temp_limit",
  DI_DC_VOLT_SUPPLY_LOW = "DI_DC_volt_supply_low",
  DI_DC_VOLT_SUPPLY_HIGH = "DI_DC_volt_supply_high",
  DI_VOLT_SENSOR_FAULT = "DI_volt_sensor_fault",
  DI_CURRENT_SENSOR_FAULT = "DI_current_sensor_fault",
  DI_TEMP_SENSOR_FAULT = "DI_temp_sensor_fault",
  VEHICLE_LOW_12V_POWER = "VEHICLE_low_12v_power",
  VEHICLE_CRITICAL_12V_POWER = "VEHICLE_critical_12v_power",
  VEHICLE_12V_POWER_FAILURE = "VEHICLE_12v_power_failure",
  VEHICLE_POWER_REDUCED = "VEHICLE_power_reduced",
  VCFRONT_AIR_SUSPENSION_FAIL = "VCFRONT_air_suspension_fail",
  VCFRONT_PARKING_BRAKE_FAIL = "VCFRONT_parking_brake_fail",
  VCFRONT_BRAKE_FLUID_LOW = "VCFRONT_brake_fluid_low",
  VCFRONT_POWER_STEERING_FAIL = "VCFRONT_power_steering_fail",
  VCFRONT_ABS_FAIL = "VCFRONT_abs_fail",
  VCFRONT_ESP_FAIL = "VCFRONT_esp_fail",
  VCFRONT_EPAS_FAIL = "VCFRONT_epas_fail",
  VCFRONT_DRIVER_DOOR_OPEN = "VCFRONT_driver_door_open",
  VCFRONT_PSGR_DOOR_OPEN = "VCFRONT_psgr_door_open",
  VCFRONT_DRIVEUNIT_FAIL = "VCFRONT_driveunit_fail",
  VCFRONT_CHARGER_FAIL = "VCFRONT_charger_fail",
  VCFRONT_BMS_FAIL = "VCFRONT_bms_fail",
  VCFRONT_HVAC_FAIL = "VCFRONT_hvac_fail",
  VCFRONT_SEATBELT_DRIVER_UNBUCKLED = "VCFRONT_seatbelt_driver_unbuckled",
  VCFRONT_SEATBELT_PASSENGER_UNBUCKLED = "VCFRONT_seatbelt_passenger_unbuckled",
  VCFRONT_TPMS_FAULT = "VCFRONT_tpms_fault",
  VCFRONT_WASHER_FLUID_LOW = "VCFRONT_washer_fluid_low",
  VCFRONT_WHEEL_FAULT = "VCFRONT_wheel_fault",
  VCFRONT_ADAPTER_FAULT = "VCFRONT_adapter_fault",
  VCFRONT_SUNROOF_FAULT = "VCFRONT_sunroof_fault",
  VCFRONT_TRUNK_OPEN = "VCFRONT_trunk_open",
  VCFRONT_FRUNK_OPEN = "VCFRONT_frunk_open",
  VCFRONT_GEAR_NOT_PARK = "VCFRONT_gear_not_park",
  VCFRONT_DOOR_OPEN = "VCFRONT_door_open",
  VCFRONT_KEY_NOT_PRESENT = "VCFRONT_key_not_present",
  VCFRONT_CHARGE_PORT_OPEN = "VCFRONT_charge_port_open",
  VCFRONT_TOW_HAUL_MODE = "VCFRONT_tow_haul_mode",
  VCFRONT_SENTRY_MODE_EVENT = "VCFRONT_sentry_mode_event",
  VCFRONT_HOME_LINK_FAILURE = "VCFRONT_home_link_failure",
  VCFRONT_DOOR_LOCK_FAILURE = "VCFRONT_door_lock_failure",
  VCREAR_AIR_SUSPENSION_FAIL = "VCREAR_air_suspension_fail",
  VCREAR_BRAKE_FLUID_LOW = "VCREAR_brake_fluid_low",
  VCREAR_POWER_STEERING_FAIL = "VCREAR_power_steering_fail",
  VCREAR_ABS_FAIL = "VCREAR_abs_fail",
  VCREAR_ESP_FAIL = "VCREAR_esp_fail",
  VCREAR_EPAS_FAIL = "VCREAR_epas_fail",
  VCREAR_DRIVEUNIT_FAIL = "VCREAR_driveunit_fail",
  VCREAR_CHARGER_FAIL = "VCREAR_charger_fail",
  VCREAR_BMS_FAIL = "VCREAR_bms_fail",
  VCREAR_HVAC_FAIL = "VCREAR_hvac_fail",
  VCREAR_SEATBELT_DRIVER_UNBUCKLED = "VCREAR_seatbelt_driver_unbuckled",
  VCREAR_SEATBELT_PASSENGER_UNBUCKLED = "VCREAR_seatbelt_passenger_unbuckled",
  VCREAR_TPMS_FAULT = "VCREAR_tpms_fault",
  VCREAR_WASHER_FLUID_LOW = "VCREAR_washer_fluid_low",
  VCREAR_WHEEL_FAULT = "VCREAR_wheel_fault",
  VCREAR_ADAPTER_FAULT = "VCREAR_adapter_fault",
  VCREAR_SUNROOF_FAULT = "VCREAR_sunroof_fault",
  VCREAR_TRUNK_OPEN = "VCREAR_trunk_open",
  VCREAR_FRUNK_OPEN = "VCREAR_frunk_open",
  VCREAR_GEAR_NOT_PARK = "VCREAR_gear_not_park",
  VCREAR_DOOR_OPEN = "VCREAR_door_open",
  VCREAR_KEY_NOT_PRESENT = "VCREAR_key_not_present",
  VCREAR_CHARGE_PORT_OPEN = "VCREAR_charge_port_open",
  VCREAR_TOW_HAUL_MODE = "VCREAR_tow_haul_mode",
  VCREAR_SENTRY_MODE_EVENT = "VCREAR_sentry_mode_event",
  VCREAR_HOME_LINK_FAILURE = "VCREAR_home_link_failure",
  VCREAR_DOOR_LOCK_FAILURE = "VCREAR_door_lock_failure",
  UNKNOWN = "UNKNOWN",
  GENERIC = "GENERIC",
  OTHER = "OTHER",
}

export enum BMSState {
  DISCHARGING = "Discharging",
  CHARGING = "Charging",
  IDLE = "Idle",
  BALANCING = "Balancing",
}

export enum CabinOverheatProtectionModeState {
  ON = "On",
  OFF = "Off",
  NO_HVAC = "NoHVAC",
}

export enum CableType {
  DISCONNECTED = "Disconnected",
  TYPE_1 = "Type1",
  TYPE_2 = "Type2",
  TYPE_3 = "Type3",
  GRID = "Grid",
  CCS = "CCS",
  TESLA_SUPERCHARGER = "TeslaSupercharger",
  TESLA_HPWC = "TeslaHPWC",
  UNKNOWN = "Unknown",
}

export enum CarType {
  MODEL_S = "ModelS",
  MODEL_3 = "Model3",
  MODEL_X = "ModelX",
  MODEL_Y = "ModelY",
  CYBERTRUCK = "Cybertruck",
  ROADSTER = "Roadster",
  SEMI = "Semi",
}

export enum ChargePort {
  OPEN = "Open",
  CLOSED = "Closed",
}

export enum ChargePortLatch {
  ENGAGED = "Engaged",
  DISENGAGED = "Disengaged",
  FAULT = "Fault",
  UNKNOWN = "Unknown",
}

export enum ChargeState {
  DISCONNECTED = "Disconnected",
  CHARGING = "Charging",
  COMPLETE = "Complete",
  STOPPED = "Stopped",
  NO_POWER = "NoPower",
  SCHEDULED = "Scheduled",
  STARTING = "Starting",
  PRECONDITIONING = "Preconditioning",
  WAITING_FOR_CAR = "WaitingForCar",
  WAITING_FOR_SCHEDULED_CHARGE = "WaitingForScheduledCharge",
  ERROR = "Error",
}

export enum ChargeUnitPreference {
  KWH = "kWh",
  PERCENT = "Percent",
}

export enum ClimateKeeperModeState {
  OFF = "Off",
  ON = "On",
  DOG = "Dog",
  CAMP = "Camp",
  SENTRY = "Sentry",
}

export enum ClimateOverheatProtectionTempLimit {
  OFF = "Off",
  LOW = "Low",
  NORMAL = "Normal",
}

export enum DefrostModeState {
  OFF = "Off",
  ON = "On",
  AUTO = "Auto",
}

export enum DetailedChargeState {
  DISCONNECTED = "Disconnected",
  CHARGING = "Charging",
  COMPLETE = "Complete",
  WAITING_FOR_CAR = "WaitingForCar",
  WAITING_FOR_SCHEDULED_CHARGE = "WaitingForScheduledCharge",
  ERROR = "Error",
  UNKNOWN = "Unknown",
}

export enum DisplayState {
  ON = "On",
  OFF = "Off",
  STANDBY = "Standby",
}

export enum DistanceUnit {
  MILES = "mi",
  KILOMETERS = "km",
}

export enum DriveInverterState {
  OFF = "Off",
  STANDBY = "Standby",
  PREPARING_TO_DRIVE = "PreparingToDrive",
  DRIVE = "Drive",
  ERROR = "Error",
}

export enum FastCharger {
  TESLA = "Tesla",
  CCS = "CCS",
  CHADEMO = "CHAdeMO",
  UNKNOWN = "Unknown",
}

export enum FollowDistance {
  CLOSE = "Close",
  MEDIUM = "Medium",
  FAR = "Far",
}

export enum ForwardCollisionSensitivity {
  OFF = "Off",
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export enum GuestModeMobileAccess {
  FULL_ACCESS = "FullAccess",
  LIMITED_ACCESS = "LimitedAccess",
  NO_ACCESS = "NoAccess",
}

export enum HvacAutoModeState {
  OFF = "Off",
  ON = "On",
}

export enum HvacPowerState {
  OFF = "Off",
  ON = "On",
}

export enum HvilStatus {
  UNDEF = "UNDEF",
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  FAULT = "FAULT",
}

export enum Key {
  VIN = "vin",
  STATE = "state",
  VEHICLE_DATA = "vehicle_data",
  ALERTS = "alerts",
  ERRORS = "errors",
  NETWORK_INTERFACE = "network_interface",
}

export enum LaneAssistLevel {
  OFF = "Off",
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export enum MediaStatus {
  PAUSED = "Paused",
  PLAYING = "Playing",
  STOPPED = "Stopped",
}

export enum NetworkInterface {
  WIFI = "Wifi",
  CELLULAR = "Cellular",
}

export enum PowershareState {
  IDLE = "Idle",
  CHARGING = "Charging",
  DISCHARGING = "Discharging",
  ERROR = "Error",
}

export enum PowershareStopReasonStatus {
  NO_ERROR = "NoError",
  INSUFFICIENT_POWER = "InsufficientPower",
  THERMAL_LIMIT = "ThermalLimit",
  EXTERNAL_FAULT = "ExternalFault",
  SCHEDULED_STOP = "ScheduledStop",
  USER_STOP = "UserStop",
  VEHICLE_CHARGE_LIMIT_REACHED = "VehicleChargeLimitReached",
  HOME_POWER_SUPPLY_ISSUE = "HomePowerSupplyIssue",
  GRID_FAULT = "GridFault",
}

export enum PowershareTypeStatus {
  V2H = "V2H",
  V2L = "V2L",
  V2V = "V2V",
}

export enum PressureUnit {
  PSI = "psi",
  BAR = "bar",
  KPA = "kPa",
}

export enum ScheduledChargingMode {
  OFF = "Off",
  CHARGE_AT = "ChargeAt",
  DEPART_AT = "DepartAt",
}

export enum SentryModeState {
  OFF = "Off",
  STANDBY = "Standby",
  ALERT = "Alert",
  ALARM = "Alarm",
}

export enum ShiftState {
  PARK = "P",
  REVERSE = "R",
  NEUTRAL = "N",
  DRIVE = "D",
  ERROR = "E",
}

export enum SpeedAssistLevel {
  OFF = "Off",
  WARNING = "Warning",
  ASSIST = "Assist",
}

export enum State {
  ONLINE = "Online",
  OFFLINE = "Offline",
}

export enum Status {
  CONNECTED = "Connected",
  DISCONNECTED = "Disconnected",
}

export enum SunroofInstalledState {
  NOT_INSTALLED = "NotInstalled",
  INSTALLED = "Installed",
}

export enum TemperatureUnit {
  CELSIUS = "C",
  FAHRENHEIT = "F",
}

export type TeslaLocation = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

export enum TonneauPositionState {
  CLOSED = "Closed",
  OPEN = "Open",
  OPENING = "Opening",
  CLOSING = "Closing",
}

export enum TonneauTentModeState {
  OFF = "Off",
  ON = "On",
}

export enum TurnSignalState {
  OFF = "Off",
  LEFT = "Left",
  RIGHT = "Right",
  HAZARDS = "Hazards",
}

export enum WindowState {
  OPEN = "Open",
  CLOSED = "Closed",
  VENT = "Vent",
}

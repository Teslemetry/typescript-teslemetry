# Homey Capabilities Reference

This document provides a comprehensive reference of all Homey capabilities for LLM context consumption. Each capability defines a specific function or measurement that a device can perform or report.

## Capability Structure

Each capability has the following properties:
- **ID**: Unique identifier for the capability
- **Name**: Human-readable name
- **Compatibility**: Minimum Homey version (if specified)
- **Type**: Data type (boolean, number, string, enum)
- **Units**: Unit of measurement (if applicable)
- **Getable**: Whether the capability value can be read
- **Setable**: Whether the capability value can be written
- **Insights**: Whether the capability can be logged for insights
- **Quick Action**: Whether it appears in quick actions
- **Flow**: Whether it can be used in flows
- **UI Component**: The interface component used (toggle, slider, button, etc.)

## Core Device Control Capabilities

### onoff
- **Name**: Turned on
- **Type**: boolean
- **UI Component**: toggle
- **Description**: Basic on/off control for devices

### dim
- **Name**: Dim level
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Description**: Controls brightness/intensity level (0-100%)

## Lighting Capabilities

### light_hue
- **Name**: Hue
- **Type**: number
- **UI Component**: color
- **Description**: Controls the hue (color) of a light

### light_saturation
- **Name**: Color saturation
- **Type**: number
- **UI Component**: color
- **Description**: Controls color saturation intensity

### light_temperature
- **Name**: Color temperature
- **Type**: number
- **UI Component**: color
- **Description**: Controls warm/cool color temperature

### light_mode
- **Name**: Light mode
- **Type**: enum
- **UI Component**: color
- **Description**: Selects light operating mode

## Climate Control Capabilities

### thermostat_mode
- **Name**: Thermostat mode
- **Type**: enum
- **UI Component**: picker
- **Description**: Sets thermostat operating mode (heat, cool, auto, etc.)

### target_temperature
- **Name**: Target temperature
- **Type**: number
- **Units**: °C
- **UI Component**: thermostat
- **Description**: Sets desired temperature

### target_temperature_max
- **Name**: Maximum target temperature
- **Type**: number
- **Units**: °C
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Sets maximum allowed target temperature

### target_temperature_min
- **Name**: Minimum target temperature
- **Type**: number
- **Units**: °C
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Sets minimum allowed target temperature

### target_temperature_level
- **Name**: Target temperature level
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Sets temperature level preset

### target_humidity
- **Name**: Target Humidity
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Sets desired humidity level

### target_humidity_max
- **Name**: Maximum target humidity
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Sets maximum allowed humidity

### target_humidity_min
- **Name**: Minimum target humidity
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Sets minimum allowed humidity

## Environmental Sensors

### measure_temperature
- **Name**: Temperature
- **Type**: number
- **Units**: °C
- **UI Component**: sensor
- **Description**: Measures ambient temperature

### measure_humidity
- **Name**: Humidity
- **Type**: number
- **Units**: %
- **UI Component**: sensor
- **Description**: Measures relative humidity

### measure_pressure
- **Name**: Pressure
- **Type**: number
- **Units**: mbar
- **UI Component**: sensor
- **Description**: Measures atmospheric pressure

### measure_noise
- **Name**: Noise
- **Type**: number
- **Units**: dB
- **UI Component**: sensor
- **Description**: Measures sound level

### measure_luminance
- **Name**: Luminance
- **Type**: number
- **Units**: lx
- **UI Component**: sensor
- **Description**: Measures light intensity

### measure_ultraviolet
- **Name**: Ultraviolet
- **Type**: number
- **Units**: UVI
- **UI Component**: sensor
- **Description**: Measures UV index

### measure_moisture
- **Name**: Moisture
- **Type**: number
- **Units**: %
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures moisture content

## Air Quality Sensors

### measure_co
- **Name**: CO
- **Type**: number
- **Units**: ppm
- **UI Component**: sensor
- **Description**: Measures carbon monoxide concentration

### measure_co2
- **Name**: CO₂
- **Type**: number
- **Units**: ppm
- **UI Component**: sensor
- **Description**: Measures carbon dioxide concentration

### measure_pm25
- **Name**: PM2.5
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Description**: Measures fine particulate matter

### measure_pm1
- **Name**: PM1
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures PM1 particulate matter

### measure_pm01
- **Name**: PM0.1
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures ultra-fine particulate matter

### measure_pm10
- **Name**: PM10
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures coarse particulate matter

### measure_aqi
- **Name**: Air Quality Index
- **Type**: number
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Overall air quality index

### measure_tvoc
- **Name**: TVOC
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Total volatile organic compounds

### measure_tvoc_index
- **Name**: TVOC index
- **Type**: number
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: TVOC index value

### measure_ch2o
- **Name**: Formaldehyde
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures formaldehyde concentration

### measure_nox
- **Name**: NOx
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures nitrogen oxides

### measure_o3
- **Name**: Ozone
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures ozone concentration

### measure_so2
- **Name**: SO₂
- **Type**: number
- **Units**: μg/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures sulfur dioxide

### measure_radon
- **Name**: Radon
- **Type**: number
- **Units**: Bq/m³
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures radon levels

### measure_odor
- **Name**: Odor
- **Type**: number
- **Units**: OU
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures odor units

## Weather Sensors

### measure_rain
- **Name**: Rain
- **Type**: number
- **Units**: mm
- **UI Component**: sensor
- **Description**: Measures rainfall amount

### measure_rain_intensity
- **Name**: Rain Intensity
- **Type**: number
- **Units**: mm/h
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Measures rainfall rate

### measure_wind_strength
- **Name**: Wind strength
- **Type**: number
- **Units**: km/h
- **UI Component**: sensor
- **Description**: Measures wind speed

### measure_wind_angle
- **Name**: Wind angle
- **Type**: number
- **Units**: °
- **UI Component**: sensor
- **Description**: Measures wind direction

### measure_gust_strength
- **Name**: Gust strength
- **Type**: number
- **Units**: km/h
- **UI Component**: sensor
- **Description**: Measures wind gust speed

### measure_gust_angle
- **Name**: Gust angle
- **Type**: number
- **Units**: °
- **UI Component**: sensor
- **Description**: Measures wind gust direction

## Power & Electrical Sensors

### measure_power
- **Name**: Power
- **Type**: number
- **Units**: W
- **UI Component**: sensor
- **Description**: Measures instantaneous power consumption

### measure_voltage
- **Name**: Voltage
- **Type**: number
- **Units**: V
- **UI Component**: sensor
- **Description**: Measures electrical voltage

### measure_current
- **Name**: Current
- **Type**: number
- **Units**: A
- **UI Component**: sensor
- **Description**: Measures electrical current

### measure_battery
- **Name**: Battery
- **Type**: number
- **Units**: %
- **UI Component**: battery
- **Description**: Battery charge level

### battery_charging_state
- **Name**: Battery charging state
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Current charging status of battery

## Utility Meters

### meter_power
- **Name**: Energy
- **Type**: number
- **Units**: kWh
- **UI Component**: sensor
- **Description**: Cumulative energy consumption

### meter_water
- **Name**: Water meter
- **Type**: number
- **Units**: m³
- **UI Component**: sensor
- **Description**: Cumulative water usage

### meter_gas
- **Name**: Gas meter
- **Type**: number
- **Units**: m³
- **UI Component**: sensor
- **Description**: Cumulative gas consumption

### meter_rain
- **Name**: Rain meter
- **Type**: number
- **Units**: m³
- **UI Component**: sensor
- **Description**: Cumulative rainfall measurement

## Alarm Capabilities

### alarm_generic
- **Name**: Generic Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: General purpose alarm state

### alarm_motion
- **Name**: Motion Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Motion detection alarm

### alarm_contact
- **Name**: Contact Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Door/window contact sensor alarm

### alarm_smoke
- **Name**: Smoke Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Smoke detection alarm

### alarm_fire
- **Name**: Fire Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Fire detection alarm

### alarm_heat
- **Name**: Heat Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Heat detection alarm

### alarm_water
- **Name**: Water Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Water leak detection alarm

### alarm_battery
- **Name**: Battery Alarm
- **Type**: boolean
- **UI Component**: battery
- **Description**: Low battery alarm

### alarm_night
- **Name**: Night Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Night mode alarm

### alarm_tamper
- **Name**: Tamper Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Device tampering alarm

### alarm_co
- **Name**: CO Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Carbon monoxide alarm

### alarm_co2
- **Name**: CO₂ Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Carbon dioxide alarm

### alarm_pm25
- **Name**: PM2.5 Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Description**: Fine particulate matter alarm

## Extended Alarms (v12.2.0+)

### alarm_bin_full
- **Name**: Bin Full Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Vacuum/device bin full alarm

### alarm_bin_missing
- **Name**: Bin Missing Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Vacuum/device bin missing alarm

### alarm_cold
- **Name**: Cold Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Temperature too low alarm

### alarm_connectivity
- **Name**: Connectivity Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Network connectivity alarm

### alarm_gas
- **Name**: Gas Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Gas detection alarm

### alarm_moisture
- **Name**: Moisture Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Moisture detection alarm

### alarm_occupancy
- **Name**: Occupancy Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Room occupancy alarm

### alarm_presence
- **Name**: Presence Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Presence detection alarm

### alarm_vibration
- **Name**: Vibration Alarm
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Vibration detection alarm

## Audio & Media Capabilities

### volume_set
- **Name**: Set volume
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Description**: Controls audio volume level

### volume_up
- **Name**: Volume up
- **Type**: boolean
- **UI Component**: button
- **Description**: Increases volume

### volume_down
- **Name**: Volume down
- **Type**: boolean
- **UI Component**: button
- **Description**: Decreases volume

### volume_mute
- **Name**: Volume muted
- **Type**: boolean
- **UI Component**: button
- **Description**: Mutes/unmutes audio

### channel_up
- **Name**: Channel up
- **Type**: boolean
- **UI Component**: button
- **Description**: Changes to next channel

### channel_down
- **Name**: Channel down
- **Type**: boolean
- **UI Component**: button
- **Description**: Changes to previous channel

### audio_output
- **Name**: Audio Output
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Selects audio output source

### media_input
- **Name**: Media Input
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Selects media input source

## Media Player Capabilities

### speaker_playing
- **Name**: Playing
- **Type**: boolean
- **UI Component**: media
- **Description**: Media playback state

### speaker_next
- **Name**: Next
- **Type**: boolean
- **UI Component**: media
- **Description**: Skip to next track

### speaker_prev
- **Name**: Previous
- **Type**: boolean
- **UI Component**: media
- **Description**: Skip to previous track

### speaker_stop
- **Name**: Stop
- **Type**: boolean
- **UI Component**: media
- **Compatibility**: >=12.2.0
- **Description**: Stop media playback

### speaker_shuffle
- **Name**: Shuffle
- **Type**: boolean
- **UI Component**: media
- **Description**: Enable/disable shuffle mode

### speaker_repeat
- **Name**: Repeat
- **Type**: enum
- **UI Component**: media
- **Description**: Set repeat mode (off, one, all)

### speaker_artist
- **Name**: Artist
- **Type**: string
- **UI Component**: media
- **Description**: Currently playing artist

### speaker_album
- **Name**: Album
- **Type**: string
- **UI Component**: media
- **Description**: Currently playing album

### speaker_track
- **Name**: Track
- **Type**: string
- **UI Component**: media
- **Description**: Currently playing track

### speaker_duration
- **Name**: Duration
- **Type**: number
- **UI Component**: media
- **Description**: Track duration in seconds

### speaker_position
- **Name**: Position
- **Type**: number
- **UI Component**: media
- **Description**: Current playback position in seconds

## Security & Access Control

### locked
- **Name**: Locked
- **Type**: boolean
- **UI Component**: toggle
- **Description**: Lock state (locked/unlocked)

### lock_mode
- **Name**: Lock mode
- **Type**: enum
- **UI Component**: picker
- **Description**: Lock operating mode

### homealarm_state
- **Name**: Home alarm state
- **Type**: enum
- **UI Component**: picker
- **Description**: Home security system state

## Door & Window Controls

### garagedoor_closed
- **Name**: Closed
- **Type**: boolean
- **UI Component**: toggle
- **Description**: Garage door closed state

### windowcoverings_state
- **Name**: Window coverings state
- **Type**: enum
- **UI Component**: ternary
- **Description**: Window covering state (up/idle/down)

### windowcoverings_closed
- **Name**: Closed
- **Type**: boolean
- **UI Component**: toggle
- **Description**: Window coverings closed state

### windowcoverings_set
- **Name**: Position
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Description**: Window coverings position (0-100%)

### windowcoverings_tilt_up
- **Name**: Window coverings tilt up
- **Type**: boolean
- **UI Component**: button
- **Description**: Tilt window coverings up

### windowcoverings_tilt_down
- **Name**: Window coverings tilt down
- **Type**: boolean
- **UI Component**: button
- **Description**: Tilt window coverings down

### windowcoverings_tilt_set
- **Name**: Window coverings tilt set
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Description**: Set window coverings tilt position

## Appliance Controls

### vacuumcleaner_state
- **Name**: Vacuum cleaner state
- **Type**: enum
- **UI Component**: picker
- **Description**: Vacuum cleaner operational state

### vacuumcleaner_job_mode
- **Name**: Vacuum cleaner job mode
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Vacuum cleaner cleaning mode

### dishwasher_program
- **Name**: Dishwasher program
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Active dishwasher program

### laundry_washer_program
- **Name**: Laundry washer program
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Active washing machine program

### laundry_washer_cycles
- **Name**: Laundry washer cycles
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Washing machine cycle selection

### laundry_washer_speed
- **Name**: Laundry washer speed
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Washing machine spin speed

### refrigerator_mode
- **Name**: Refrigerator Mode
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Refrigerator operating mode

## HVAC & Air Management

### fan_mode
- **Name**: Fan Mode
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Fan operating mode

### fan_speed
- **Name**: Fan Speed
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Fan speed percentage

### swing_mode
- **Name**: Swing mode
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Air conditioner swing mode

### oscillating
- **Name**: Oscillating
- **Type**: boolean
- **UI Component**: toggle
- **Compatibility**: >=12.2.0
- **Description**: Fan oscillation state

### heater_operation_mode
- **Name**: Heater Operation Mode
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Heater operating mode

### hot_water_mode
- **Name**: Hot water mode
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Hot water system mode

## Filter Status Capabilities

### measure_hepa_filter
- **Name**: HEPA Filter
- **Type**: number
- **Units**: %
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: HEPA filter remaining life

### measure_carbon_filter
- **Name**: Carbon Filter
- **Type**: number
- **Units**: %
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Carbon filter remaining life

### level_hepa_filter
- **Name**: HEPA filter level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: HEPA filter condition level

### level_carbon_filter
- **Name**: Carbon filter level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Carbon filter condition level

## Air Quality Levels

### level_aqi
- **Name**: Air quality level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Air quality level category

### level_co
- **Name**: CO level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Carbon monoxide level category

### level_co2
- **Name**: CO₂ Level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Carbon dioxide level category

### level_pm25
- **Name**: PM2.5 Level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: PM2.5 level category

### level_tvoc
- **Name**: TVOC Level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: TVOC level category

### level_ch2o
- **Name**: Formaldehyde Level
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Formaldehyde level category

## Physical Measurements

### measure_distance
- **Name**: Distance
- **Type**: number
- **Units**: m
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Distance measurement

### measure_weight
- **Name**: Weight
- **Type**: number
- **Units**: g
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Weight measurement

### measure_speed
- **Name**: Speed
- **Type**: number
- **Units**: m/s
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Speed measurement

### measure_rotation
- **Name**: Rotation
- **Type**: number
- **Units**: °
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Rotation angle measurement

## Technical Measurements

### measure_frequency
- **Name**: Frequency
- **Type**: number
- **Units**: Hz
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Frequency measurement

### measure_signal_strength
- **Name**: Signal Strength
- **Type**: number
- **Units**: dB
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Signal strength measurement

### measure_data_rate
- **Name**: Data Rate
- **Type**: number
- **Units**: b/s
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Data transmission rate

### measure_data_size
- **Name**: Data Size
- **Type**: number
- **Units**: bytes
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Data size measurement

## Utility & Consumption

### measure_water
- **Name**: Water flow
- **Type**: number
- **Units**: L/min
- **UI Component**: sensor
- **Description**: Water flow rate

### measure_content_volume
- **Name**: Volume
- **Type**: number
- **Units**: L
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Container volume measurement

### measure_monetary
- **Name**: Monetary value
- **Type**: number
- **Units**: €
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Cost/price measurement

### measure_ph
- **Name**: pH level
- **Type**: number
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: pH level measurement

## Device State Capabilities

### operational_state
- **Name**: Operational state
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Device operational status

### docked
- **Name**: Docked
- **Type**: boolean
- **UI Component**: sensor
- **Compatibility**: >=12.2.0
- **Description**: Device docking status (e.g., robot vacuum)

### mower_state
- **Name**: Mower state
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Robotic mower state

## Valve & Pump Controls

### valve_position
- **Name**: Valve position
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Valve opening percentage

### pump_mode
- **Name**: Pump mode
- **Type**: enum
- **UI Component**: picker
- **Compatibility**: >=12.2.0
- **Description**: Pump operating mode

### pump_setpoint
- **Name**: Pump setpoint
- **Type**: number
- **Units**: %
- **UI Component**: slider
- **Compatibility**: >=12.2.0
- **Description**: Pump target output level

## Electric Vehicle Charging

### ev_charging_state
- **Name**: Charging state
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.4.5
- **Description**: Electric vehicle charging status

### evcharger_charging_state
- **Name**: Charging state
- **Type**: enum
- **UI Component**: sensor
- **Compatibility**: >=12.4.5
- **Description**: EV charger charging status

### evcharger_charging
- **Name**: Charging
- **Type**: boolean
- **UI Component**: toggle
- **Compatibility**: >=12.4.5
- **Description**: EV charger active charging state

## Generic Controls

### button
- **Name**: Button
- **Type**: boolean
- **UI Component**: button
- **Description**: Generic button press capability

## Usage Notes for LLMs

1. **Capability Selection**: Choose capabilities based on device type and functionality
2. **Version Compatibility**: Check minimum Homey version requirements (>=12.2.0, etc.)
3. **UI Components**: Different capabilities use different interface elements:
   - `toggle`: On/off switches
   - `slider`: Value adjustment controls
   - `button`: Action triggers
   - `picker`: Dropdown/selection menus
   - `sensor`: Read-only displays
   - `thermostat`: Temperature controls
   - `battery`: Battery status displays
   - `media`: Media player controls
   - `color`: Color controls

4. **Data Types**:
   - `boolean`: true/false values
   - `number`: Numeric values with optional units
   - `string`: Text values
   - `enum`: Predefined options

5. **Units**: Common units include %, °C, W, V, A, ppm, μg/m³, dB, lx, km/h, etc.

6. **Naming Convention**: Capabilities follow patterns:
   - `measure_*`: Sensor readings
   - `alarm_*`: Alert/warning states
   - `target_*`: Setpoint values
   - `level_*`: Categorical levels
   - `meter_*`: Cumulative measurements
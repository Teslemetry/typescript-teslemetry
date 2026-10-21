import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { commandFailure, errorText, loadOptions, teslemetryRequest, toNodeError, vehicleOptions } from '../shared';

// The API numbers seats; the node offers their names.
const FRONT_SEATS: Record<string, number> = { front_left: 1, front_right: 2 };
const ALL_SEATS: Record<string, number> = {
	front_left: 0,
	front_right: 1,
	rear_left: 2,
	rear_center: 4,
	rear_right: 5,
};

/** Reads one node parameter of the item being processed. */
type Param = (name: string) => IDataObject[string];
type VehicleRequest = { method: IHttpRequestMethods; path: string; body?: IDataObject; qs?: IDataObject };

/** A signed vehicle command at command/<name>, with an optional JSON body. */
const command =
	(name: string, body?: (param: Param) => IDataObject) =>
	(param: Param): VehicleRequest => ({ method: 'POST', path: `command/${name}`, body: body?.(param) });

/** A Teslemetry custom command at custom_command/<name>. */
const customCommand =
	(name: string, body: (param: Param) => IDataObject) =>
	(param: Param): VehicleRequest => ({ method: 'POST', path: `custom_command/${name}`, body: body(param) });

/** A JSON parameter, which n8n hands over as text or, from an expression, already parsed. */
const jsonParam = (param: Param, name: string): IDataObject => {
	const value = param(name);
	return typeof value === 'string' ? jsonParse<IDataObject>(value) : (value as IDataObject);
};

// Each operation's request, relative to /api/1/vehicles/{vin}/.
const OPERATIONS: Record<string, (param: Param) => VehicleRequest> = {
	vehicleData: () => ({ method: 'GET', path: 'vehicle_data', qs: { use_cache: true } }),
	wakeUp: () => ({ method: 'POST', path: 'wake_up' }),
	flashLights: command('flash_lights'),
	honkHorn: command('honk_horn'),
	lockDoors: command('door_lock'),
	unlockDoors: command('door_unlock'),
	remoteStart: command('remote_start_drive'),
	actuateTrunk: command('actuate_trunk', (param) => ({ which_trunk: param('which_trunk') })),
	startAutoConditioning: command('auto_conditioning_start'),
	stopAutoConditioning: command('auto_conditioning_stop'),
	setTemps: command('set_temps', (param) => ({
		driver_temp: param('driver_temp'),
		passenger_temp: param('passenger_temp'),
	})),
	setSeatHeater: command('remote_seat_heater_request', (param) => ({
		heater: ALL_SEATS[param('heater') as string],
		level: param('level'),
	})),
	setSteeringWheelHeater: command('remote_steering_wheel_heater_request', (param) => ({ on: param('on') })),
	startCharging: command('charge_start'),
	stopCharging: command('charge_stop'),
	openChargePort: command('charge_port_door_open'),
	closeChargePort: command('charge_port_door_close'),
	setChargeLimit: command('set_charge_limit', (param) => ({ percent: param('percent') })),
	setChargingAmps: command('set_charging_amps', (param) => ({ charging_amps: param('charging_amps') })),
	setSentryMode: command('set_sentry_mode', (param) => ({ on: param('on') })),
	triggerHomelink: command('trigger_homelink', (param) => ({ lat: param('lat'), lon: param('lon') })),
	navigationRequest: command('navigation_request', (param) => ({ value: param('value') })),
	setSeatCooler: command('remote_seat_cooler_request', (param) => ({
		seat_position: FRONT_SEATS[param('front_seat_position') as string],
		seat_cooler_level: param('seat_cooler_level'),
	})),
	setAutoSeatClimate: command('remote_auto_seat_climate_request', (param) => ({
		auto_seat_position: FRONT_SEATS[param('front_seat_position') as string],
		auto_climate_on: param('auto_climate_on'),
	})),
	setAutoSteeringWheelHeat: command('remote_auto_steering_wheel_heat_climate_request', (param) => ({
		on: param('auto_climate_on'),
	})),
	setSteeringWheelHeatLevel: command('remote_steering_wheel_heat_level_request', (param) => ({
		level: param('steering_wheel_heat_level'),
	})),
	setCabinOverheatProtection: command('set_cabin_overheat_protection', (param) => ({
		on: param('auto_climate_on'),
		fan_only: param('fan_only'),
	})),
	setCopTemp: command('set_cop_temp', (param) => ({ cop_temp: param('cop_temp') })),
	setClimateKeeperMode: command('set_climate_keeper_mode', (param) => ({
		climate_keeper_mode: param('climate_keeper_mode'),
	})),
	setBioweaponDefenseMode: command('set_bioweapon_mode', (param) => ({
		on: param('auto_climate_on'),
		manual_override: param('manual_override'),
	})),
	setPreconditioningMax: command('set_preconditioning_max', (param) => ({
		on: param('auto_climate_on'),
		manual_override: param('manual_override'),
	})),
	windowControl: command('window_control', (param) => ({
		command: param('window_command'),
		lat: param('lat'),
		lon: param('lon'),
	})),
	sunRoofControl: command('sun_roof_control', (param) => ({ state: param('sunroof_state') })),
	tonneauControl: customCommand('closure', (param) => ({ tonneau: param('tonneau_command') })),
	setScheduledCharging: command('set_scheduled_charging', (param) => {
		const [hours, minutes] = (param('schedule_time') as string).split(':').map(Number);
		return { enable: param('schedule_enable'), time: hours * 60 + minutes };
	}),
	setScheduledDeparture: command('set_scheduled_departure', (param) =>
		jsonParam(param, 'scheduled_departure_body'),
	),
	addChargeSchedule: command('add_charge_schedule', (param) => jsonParam(param, 'charge_schedule_body')),
	removeChargeSchedule: command('remove_charge_schedule', (param) => ({ id: param('schedule_id') })),
	addPreconditionSchedule: command('add_precondition_schedule', (param) =>
		jsonParam(param, 'precondition_schedule_body'),
	),
	removePreconditionSchedule: command('remove_precondition_schedule', (param) => ({ id: param('schedule_id') })),
	chargeOnSolar: customCommand('charge_on_solar', (param) => ({
		enabled: param('solar_charging_enabled'),
		lowerChargeLimit: param('solar_lower_charge_limit'),
		upperChargeLimit: param('solar_upper_charge_limit'),
	})),
	chargeStandard: command('charge_standard'),
	chargeMaxRange: command('charge_max_range'),
	scheduleSoftwareUpdate: command('schedule_software_update', (param) => ({ offset_sec: param('offset_sec') })),
	cancelSoftwareUpdate: command('cancel_software_update'),
	adjustVolume: command('adjust_volume', (param) => ({ volume: param('volume') })),
};

export class TeslemetryVehicle implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Teslemetry Vehicle',
		name: 'teslemetryVehicle',
		icon: 'file:teslemetryVehicle.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Teslemetry Vehicle API',
		defaults: {
			name: 'Teslemetry Vehicle',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'teslemetryApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'VIN Name or ID',
				name: 'vin',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVins',
				},
				default: '',
				required: true,
				description: 'Vehicle Identification Number (VIN). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Charging', value: 'charging', description: 'Charge port, limits, amps and charge schedules' },
					{ name: 'Climate', value: 'climate', description: 'Cabin climate, seats, steering wheel and preconditioning' },
					{ name: 'Doors and Closure', value: 'closures', description: 'Locks, trunks, windows, sunroof and tonneau' },
					{ name: 'Vehicle', value: 'vehicle', description: 'Read data, wake, locate and other general commands' },
				],
				default: 'vehicle',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['vehicle'],
					},
				},
				options: [
					{
						name: 'Cancel Software Update',
						value: 'cancelSoftwareUpdate',
						action: 'Cancel a scheduled software update',
					},
					{
						name: 'Flash Lights',
						value: 'flashLights',
						action: 'Flash the lights',
					},
					{
						name: 'Get Vehicle Data',
						value: 'vehicleData',
						action: 'Get vehicle data',
					},
					{
						name: 'Honk Horn',
						value: 'honkHorn',
						action: 'Honk the horn',
					},
					{
						name: 'Navigation Request',
						value: 'navigationRequest',
						action: 'Send a navigation request to the vehicle',
					},
					{
						name: 'Remote Start',
						value: 'remoteStart',
						action: 'Remote start the vehicle',
					},
					{
						name: 'Schedule Software Update',
						value: 'scheduleSoftwareUpdate',
						action: 'Schedule a software update install',
					},
					{
						name: 'Set Sentry Mode',
						value: 'setSentryMode',
						action: 'Enable or disable sentry mode',
					},
					{
						name: 'Set Volume',
						value: 'adjustVolume',
						action: 'Set the absolute media volume',
					},
					{
						name: 'Trigger Homelink',
						value: 'triggerHomelink',
						action: 'Trigger homelink',
					},
					{
						name: 'Wake Up',
						value: 'wakeUp',
						action: 'Wake up the vehicle',
					},
				],
				default: 'vehicleData',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['closures'],
					},
				},
				options: [
					{
						name: 'Actuate Trunk',
						value: 'actuateTrunk',
						action: 'Open or close the trunk',
					},
					{
						name: 'Control Sunroof',
						value: 'sunRoofControl',
						action: 'Vent close or stop the sunroof',
					},
					{
						name: 'Control Tonneau',
						value: 'tonneauControl',
						action: 'Open or close the tonneau',
					},
					{
						name: 'Control Windows',
						value: 'windowControl',
						action: 'Vent or close the windows',
					},
					{
						name: 'Lock Doors',
						value: 'lockDoors',
						action: 'Lock the doors',
					},
					{
						name: 'Unlock Doors',
						value: 'unlockDoors',
						action: 'Unlock the doors',
					},
				],
				default: 'lockDoors',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['climate'],
					},
				},
				options: [
					{
						name: 'Add Precondition Schedule',
						value: 'addPreconditionSchedule',
						action: 'Add or update a repeating precondition schedule',
					},
					{
						name: 'Remove Precondition Schedule',
						value: 'removePreconditionSchedule',
						action: 'Remove a precondition schedule',
					},
					{
						name: 'Set Auto Seat Climate',
						value: 'setAutoSeatClimate',
						action: 'Enable or disable automatic seat climate',
					},
					{
						name: 'Set Auto Steering Wheel Heat',
						value: 'setAutoSteeringWheelHeat',
						action: 'Enable or disable automatic steering wheel heat',
					},
					{
						name: 'Set Bioweapon Defense Mode',
						value: 'setBioweaponDefenseMode',
						action: 'Enable or disable bioweapon defense mode',
					},
					{
						name: 'Set Cabin Overheat Protection',
						value: 'setCabinOverheatProtection',
						action: 'Enable or disable cabin overheat protection',
					},
					{
						name: 'Set Cabin Overheat Protection Temperature',
						value: 'setCopTemp',
						action: 'Set the cabin overheat protection temperature limit',
					},
					{
						name: 'Set Climate Keeper Mode',
						value: 'setClimateKeeperMode',
						action: 'Set climate keeper mode',
					},
					{
						name: 'Set Preconditioning Max',
						value: 'setPreconditioningMax',
						action: 'Enable or disable maximum power preconditioning',
					},
					{
						name: 'Set Seat Cooler',
						value: 'setSeatCooler',
						action: 'Set front seat cooler level',
					},
					{
						name: 'Set Seat Heater',
						value: 'setSeatHeater',
						action: 'Set seat heater level',
					},
					{
						name: 'Set Steering Wheel Heat Level',
						value: 'setSteeringWheelHeatLevel',
						action: 'Set steering wheel heat level',
					},
					{
						name: 'Set Steering Wheel Heater',
						value: 'setSteeringWheelHeater',
						action: 'Set steering wheel heater',
					},
					{
						name: 'Set Temperatures',
						value: 'setTemps',
						action: 'Set driver and passenger temperatures',
					},
					{
						name: 'Start HVAC',
						value: 'startAutoConditioning',
						action: 'Start auto conditioning',
					},
					{
						name: 'Stop HVAC',
						value: 'stopAutoConditioning',
						action: 'Stop auto conditioning',
					},
				],
				default: 'startAutoConditioning',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['charging'],
					},
				},
				options: [
					{
						name: 'Add Charge Schedule',
						value: 'addChargeSchedule',
						action: 'Add or update a repeating charge schedule',
					},
					{
						name: 'Charge on Solar',
						value: 'chargeOnSolar',
						action: 'Enable or disable charging on solar with limits',
					},
					{
						name: 'Charge to Max Range',
						value: 'chargeMaxRange',
						action: 'Set the charge limit to max range',
					},
					{
						name: 'Charge to Standard',
						value: 'chargeStandard',
						action: 'Set the charge limit to standard',
					},
					{
						name: 'Close Charge Port',
						value: 'closeChargePort',
						action: 'Close charge port',
					},
					{
						name: 'Open Charge Port',
						value: 'openChargePort',
						action: 'Open charge port',
					},
					{
						name: 'Remove Charge Schedule',
						value: 'removeChargeSchedule',
						action: 'Remove a charge schedule',
					},
					{
						name: 'Set Charge Limit',
						value: 'setChargeLimit',
						action: 'Set charge limit percentage',
					},
					{
						name: 'Set Charging Amps',
						value: 'setChargingAmps',
						action: 'Set charging amps',
					},
					{
						name: 'Set Scheduled Charging',
						value: 'setScheduledCharging',
						action: 'Enable or disable scheduled charging',
					},
					{
						name: 'Set Scheduled Departure',
						value: 'setScheduledDeparture',
						action: 'Set scheduled departure and off peak charging',
					},
					{
						name: 'Start Charging',
						value: 'startCharging',
						action: 'Start charging',
					},
					{
						name: 'Stop Charging',
						value: 'stopCharging',
						action: 'Stop charging',
					},
				],
				default: 'startCharging',
			},
			// Operation parameters
			{
				displayName: 'Which Trunk',
				name: 'which_trunk',
				type: 'options',
				options: [
					{ name: 'Rear', value: 'rear' },
					{ name: 'Front', value: 'front' },
				],
				default: 'rear',
				displayOptions: {
					show: {
						operation: ['actuateTrunk'],
					},
				},
			},
			{
				displayName: 'Driver Temp (C)',
				name: 'driver_temp',
				type: 'number',
				default: 20,
				displayOptions: {
					show: {
						operation: ['setTemps'],
					},
				},
			},
			{
				displayName: 'Passenger Temp (C)',
				name: 'passenger_temp',
				type: 'number',
				default: 20,
				displayOptions: {
					show: {
						operation: ['setTemps'],
					},
				},
			},
			{
				displayName: 'Seat Position',
				name: 'heater',
				type: 'options',
				options: [
					{ name: 'Front Left', value: 'front_left' },
					{ name: 'Front Right', value: 'front_right' },
					{ name: 'Rear Center', value: 'rear_center' },
					{ name: 'Rear Left', value: 'rear_left' },
					{ name: 'Rear Right', value: 'rear_right' },
				],
				default: 'front_left',
				displayOptions: {
					show: {
						operation: ['setSeatHeater'],
					},
				},
			},
			{
				displayName: 'Level (0-3)',
				name: 'level',
				type: 'number',
				typeOptions: {
					maxValue: 3,
					minValue: 0,
				},
				default: 3,
				displayOptions: {
					show: {
						operation: ['setSeatHeater'],
					},
				},
			},
			{
				displayName: 'On',
				name: 'on',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['setSteeringWheelHeater', 'setSentryMode'],
					},
				},
			},
			{
				displayName: 'Charge Limit (%)',
				name: 'percent',
				type: 'number',
				typeOptions: {
					maxValue: 100,
					minValue: 0,
				},
				default: 80,
				displayOptions: {
					show: {
						operation: ['setChargeLimit'],
					},
				},
			},
			{
				displayName: 'Charging Amps',
				name: 'charging_amps',
				type: 'number',
				default: 10,
				displayOptions: {
					show: {
						operation: ['setChargingAmps'],
					},
				},
			},
			{
				displayName: 'Latitude',
				name: 'lat',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: ['triggerHomelink', 'windowControl'],
					},
				},
			},
			{
				displayName: 'Longitude',
				name: 'lon',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: ['triggerHomelink', 'windowControl'],
					},
				},
			},
			{
				displayName: 'Destination',
				name: 'value',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['navigationRequest'],
					},
				},
				description: 'The destination address or coordinates to navigate to',
			},
			{
				displayName: 'Front Seat Position',
				name: 'front_seat_position',
				type: 'options',
				options: [
					{ name: 'Front Left', value: 'front_left' },
					{ name: 'Front Right', value: 'front_right' },
				],
				default: 'front_left',
				displayOptions: {
					show: {
						operation: ['setSeatCooler', 'setAutoSeatClimate'],
					},
				},
			},
			{
				displayName: 'Cooler Level (0-3)',
				name: 'seat_cooler_level',
				type: 'number',
				typeOptions: { maxValue: 3, minValue: 0 },
				default: 3,
				displayOptions: {
					show: {
						operation: ['setSeatCooler'],
					},
				},
			},
			{
				displayName: 'Steering Wheel Heat Level',
				name: 'steering_wheel_heat_level',
				type: 'options',
				options: [
					{ name: 'Off', value: 0 },
					{ name: 'Low', value: 1 },
					{ name: 'High', value: 3 },
				],
				default: 1,
				displayOptions: {
					show: {
						operation: ['setSteeringWheelHeatLevel'],
					},
				},
			},
			{
				displayName: 'On',
				name: 'auto_climate_on',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: [
							'setAutoSeatClimate',
							'setAutoSteeringWheelHeat',
							'setCabinOverheatProtection',
							'setBioweaponDefenseMode',
							'setPreconditioningMax',
						],
					},
				},
			},
			{
				displayName: 'Fan Only',
				name: 'fan_only',
				type: 'boolean',
				default: false,
				description: 'Whether cabin overheat protection should run the fan only, without air conditioning',
				displayOptions: {
					show: {
						operation: ['setCabinOverheatProtection'],
					},
				},
			},
			{
				displayName: 'Cabin Overheat Protection Temperature',
				name: 'cop_temp',
				type: 'options',
				options: [
					{ name: 'Low', value: 0 },
					{ name: 'Medium', value: 1 },
					{ name: 'High', value: 2 },
				],
				default: 1,
				displayOptions: {
					show: {
						operation: ['setCopTemp'],
					},
				},
			},
			{
				displayName: 'Climate Keeper Mode',
				name: 'climate_keeper_mode',
				type: 'options',
				options: [
					{ name: 'Off', value: 0 },
					{ name: 'On', value: 1 },
					{ name: 'Dog Mode', value: 2 },
					{ name: 'Camp Mode', value: 3 },
				],
				default: 0,
				displayOptions: {
					show: {
						operation: ['setClimateKeeperMode'],
					},
				},
			},
			{
				displayName: 'Manual Override',
				name: 'manual_override',
				type: 'boolean',
				default: false,
				description: 'Whether this was manually triggered by a person rather than automation',
				displayOptions: {
					show: {
						operation: ['setBioweaponDefenseMode', 'setPreconditioningMax'],
					},
				},
			},
			{
				displayName: 'Window Command',
				name: 'window_command',
				type: 'options',
				options: [
					{ name: 'Vent', value: 'vent' },
					{ name: 'Close', value: 'close' },
				],
				default: 'vent',
				displayOptions: {
					show: {
						operation: ['windowControl'],
					},
				},
			},
			{
				displayName: 'Sunroof State',
				name: 'sunroof_state',
				type: 'options',
				options: [
					{ name: 'Vent', value: 'vent' },
					{ name: 'Close', value: 'close' },
					{ name: 'Stop', value: 'stop' },
				],
				default: 'vent',
				displayOptions: {
					show: {
						operation: ['sunRoofControl'],
					},
				},
			},
			{
				displayName: 'Tonneau Command',
				name: 'tonneau_command',
				type: 'options',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'Close', value: 'close' },
				],
				default: 'open',
				description: 'Cybertruck tonneau only supports fully open/close, not intermediate positions',
				displayOptions: {
					show: {
						operation: ['tonneauControl'],
					},
				},
			},
			{
				displayName: 'Enable',
				name: 'schedule_enable',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['setScheduledCharging'],
					},
				},
			},
			{
				displayName: 'Charging Time (HH:Mm)',
				name: 'schedule_time',
				type: 'string',
				default: '00:00',
				description: 'Time of day charging should start, in the vehicle\'s local time',
				displayOptions: {
					show: {
						operation: ['setScheduledCharging'],
					},
				},
			},
			{
				displayName: 'Schedule ID',
				name: 'schedule_id',
				type: 'number',
				default: 0,
				description: 'The ID of an existing schedule to remove',
				displayOptions: {
					show: {
						operation: ['removeChargeSchedule', 'removePreconditionSchedule'],
					},
				},
			},
			{
				displayName: 'Scheduled Departure (JSON)',
				name: 'scheduled_departure_body',
				type: 'json',
				default:
					'{\n  "enable": true,\n  "departure_time": 480,\n  "preconditioning_enabled": true,\n  "off_peak_charging_enabled": true\n}',
				description: 'Body for setScheduledDeparture. departure_time/end_off_peak_time are minutes into the day (1:05 AM = 65).',
				displayOptions: {
					show: {
						operation: ['setScheduledDeparture'],
					},
				},
			},
			{
				displayName: 'Charge Schedule (JSON)',
				name: 'charge_schedule_body',
				type: 'json',
				default:
					'{\n  "days_of_week": "All",\n  "enabled": true,\n  "start_enabled": true,\n  "start_time": 60,\n  "end_enabled": false,\n  "lat": 0,\n  "lon": 0\n}',
				description: 'Body for addChargeSchedule. start_time/end_time are minutes into the day (1:05 AM = 65).',
				displayOptions: {
					show: {
						operation: ['addChargeSchedule'],
					},
				},
			},
			{
				displayName: 'Precondition Schedule (JSON)',
				name: 'precondition_schedule_body',
				type: 'json',
				default:
					'{\n  "days_of_week": "All",\n  "enabled": true,\n  "precondition_time": 420,\n  "lat": 0,\n  "lon": 0\n}',
				description: 'Body for addPreconditionSchedule. precondition_time is minutes into the day (1:05 AM = 65).',
				displayOptions: {
					show: {
						operation: ['addPreconditionSchedule'],
					},
				},
			},
			{
				displayName: 'Enabled',
				name: 'solar_charging_enabled',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['chargeOnSolar'],
					},
				},
			},
			{
				displayName: 'Lower Charge Limit (%)',
				name: 'solar_lower_charge_limit',
				type: 'number',
				typeOptions: { maxValue: 100, minValue: 0 },
				default: 50,
				displayOptions: {
					show: {
						operation: ['chargeOnSolar'],
					},
				},
			},
			{
				displayName: 'Upper Charge Limit (%)',
				name: 'solar_upper_charge_limit',
				type: 'number',
				typeOptions: { maxValue: 100, minValue: 0 },
				default: 90,
				displayOptions: {
					show: {
						operation: ['chargeOnSolar'],
					},
				},
			},
			{
				displayName: 'Offset (Seconds)',
				name: 'offset_sec',
				type: 'number',
				default: 0,
				description: 'Delay from now before the software update install begins',
				displayOptions: {
					show: {
						operation: ['scheduleSoftwareUpdate'],
					},
				},
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number',
				typeOptions: { numberPrecision: 2 },
				default: 5,
				description: 'Absolute volume on the vehicle\'s own scale (read MediaAudioVolumeMax via a Signal trigger for the ceiling)',
				displayOptions: {
					show: {
						operation: ['adjustVolume'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getVins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadOptions(this, () => vehicleOptions(this));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const vin = this.getNodeParameter('vin', itemIndex) as string;
				const build = OPERATIONS[operation];
				if (!build) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
				}
				const { method, path, body, qs } = build(
					(name) => this.getNodeParameter(name, itemIndex) as IDataObject[string],
				);
				const result = await teslemetryRequest(this, method, `/api/1/vehicles/${vin}/${path}`, {
					body,
					qs,
					itemIndex,
				});
				const failure = commandFailure(result);
				if (failure) {
					throw new NodeOperationError(this.getNode(), failure, { itemIndex });
				}
				returnData.push({ json: result, pairedItem: { item: itemIndex } });
			} catch (error: unknown) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: errorText(error) }, pairedItem: { item: itemIndex } });
					continue;
				}
				throw toNodeError(this.getNode(), error, itemIndex);
			}
		}
		return [returnData];
	}
}

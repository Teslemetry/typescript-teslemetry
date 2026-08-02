import { Teslemetry } from '@teslemetry/api';
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class TeslemetryVehicle implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Teslemetry Vehicle',
		name: 'teslemetryVehicle',
		icon: 'fa:car',
		group: ['transform'],
		version: 1,
		description: 'Interact with Teslemetry Vehicle API',
		defaults: {
			name: 'Teslemetry Vehicle',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'teslemetryApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'VIN',
				name: 'vin',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVins',
				},
				default: '',
				required: true,
				description: 'Vehicle Identification Number (VIN)',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Vehicle Data',
						value: 'vehicleData',
						action: 'Get vehicle data',
					},
					{
						name: 'Wake Up',
						value: 'wakeUp',
						action: 'Wake up the vehicle',
					},
					{
						name: 'Flash Lights',
						value: 'flashLights',
						action: 'Flash the lights',
					},
					{
						name: 'Honk Horn',
						value: 'honkHorn',
						action: 'Honk the horn',
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
					{
						name: 'Remote Start',
						value: 'remoteStart',
						action: 'Remote start the vehicle',
					},
					{
						name: 'Actuate Trunk',
						value: 'actuateTrunk',
						action: 'Open/Close trunk',
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
					{
						name: 'Set Temperatures',
						value: 'setTemps',
						action: 'Set driver and passenger temperatures',
					},
					{
						name: 'Set Seat Heater',
						value: 'setSeatHeater',
						action: 'Set seat heater level',
					},
					{
						name: 'Set Steering Wheel Heater',
						value: 'setSteeringWheelHeater',
						action: 'Set steering wheel heater',
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
					{
						name: 'Open Charge Port',
						value: 'openChargePort',
						action: 'Open charge port',
					},
					{
						name: 'Close Charge Port',
						value: 'closeChargePort',
						action: 'Close charge port',
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
						name: 'Set Sentry Mode',
						value: 'setSentryMode',
						action: 'Enable or disable sentry mode',
					},
					{
						name: 'Trigger Homelink',
						value: 'triggerHomelink',
						action: 'Trigger homelink',
					},
					{
						name: 'Navigation Request',
						value: 'navigationRequest',
						action: 'Send a navigation request to the vehicle',
					},
					{
						name: 'Set Seat Cooler',
						value: 'setSeatCooler',
						action: 'Set front seat cooler level',
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
						name: 'Set Steering Wheel Heat Level',
						value: 'setSteeringWheelHeatLevel',
						action: 'Set steering wheel heat level',
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
						name: 'Set Bioweapon Defense Mode',
						value: 'setBioweaponDefenseMode',
						action: 'Enable or disable bioweapon defense mode',
					},
					{
						name: 'Set Preconditioning Max',
						value: 'setPreconditioningMax',
						action: 'Enable or disable maximum power preconditioning',
					},
					{
						name: 'Control Windows',
						value: 'windowControl',
						action: 'Vent or close the windows',
					},
					{
						name: 'Control Sunroof',
						value: 'sunRoofControl',
						action: 'Vent, close, or stop the sunroof',
					},
					{
						name: 'Control Tonneau',
						value: 'tonneauControl',
						action: 'Open or close the Cybertruck tonneau',
					},
					{
						name: 'Set Scheduled Charging',
						value: 'setScheduledCharging',
						action: 'Enable or disable scheduled charging',
					},
					{
						name: 'Set Scheduled Departure',
						value: 'setScheduledDeparture',
						action: 'Set scheduled departure and off-peak charging',
					},
					{
						name: 'Add Charge Schedule',
						value: 'addChargeSchedule',
						action: 'Add or update a repeating charge schedule',
					},
					{
						name: 'Remove Charge Schedule',
						value: 'removeChargeSchedule',
						action: 'Remove a charge schedule',
					},
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
						name: 'Charge on Solar',
						value: 'chargeOnSolar',
						action: 'Enable or disable charging on solar with limits',
					},
					{
						name: 'Charge to Standard',
						value: 'chargeStandard',
						action: 'Set the charge limit to standard',
					},
					{
						name: 'Charge to Max Range',
						value: 'chargeMaxRange',
						action: 'Set the charge limit to max range',
					},
					{
						name: 'Schedule Software Update',
						value: 'scheduleSoftwareUpdate',
						action: 'Schedule a software update install',
					},
					{
						name: 'Cancel Software Update',
						value: 'cancelSoftwareUpdate',
						action: 'Cancel a scheduled software update',
					},
					{
						name: 'Set Volume',
						value: 'adjustVolume',
						action: 'Set the absolute media volume',
					},
				],
				default: 'vehicleData',
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
					{ name: 'Rear Left', value: 'rear_left' },
					{ name: 'Rear Center', value: 'rear_center' },
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
				displayName: 'Charging Time (HH:mm)',
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
				description:
					'Body for setScheduledDeparture. departure_time/end_off_peak_time are minutes into the day (1:05 AM = 65)',
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
				description: 'Body for addChargeSchedule. start_time/end_time are minutes into the day (1:05 AM = 65)',
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
				description: 'Body for addPreconditionSchedule. precondition_time is minutes into the day (1:05 AM = 65)',
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
				const credentials = await this.getCredentials('teslemetryApi');
				const teslemetry = new Teslemetry(credentials.accessToken as string);
				const response = await teslemetry.api.getVehicles();
				// The API returns { response: [...], count: ... }
				const vehicles = response.response || [];
				return vehicles.map((v: any) => ({
					name: `${v.display_name} (${v.vin})`,
					value: v.vin,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			const vin = this.getNodeParameter('vin', itemIndex) as string;

			const credentials = await this.getCredentials('teslemetryApi');
			const accessToken = credentials.accessToken as string;

			const teslemetry = new Teslemetry(accessToken);
			const vehicle = teslemetry.getVehicle(vin).api;

			let result;

			try {
				switch (operation) {
					case 'vehicleData':
						result = await vehicle.vehicleData();
						break;
					case 'wakeUp':
						result = await vehicle.wakeUp();
						break;
					case 'flashLights':
						result = await vehicle.flashLights();
						break;
					case 'honkHorn':
						result = await vehicle.honkHorn();
						break;
					case 'lockDoors':
						result = await vehicle.lockDoors();
						break;
					case 'unlockDoors':
						result = await vehicle.unlockDoors();
						break;
					case 'remoteStart':
						result = await vehicle.remoteStart();
						break;
					case 'actuateTrunk':
						const whichTrunk = this.getNodeParameter('which_trunk', itemIndex) as "front" | "rear";
						result = await vehicle.actuateTrunk(whichTrunk);
						break;
					case 'startAutoConditioning':
						result = await vehicle.startAutoConditioning();
						break;
					case 'stopAutoConditioning':
						result = await vehicle.stopAutoConditioning();
						break;
					case 'setTemps':
						const driverTemp = this.getNodeParameter('driver_temp', itemIndex) as number;
						const passengerTemp = this.getNodeParameter('passenger_temp', itemIndex) as number;
						result = await vehicle.setTemps(driverTemp, passengerTemp);
						break;
					case 'setSeatHeater':
						const heater = this.getNodeParameter('heater', itemIndex) as any;
						const level = this.getNodeParameter('level', itemIndex) as number;
						result = await vehicle.setSeatHeater(heater, level);
						break;
					case 'setSteeringWheelHeater':
						const swOn = this.getNodeParameter('on', itemIndex) as boolean;
						result = await vehicle.setSteeringWheelHeater(swOn);
						break;
					case 'startCharging':
						result = await vehicle.startCharging();
						break;
					case 'stopCharging':
						result = await vehicle.stopCharging();
						break;
					case 'openChargePort':
						result = await vehicle.openChargePort();
						break;
					case 'closeChargePort':
						result = await vehicle.closeChargePort();
						break;
					case 'setChargeLimit':
						const limit = this.getNodeParameter('percent', itemIndex) as number;
						result = await vehicle.setChargeLimit(limit);
						break;
					case 'setChargingAmps':
						const amps = this.getNodeParameter('charging_amps', itemIndex) as number;
						result = await vehicle.setChargingAmps(amps);
						break;
					case 'setSentryMode':
						const sentryOn = this.getNodeParameter('on', itemIndex) as boolean;
						result = await vehicle.setSentryMode(sentryOn);
						break;
					case 'triggerHomelink':
						const lat = this.getNodeParameter('lat', itemIndex) as number;
						const lon = this.getNodeParameter('lon', itemIndex) as number;
						result = await vehicle.triggerHomelink(lat, lon);
						break;
					case 'navigationRequest':
						const value = this.getNodeParameter('value', itemIndex) as string;
						result = await vehicle.navigationRequest({ value });
						break;
					case 'setSeatCooler': {
						const seatPosition = this.getNodeParameter('front_seat_position', itemIndex) as 'front_left' | 'front_right';
						const coolerLevel = this.getNodeParameter('seat_cooler_level', itemIndex) as number;
						result = await vehicle.setSeatCooler(seatPosition, coolerLevel);
						break;
					}
					case 'setAutoSeatClimate': {
						const seatPosition = this.getNodeParameter('front_seat_position', itemIndex) as 'front_left' | 'front_right';
						const autoClimateOn = this.getNodeParameter('auto_climate_on', itemIndex) as boolean;
						result = await vehicle.setAutoSeatClimate(seatPosition, autoClimateOn);
						break;
					}
					case 'setAutoSteeringWheelHeat': {
						const autoHeatOn = this.getNodeParameter('auto_climate_on', itemIndex) as boolean;
						result = await vehicle.setAutoSteeringWheelHeat(autoHeatOn);
						break;
					}
					case 'setSteeringWheelHeatLevel': {
						const heatLevel = this.getNodeParameter('steering_wheel_heat_level', itemIndex) as 0 | 1 | 3;
						result = await vehicle.setSteeringWheelHeatLevel(heatLevel);
						break;
					}
					case 'setCabinOverheatProtection': {
						const copOn = this.getNodeParameter('auto_climate_on', itemIndex) as boolean;
						const fanOnly = this.getNodeParameter('fan_only', itemIndex) as boolean;
						result = await vehicle.setCabinOverheatProtection({ on: copOn, fan_only: fanOnly });
						break;
					}
					case 'setCopTemp': {
						const copTemp = this.getNodeParameter('cop_temp', itemIndex) as 0 | 1 | 2;
						result = await vehicle.setCopTemp(copTemp);
						break;
					}
					case 'setClimateKeeperMode': {
						const keeperMode = this.getNodeParameter('climate_keeper_mode', itemIndex) as 0 | 1 | 2 | 3;
						result = await vehicle.setClimateKeeperMode(keeperMode);
						break;
					}
					case 'setBioweaponDefenseMode': {
						const bioweaponOn = this.getNodeParameter('auto_climate_on', itemIndex) as boolean;
						const bioweaponManualOverride = this.getNodeParameter('manual_override', itemIndex) as boolean;
						result = await vehicle.setBioweaponDefenseMode(bioweaponOn, bioweaponManualOverride);
						break;
					}
					case 'setPreconditioningMax': {
						const preconditioningOn = this.getNodeParameter('auto_climate_on', itemIndex) as boolean;
						const preconditioningManualOverride = this.getNodeParameter('manual_override', itemIndex) as boolean;
						result = await vehicle.setPreconditioningMax(preconditioningOn, preconditioningManualOverride);
						break;
					}
					case 'windowControl': {
						const windowCommand = this.getNodeParameter('window_command', itemIndex) as 'vent' | 'close';
						const windowLat = this.getNodeParameter('lat', itemIndex) as number;
						const windowLon = this.getNodeParameter('lon', itemIndex) as number;
						result = await vehicle.windowControl(windowCommand, windowLat, windowLon);
						break;
					}
					case 'sunRoofControl': {
						const sunroofState = this.getNodeParameter('sunroof_state', itemIndex) as 'vent' | 'close' | 'stop';
						result = await vehicle.sunRoofControl(sunroofState);
						break;
					}
					case 'tonneauControl': {
						const tonneauCommand = this.getNodeParameter('tonneau_command', itemIndex) as 'open' | 'close';
						result = await vehicle.closure({ tonneau: tonneauCommand });
						break;
					}
					case 'setScheduledCharging': {
						const scheduleEnable = this.getNodeParameter('schedule_enable', itemIndex) as boolean;
						const scheduleTime = this.getNodeParameter('schedule_time', itemIndex) as string;
						const [hours, minutes] = scheduleTime.split(':').map(Number);
						result = await vehicle.setScheduledCharging(scheduleEnable, hours * 60 + minutes);
						break;
					}
					case 'setScheduledDeparture': {
						const departureBody = JSON.parse(
							this.getNodeParameter('scheduled_departure_body', itemIndex) as string,
						);
						result = await vehicle.setScheduledDeparture(departureBody);
						break;
					}
					case 'addChargeSchedule': {
						const chargeScheduleBody = JSON.parse(
							this.getNodeParameter('charge_schedule_body', itemIndex) as string,
						);
						result = await vehicle.addChargeSchedule(chargeScheduleBody);
						break;
					}
					case 'removeChargeSchedule': {
						const chargeScheduleId = this.getNodeParameter('schedule_id', itemIndex) as number;
						result = await vehicle.removeChargeSchedule(chargeScheduleId);
						break;
					}
					case 'addPreconditionSchedule': {
						const preconditionScheduleBody = JSON.parse(
							this.getNodeParameter('precondition_schedule_body', itemIndex) as string,
						);
						result = await vehicle.addPreconditionSchedule(preconditionScheduleBody);
						break;
					}
					case 'removePreconditionSchedule': {
						const preconditionScheduleId = this.getNodeParameter('schedule_id', itemIndex) as number;
						result = await vehicle.removePreconditionSchedule(preconditionScheduleId);
						break;
					}
					case 'chargeOnSolar': {
						const solarEnabled = this.getNodeParameter('solar_charging_enabled', itemIndex) as boolean;
						const solarLower = this.getNodeParameter('solar_lower_charge_limit', itemIndex) as number;
						const solarUpper = this.getNodeParameter('solar_upper_charge_limit', itemIndex) as number;
						result = await vehicle.chargeOnSolar(solarEnabled, solarLower, solarUpper);
						break;
					}
					case 'chargeStandard':
						result = await vehicle.chargeStandard();
						break;
					case 'chargeMaxRange':
						result = await vehicle.chargeMaxRange();
						break;
					case 'scheduleSoftwareUpdate': {
						const offsetSec = this.getNodeParameter('offset_sec', itemIndex) as number;
						result = await vehicle.scheduleSoftwareUpdate(offsetSec);
						break;
					}
					case 'cancelSoftwareUpdate':
						result = await vehicle.cancelSoftwareUpdate();
						break;
					case 'adjustVolume': {
						const volume = this.getNodeParameter('volume', itemIndex) as number;
						result = await vehicle.adjustVolume(volume);
						break;
					}
					default:
						throw new Error(`Unknown operation: ${operation}`);
				}
				returnData.push({ json: result });

			} catch (error: unknown) {
				if (this.continueOnFail()) {
					const json = error instanceof Error ? { error: error.message } : { error: String(error) };
					returnData.push({ json });
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}

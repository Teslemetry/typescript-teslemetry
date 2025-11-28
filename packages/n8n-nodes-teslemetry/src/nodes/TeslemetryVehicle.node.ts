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
						operation: ['triggerHomelink'],
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
						operation: ['triggerHomelink'],
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
				const response = await teslemetry.api.vehicles();
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

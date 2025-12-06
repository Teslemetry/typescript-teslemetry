import { SseEvent, Teslemetry } from '@teslemetry/api';
import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';

export class TeslemetryTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Teslemetry Trigger',
		name: 'teslemetryTrigger',
		icon: 'fa:rss',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a Teslemetry event occurs',
		defaults: {
			name: 'Teslemetry Trigger',
		},
		inputs: [],
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
				description: 'Vehicle to monitor. Leave empty for all vehicles (where applicable).',
			},
			{
				displayName: 'Event Type',
				name: 'event',
				type: 'options',
				options: [
					{ name: 'All Events', value: 'all' },
					{ name: 'Data', value: 'data' },
					{ name: 'State', value: 'state' },
					{ name: 'Vehicle Data', value: 'vehicle_data' },
					{ name: 'Alerts', value: 'alerts' },
					{ name: 'Connectivity', value: 'connectivity' },
					{ name: 'Credits', value: 'credits' },
					{ name: 'Config', value: 'config' },
					{ name: 'Signal', value: 'signal' },
				],
				default: 'all',
				required: true,
			},
			{
				displayName: 'Signal Field',
				name: 'field',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFields',
				},
				default: '',
				displayOptions: {
					show: {
						event: ['signal'],
					},
				},
				description: 'The specific signal field to listen for',
			},
		],
	};

	methods = {
		loadOptions: {
			async getVins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('teslemetryApi');
				const teslemetry = new Teslemetry(credentials.accessToken as string);
				const response = await teslemetry.api.vehicles();
				const vehicles = response.response || [];
				return [
					{ name: 'All Vehicles', value: '' },
					...vehicles.map((v: any) => ({
						name: `${v.display_name} (${v.vin})`,
						value: v.vin,
					})),
				];
			},
			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('teslemetryApi');
				const teslemetry = new Teslemetry(credentials.accessToken as string);
				const fields = await teslemetry.api.fields();
				return Object.keys(fields).map((f) => ({
					name: f,
					value: f,
				}));
			},
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('teslemetryApi');
		const vin = this.getNodeParameter('vin') as string;
		const event = this.getNodeParameter('event') as string;
		const field = this.getNodeParameter('field', '') as string;

		const teslemetry = new Teslemetry(credentials.accessToken as string);
		const sse = teslemetry.sse;

		// Start connection
		sse.connect();

		let cleanup: () => void;

		const emit = (data: any) => {
			this.emit([this.helpers.returnJsonArray(data)]);
		};

		if (event === 'signal') {
			if (!vin) {
				throw new Error('VIN is required for Signal events');
			}
			if (!field) {
				throw new Error('Field is required for Signal events');
			}
			cleanup = sse
				.getVehicle(vin)
				.onSignal(field as any, (value: any) => {
					emit({ field, value, topic: 'signal' });
				});
		} else {
			const callback = (eventData: SseEvent) => {
				emit(eventData);
			};

			const vinParam = vin || null;

			switch (event) {
				case 'data':
					cleanup = sse.onData(callback, { vin: vinParam });
					break;
				case 'state':
					cleanup = sse.onState(callback, { vin: vinParam });
					break;
				case 'vehicle_data':
					cleanup = sse.onVehicleData(callback, { vin: vinParam });
					break;
				case 'alerts':
					cleanup = sse.onAlerts(callback, { vin: vinParam });
					break;
				case 'connectivity':
					cleanup = sse.onConnectivity(callback, { vin: vinParam });
					break;
				case 'credits':
					cleanup = sse.onCredits(callback);
					break;
				case 'config':
					cleanup = sse.onConfig(callback, { vin: vinParam });
					break;
				default: // all
					cleanup = sse.on(callback);
					break;
			}
		}

		async function closeFunction() {
			if (cleanup) cleanup();
			sse.disconnect();
		}

		return {
			closeFunction,
		};
	}
}

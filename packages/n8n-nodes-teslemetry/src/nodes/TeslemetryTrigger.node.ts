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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{ name: 'Vehicle', value: 'vehicle' },
					{ name: 'Energy Site', value: 'energySite' },
				],
				default: 'vehicle',
			},
			{
				displayName: 'VIN',
				name: 'vin',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVins',
				},
				default: '',
				description: 'Vehicle to monitor. Leave empty for all vehicles (where applicable).',
				displayOptions: {
					show: {
						resource: ['vehicle'],
					},
				},
			},
			{
				displayName: 'Site ID',
				name: 'siteId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				default: '',
				description: 'Energy site to monitor. Leave empty for all sites.',
				displayOptions: {
					show: {
						resource: ['energySite'],
					},
				},
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
					{ name: 'Errors', value: 'errors' },
					{ name: 'Alerts', value: 'alerts' },
					{ name: 'Connectivity', value: 'connectivity' },
					{ name: 'Credits', value: 'credits' },
					{ name: 'Config', value: 'config' },
					{ name: 'Signal', value: 'signal' },
				],
				default: 'all',
				required: true,
				displayOptions: {
					show: {
						resource: ['vehicle'],
					},
				},
			},
			{
				displayName: 'Event Type',
				name: 'event',
				type: 'options',
				options: [
					{ name: 'Live Status', value: 'live_status' },
					{ name: 'Site Info', value: 'site_info' },
					{ name: 'Tariff Content', value: 'tariff_content_v2' },
					{ name: 'Energy Totals', value: 'energy_totals' },
				],
				default: 'live_status',
				required: true,
				displayOptions: {
					show: {
						resource: ['energySite'],
					},
				},
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
						resource: ['vehicle'],
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
				const response = await teslemetry.api.getVehicles();
				const vehicles = response.response || [];
				return [
					{ name: 'All Vehicles', value: '' },
					...vehicles.map((v: any) => ({
						name: `${v.display_name} (${v.vin})`,
						value: v.vin,
					})),
				];
			},
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('teslemetryApi');
				const teslemetry = new Teslemetry(credentials.accessToken as string);
				const response = await teslemetry.api.getProducts();
				const products = response.response || [];
				const sites = products.filter(
					(p: any) => p.resource_type === 'battery' || p.resource_type === 'solar' || 'energy_site_id' in p,
				);
				return [
					{ name: 'All Sites', value: '' },
					...sites.map((s: any) => ({
						name: `${s.site_name || s.energy_site_id} (${s.energy_site_id})`,
						value: s.energy_site_id,
					})),
				];
			},
			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('teslemetryApi');
				const teslemetry = new Teslemetry(credentials.accessToken as string);
				const fields = await teslemetry.api.getFields();
				return Object.keys(fields).map((f) => ({
					name: f,
					value: f,
				}));
			},
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('teslemetryApi');
		const resource = this.getNodeParameter('resource') as string;
		const event = this.getNodeParameter('event') as string;

		const teslemetry = new Teslemetry(credentials.accessToken as string);
		const sse = teslemetry.sse;

		let cleanup: () => void;

		const emit = (data: any) => {
			this.emit([this.helpers.returnJsonArray(data)]);
		};

		if (resource === 'energySite') {
			const siteId = this.getNodeParameter('siteId') as string;

			// live_status/site_info/tariff_content_v2 carry `site_id`; energy_totals carries `id` instead.
			const callback = (eventData: any) => {
				const eventSiteId = 'site_id' in eventData ? eventData.site_id : eventData.id;
				if (!siteId || String(eventSiteId) === String(siteId)) {
					emit(eventData);
				}
			};

			const eventType = event as 'live_status' | 'site_info' | 'tariff_content_v2' | 'energy_totals';
			sse.on(eventType, callback);
			cleanup = () => sse.off(eventType, callback);
		} else {
			const vin = this.getNodeParameter('vin') as string;
			const field = this.getNodeParameter('field', '') as string;

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
				// Create callback that filters by VIN if specified
				const callback = (eventData: SseEvent) => {
					if (!vin || ('vin' in eventData && eventData.vin === vin)) {
						emit(eventData);
					}
				};

				// Determine event type to listen for
				const eventType = event as
					| 'all'
					| 'data'
					| 'state'
					| 'vehicle_data'
					| 'errors'
					| 'alerts'
					| 'connectivity'
					| 'credits'
					| 'config';

				sse.on(eventType, callback);
				cleanup = () => sse.off(eventType, callback);
			}
		}

		// Registered before connect() so a terminal auth failure on the very first
		// attempt still reaches emitError instead of racing an unattached stream.
		const onStreamError = (payload: { error: unknown; status?: number; retries: number }) => {
			this.logger.warn(
				`Teslemetry stream error (attempt ${payload.retries}): ${String(payload.error)}`,
			);
		};
		const onDisconnect = () => {
			this.logger.warn('Teslemetry stream disconnected');
		};
		const onAuthFailure = (error: Error) => {
			this.emitError(error);
		};
		sse.on('stream_error', onStreamError);
		sse.on('disconnect', onDisconnect);
		sse.on('auth_failure', onAuthFailure);

		sse.connect();

		let closed = false;
		async function closeFunction() {
			if (closed) return;
			closed = true;
			if (cleanup) cleanup();
			sse.off('stream_error', onStreamError);
			sse.off('disconnect', onDisconnect);
			sse.off('auth_failure', onAuthFailure);
			await sse.disconnect();
		}

		return {
			closeFunction,
		};
	}
}

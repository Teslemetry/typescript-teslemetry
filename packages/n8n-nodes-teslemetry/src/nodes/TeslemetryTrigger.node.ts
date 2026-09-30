import { SseEvent } from '@teslemetry/api';
import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	NodeOperationError,
} from 'n8n-workflow';
import { createTeslemetry, errorText, loadWithTeslemetry, TeslemetryRequestError, toNodeError } from '../shared';

// Answers the user has to act on, by status. 429 is here because the API
// answers repeated bad-token attempts with it, and because the stream caps the
// number of connections per account.
const STREAM_REFUSALS: Record<number, string> = {
	401: 'Teslemetry rejected the access token',
	403: 'Teslemetry rejected the access token',
	402: 'Teslemetry requires an active subscription',
	429: 'Teslemetry is limiting requests or stream connections for this account',
};

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
				return loadWithTeslemetry(this, async (teslemetry) => {
					const response = await teslemetry.api.getVehicles();
					const vehicles = response.response || [];
					return [
						{ name: 'All Vehicles', value: '' },
						...vehicles.map((v: any) => ({
							name: `${v.display_name} (${v.vin})`,
							value: v.vin,
						})),
					];
				});
			},
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadWithTeslemetry(this, async (teslemetry) => {
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
				});
			},
			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadWithTeslemetry(this, async (teslemetry) => {
					const fields = await teslemetry.api.getFields();
					return Object.keys(fields).map((f) => ({
						name: f,
						value: f,
					}));
				});
			},
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('teslemetryApi');
		const resource = this.getNodeParameter('resource') as string;
		const event = this.getNodeParameter('event') as string;

		if (resource !== 'energySite' && event === 'signal') {
			if (!this.getNodeParameter('vin')) {
				throw new NodeOperationError(this.getNode(), 'VIN is required for Signal events');
			}
			if (!this.getNodeParameter('field', '')) {
				throw new NodeOperationError(this.getNode(), 'Field is required for Signal events');
			}
		}

		const teslemetry = createTeslemetry(credentials.accessToken as string, this.logger);
		const sse = teslemetry.sse;

		// connect() returns before the stream answers, so without this check a
		// trigger with a bad token activates, fails at runtime, and is reactivated
		// by n8n in a loop. Failing here makes activation itself fail, which n8n
		// reports to the user and retries with its own backoff. The test endpoint
		// has the stream's requirements: a valid token and an active subscription.
		try {
			await teslemetry.api.test();
		} catch (error) {
			const refusal = error instanceof TeslemetryRequestError && error.status && STREAM_REFUSALS[error.status];
			if (refusal) {
				throw toNodeError(this.getNode(), error, undefined, `${refusal}: ${errorText(error)}`);
			}
			// Anything else (an outage, a network drop) is left to the stream's own retries.
			this.logger.warn(`Teslemetry check before connecting failed: ${errorText(error)}`);
		}

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
		let reportedRefusal: number | undefined;
		const onStreamError = (payload: { error: unknown; status?: number; retries: number }) => {
			const { status } = payload;
			// A subscription that lapses or a connection cap reached while the
			// stream is running: the SDK keeps retrying, so name it once instead of
			// on every attempt.
			if (status === 402 || status === 429) {
				if (reportedRefusal === status) return;
				reportedRefusal = status;
				const error = new NodeOperationError(this.getNode(), `${STREAM_REFUSALS[status]} (HTTP ${status})`);
				// The check in trigger() catches 402 but cannot see the stream's
				// connection cap, so in an active workflow a 429 reported through
				// emitError would be reactivated straight back into the same 429.
				if (status === 402 || this.getMode() === 'manual') {
					this.emitError(error);
				} else {
					this.logger.error(`${error.message}. The stream keeps retrying.`);
				}
				return;
			}
			this.logger.warn(
				`Teslemetry stream error (attempt ${payload.retries}): ${String(payload.error)}`,
			);
		};
		const onDisconnect = () => {
			this.logger.warn('Teslemetry stream disconnected');
		};
		const onAuthFailure = (error: Error & { status?: number }) => {
			const status = error.status ?? 401;
			this.emitError(new NodeOperationError(this.getNode(), `${STREAM_REFUSALS[status]} (HTTP ${status})`));
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

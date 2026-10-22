import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { loadOptions, siteOptions, teslemetryRequest, toNodeError, vehicleOptions } from '../shared';

// Snapshot topics that map a name (a telemetry field, a network interface) to
// a `{ value, createdAt }` leaf. Every other topic holds one value.
const MAP_TOPICS = ['data', 'connectivity'];
const VEHICLE_TOPICS = ['data', 'state', 'connectivity', 'alerts', 'errors', 'vehicle_data'];

/** One value the trigger watches, under the key its last-seen copy is stored by. */
type Reading = { key: string; topic: string; name?: string; value: unknown };

/** Splits a cached telemetry snapshot into the readings for the chosen event. */
function vehicleReadings(snapshot: IDataObject, event: string, field: string): Reading[] {
	if (event === 'signal') {
		const leaf = (snapshot.data as IDataObject | undefined)?.[field];
		return leaf === undefined ? [] : [{ key: `signal.${field}`, topic: 'signal', name: field, value: leaf }];
	}
	const readings: Reading[] = [];
	for (const topic of event === 'all' ? VEHICLE_TOPICS : [event]) {
		const value = snapshot[topic];
		if (value === undefined) continue;
		if (MAP_TOPICS.includes(topic) && value && typeof value === 'object') {
			for (const [name, leaf] of Object.entries(value)) {
				readings.push({ key: `${topic}.${name}`, topic, name, value: leaf });
			}
		} else {
			readings.push({ key: topic, topic, value });
		}
	}
	return readings;
}

/** Turns the changed readings into one output item per topic. */
function vehicleItems(vin: string, changed: Reading[]): IDataObject[] {
	const items = new Map<string, IDataObject>();
	for (const reading of changed) {
		if (reading.topic === 'signal') {
			const leaf = (reading.value ?? {}) as IDataObject;
			items.set(reading.key, { vin, topic: 'signal', field: reading.name, value: leaf.value, createdAt: leaf.createdAt });
			continue;
		}
		const item = items.get(reading.topic) ?? { vin, topic: reading.topic };
		if (reading.name === undefined) {
			item[reading.topic] = reading.value as IDataObject;
		} else {
			item[reading.topic] = { ...(item[reading.topic] as IDataObject | undefined), [reading.name]: reading.value };
		}
		items.set(reading.topic, item);
	}
	return [...items.values()];
}

export class TeslemetryTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Teslemetry Trigger',
		name: 'teslemetryTrigger',
		icon: 'file:teslemetry.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description:
			"Starts the workflow when a vehicle's cached telemetry or an energy site's status changes, checked on a schedule",
		defaults: {
			name: 'Teslemetry Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'teslemetryApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'Checks Teslemetry on the Poll Times schedule and starts the workflow for each value that changed since the last check. Vehicle checks read the cached telemetry, which never wakes the car and costs no credits.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Vehicle', value: 'vehicle' },
					{ name: 'Energy Site', value: 'energySite' },
				],
				default: 'vehicle',
			},
			{
				displayName: 'VIN Name or ID',
				name: 'vin',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVins',
				},
				default: '',
				required: true,
				description:
					'Vehicle to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						resource: ['vehicle'],
					},
				},
			},
			{
				displayName: 'Site Name or ID',
				name: 'siteId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				default: '',
				required: true,
				description:
					'Energy site to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				noDataExpression: true,
				options: [
					{ name: 'Alerts', value: 'alerts' },
					{ name: 'Any Change', value: 'all', description: 'Any change to the topics below' },
					{ name: 'Connectivity', value: 'connectivity', description: 'A network interface connected or disconnected' },
					{ name: 'Data', value: 'data', description: 'Any telemetry field changed' },
					{ name: 'Errors', value: 'errors' },
					{ name: 'Signal', value: 'signal', description: 'One telemetry field changed' },
					{ name: 'State', value: 'state', description: 'The vehicle went online, asleep or offline' },
					{ name: 'Vehicle Data', value: 'vehicle_data' },
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
				noDataExpression: true,
				options: [
					{
						name: 'Live Status',
						value: 'live_status',
						description: 'Power flows, battery level and grid status (refreshed about every 30 seconds)',
					},
					{
						name: 'Site Info',
						value: 'site_info',
						description: 'Settings such as backup reserve and operation mode (refreshed about every 5 minutes)',
					},
					{ name: 'Tariff Content', value: 'tariff_content_v2', description: 'The site tariff changed or was removed' },
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
				displayName: 'Signal Field Name or ID',
				name: 'field',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFields',
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['vehicle'],
						event: ['signal'],
					},
				},
				description:
					'The telemetry field to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getVins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadOptions(this, () => vehicleOptions(this));
			},
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadOptions(this, () => siteOptions(this));
			},
			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadOptions(this, async () => {
					const fields = await teslemetryRequest(this, 'GET', '/fields.json');
					return Object.keys(fields).map((field) => ({ name: field, value: field }));
				});
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const resource = this.getNodeParameter('resource') as string;
		const event = this.getNodeParameter('event') as string;

		let readings: Reading[];
		let toItems: (changed: Reading[]) => IDataObject[];
		let subject: string;
		try {
			if (resource === 'energySite') {
				const siteId = this.getNodeParameter('siteId') as string;
				if (!siteId) throw new NodeOperationError(this.getNode(), 'Choose the energy site to watch');
				subject = `site:${siteId}:${event}`;
				const path = event === 'live_status' ? 'live_status' : 'site_info';
				const { response } = await teslemetryRequest<{ response?: IDataObject }>(
					this,
					'GET',
					`/api/1/energy_sites/${siteId}/${path}`,
				);
				// tariff_content_v2 is null when the site's tariff was removed, which is a
				// change worth reporting; absent means the site has never had one.
				const value = event === 'tariff_content_v2' ? response?.tariff_content_v2 : response;
				readings = value === undefined ? [] : [{ key: event, topic: event, value }];
				toItems = (changed) =>
					changed.map((reading) =>
						event === 'tariff_content_v2'
							? { site_id: siteId, tariff_content_v2: reading.value as IDataObject }
							: { site_id: siteId, ...(reading.value as IDataObject) },
					);
			} else {
				const vin = this.getNodeParameter('vin') as string;
				const field = event === 'signal' ? (this.getNodeParameter('field', '') as string) : '';
				if (!vin) throw new NodeOperationError(this.getNode(), 'Choose the vehicle to watch');
				if (event === 'signal' && !field) {
					throw new NodeOperationError(this.getNode(), 'Choose the field to watch for Signal events');
				}
				subject = `vehicle:${vin}:${event}:${field}`;
				const qs: IDataObject = {};
				if (event === 'signal') qs.fields = field;
				else if (event !== 'all') qs.topics = event;
				const { response } = await teslemetryRequest<{ response?: IDataObject }>(
					this,
					'GET',
					`/api/1/vehicles/${vin}/telemetry`,
					{ qs },
				);
				readings = vehicleReadings(response ?? {}, event, field);
				toItems = (changed) => vehicleItems(vin, changed);
			}
		} catch (error) {
			throw toNodeError(this.getNode(), error);
		}

		// A manual test run shows the current values; it does not move the baseline.
		if (this.getMode() === 'manual') {
			const items = toItems(readings);
			return items.length ? [this.helpers.returnJsonArray(items)] : null;
		}

		// The first check after activation, or after the watched subject changed,
		// only records a baseline: a value is new only against an earlier one.
		const staticData = this.getWorkflowStaticData('node') as { subject?: string; seen?: Record<string, string> };
		const firstCheck = staticData.subject !== subject || !staticData.seen;
		const seen: Record<string, string> = firstCheck ? {} : { ...staticData.seen };
		const changed: Reading[] = [];
		for (const reading of readings) {
			const serialized = JSON.stringify(reading.value);
			if (seen[reading.key] !== serialized) {
				seen[reading.key] = serialized;
				changed.push(reading);
			}
		}
		staticData.subject = subject;
		staticData.seen = seen;
		if (firstCheck || changed.length === 0) return null;
		return [this.helpers.returnJsonArray(toItems(changed))];
	}
}

import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { errorText, loadOptions, siteOptions, teslemetryRequest, toNodeError } from '../shared';

type Metadata = { energy_sites?: Record<string, { paired?: boolean | null }> };

// Signed gateway commands: Teslemetry's key must be verified on the gateway.
const PAIRED_OPERATIONS = ['dispatchBatteryPower', 'resumeBatteryOperation', 'setIslandMode'];

type SiteInfo = { response?: { tariff_id?: unknown; tariff_content?: unknown; tariff_content_v2?: unknown } };

// Each operation's request, relative to /api/1/energy_sites/{id}/.
const OPERATIONS: Record<
	string,
	(param: (name: string) => IDataObject[string]) => { method: IHttpRequestMethods; path: string; body?: IDataObject }
> = {
	getLiveStatus: () => ({ method: 'GET', path: 'live_status' }),
	getSiteInfo: () => ({ method: 'GET', path: 'site_info' }),
	setBackupReserve: (param) => ({
		method: 'POST',
		path: 'backup',
		body: { backup_reserve_percent: param('backup_reserve_percent') },
	}),
	setOperationMode: (param) => ({
		method: 'POST',
		path: 'operation',
		body: { default_real_mode: param('default_real_mode') },
	}),
	setStormMode: (param) => ({ method: 'POST', path: 'storm_mode', body: { enabled: param('enabled') } }),
	gridImportExport: (param) => ({
		method: 'POST',
		path: 'grid_import_export',
		body: {
			customer_preferred_export_rule: param('customer_preferred_export_rule'),
			disallow_charge_from_grid_with_solar_installed: param('disallow_charge_from_grid_with_solar_installed'),
		},
	}),
	setOffGridVehicleChargingReserve: (param) => ({
		method: 'POST',
		path: 'off_grid_vehicle_charging_reserve',
		body: { off_grid_vehicle_charging_reserve_percent: param('off_grid_vehicle_charging_reserve_percent') },
	}),
	dispatchBatteryPower: (param) => ({
		method: 'POST',
		path: 'command/dispatch_battery_power',
		body: { power_watts: param('power_watts'), duration_seconds: param('duration_seconds') },
	}),
	resumeBatteryOperation: () => ({ method: 'POST', path: 'command/resume_battery_operation' }),
	setIslandMode: (param) => {
		const mode = param('island_mode');
		// Some gateways only open the grid contactor when forced.
		return { method: 'POST', path: 'command/set_island_mode', body: mode === 6 ? { mode, force: true } : { mode } };
	},
};

export class TeslemetryEnergy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Teslemetry Energy',
		name: 'teslemetryEnergy',
		icon: 'file:teslemetryEnergy.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Teslemetry Energy API',
		defaults: {
			name: 'Teslemetry Energy',
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
				displayName: 'Site Name or ID',
				name: 'siteId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSites',
					loadOptionsDependsOn: ['operation'],
				},
				default: '',
				required: true,
				description: 'Energy Site ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Setting',
						value: 'settings',
						description: 'Backup reserve, operation mode, storm mode, grid rules, battery dispatch and island mode',
					},
					{ name: 'Status', value: 'status', description: 'Live status, site information and tariff' },
				],
				default: 'status',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['status'],
					},
				},
				options: [
					{
						name: 'Get Live Status',
						value: 'getLiveStatus',
						action: 'Get live status',
					},
					{
						name: 'Get Site Info',
						value: 'getSiteInfo',
						action: 'Get site info',
					},
					{
						name: 'Get Tariff',
						value: 'getTariff',
						action: 'Get tariff TOU rates',
					},
				],
				default: 'getLiveStatus',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['settings'],
					},
				},
				options: [
					{
						name: 'Dispatch Battery Power',
						value: 'dispatchBatteryPower',
						action: 'Dispatch battery power',
						description: "Lists only sites with Teslemetry's key verified on the gateway",
					},
					{
						name: 'Resume Battery Operation',
						value: 'resumeBatteryOperation',
						action: 'Resume normal battery operation',
						description: "End a battery power dispatch early. Lists only sites with Teslemetry's key verified on the gateway.",
					},
					{
						name: 'Set Backup Reserve',
						value: 'setBackupReserve',
						action: 'Set backup reserve percentage',
					},
					{
						name: 'Set Grid Import/Export',
						value: 'gridImportExport',
						action: 'Set grid import export rules',
					},
					{
						name: 'Set Island Mode',
						value: 'setIslandMode',
						action: 'Go off grid or reconnect to the grid',
						description:
							"Going off-grid runs the home from the battery until reconnected. Lists only sites with Teslemetry's key verified on the gateway.",
					},
					{
						name: 'Set Off-Grid Charge Reserve',
						value: 'setOffGridVehicleChargingReserve',
						action: 'Set off grid vehicle charging reserve',
					},
					{
						name: 'Set Operation Mode',
						value: 'setOperationMode',
						action: 'Set operation mode',
					},
					{
						name: 'Set Storm Mode',
						value: 'setStormMode',
						action: 'Set storm mode',
					},
				],
				default: 'setBackupReserve',
			},
			// Params
			{
				displayName: 'Backup Reserve (%)',
				name: 'backup_reserve_percent',
				type: 'number',
				default: 20,
				typeOptions: { maxValue: 100, minValue: 0 },
				displayOptions: {
					show: {
						operation: ['setBackupReserve'],
					},
				},
			},
			{
				displayName: 'Mode',
				name: 'default_real_mode',
				type: 'options',
				options: [
					{ name: 'Self Consumption', value: 'self_consumption' },
					{ name: 'Backup', value: 'backup' },
					{ name: 'Autonomous', value: 'autonomous' },
				],
				default: 'autonomous',
				displayOptions: {
					show: {
						operation: ['setOperationMode'],
					},
				},
			},
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['setStormMode'],
					},
				},
			},
			{
				displayName: 'Export Rule',
				name: 'customer_preferred_export_rule',
				type: 'options',
				options: [
					{ name: 'Battery OK', value: 'battery_ok' },
					{ name: 'PV Only', value: 'pv_only' },
					{ name: 'Never', value: 'never' },
				],
				default: 'battery_ok',
				displayOptions: {
					show: {
						operation: ['gridImportExport'],
					},
				},
			},
			{
				displayName: 'Disallow Charge From Grid',
				name: 'disallow_charge_from_grid_with_solar_installed',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['gridImportExport'],
					},
				},
			},
			{
				displayName: 'Power (W)',
				name: 'power_watts',
				type: 'number',
				default: 0,
				typeOptions: { maxValue: 100000, minValue: -100000 },
				description:
					'Battery power in watts: positive discharges the battery, negative charges it. Starting a new dispatch replaces the previous one.',
				displayOptions: {
					show: {
						operation: ['dispatchBatteryPower'],
					},
				},
			},
			{
				displayName: 'Duration (Seconds)',
				name: 'duration_seconds',
				type: 'number',
				default: 3600,
				typeOptions: { maxValue: 86400, minValue: 1, numberPrecision: 0 },
				description: 'How long to dispatch for. When it ends, the battery returns to normal operation by itself.',
				displayOptions: {
					show: {
						operation: ['dispatchBatteryPower'],
					},
				},
			},
			{
				displayName: 'Island Mode',
				name: 'island_mode',
				type: 'options',
				options: [
					{
						name: 'Go Off-Grid',
						value: 6,
						description: 'Disconnect from the grid. The whole home runs from the battery until you reconnect.',
					},
					{ name: 'Reconnect to Grid', value: 1 },
				],
				default: 1,
				description:
					'The gateway can refuse to go off-grid, for example when the battery is low. Check island_status from Get Live Status afterwards.',
				displayOptions: {
					show: {
						operation: ['setIslandMode'],
					},
				},
			},
			{
				displayName: 'Off-Grid Reserve (%)',
				name: 'off_grid_vehicle_charging_reserve_percent',
				type: 'number',
				default: 20,
				typeOptions: { maxValue: 100, minValue: 0 },
				displayOptions: {
					show: {
						operation: ['setOffGridVehicleChargingReserve'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadOptions(this, async () => {
					const sites = await siteOptions(this);
					if (!PAIRED_OPERATIONS.includes(this.getCurrentNodeParameter('operation') as string)) return sites;
					const { energy_sites } = await teslemetryRequest<Metadata>(this, 'GET', '/api/metadata');
					return sites.filter((site) => energy_sites?.[String(site.value)]?.paired === true);
				});
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const siteId = this.getNodeParameter('siteId', itemIndex) as number;
				const base = `/api/1/energy_sites/${siteId}/`;

				let result: IDataObject;
				if (operation === 'getTariff') {
					// The tariff has no endpoint of its own; it is part of site_info.
					const { response } = await teslemetryRequest<SiteInfo>(this, 'GET', `${base}site_info`, {
						itemIndex,
					});
					result = {
						response: {
							tariff_id: response?.tariff_id,
							tariff_content: response?.tariff_content,
							tariff_content_v2: response?.tariff_content_v2,
						},
					};
				} else {
					const build = OPERATIONS[operation];
					if (!build) {
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
					}
					const { method, path, body } = build(
						(name) => this.getNodeParameter(name, itemIndex) as IDataObject[string],
					);
					result = await teslemetryRequest(this, method, `${base}${path}`, { body, itemIndex });
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

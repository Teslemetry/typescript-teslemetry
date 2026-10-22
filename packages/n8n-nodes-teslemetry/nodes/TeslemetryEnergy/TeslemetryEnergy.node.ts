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
					{ name: 'Setting', value: 'settings', description: 'Backup reserve, operation mode, storm mode and grid rules' },
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
				return loadOptions(this, () => siteOptions(this));
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

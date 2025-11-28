import { Teslemetry } from '@teslemetry/api';
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class TeslemetryEnergy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Teslemetry Energy',
		name: 'teslemetryEnergy',
		icon: 'fa:bolt',
		group: ['transform'],
		version: 1,
		description: 'Interact with Teslemetry Energy API',
		defaults: {
			name: 'Teslemetry Energy',
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
				displayName: 'Site ID',
				name: 'siteId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				default: '',
				required: true,
				description: 'Energy Site ID',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
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
						name: 'Set Backup Reserve',
						value: 'setBackupReserve',
						action: 'Set backup reserve percentage',
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
					{
						name: 'Set Grid Import/Export',
						value: 'gridImportExport',
						action: 'Set grid import/export rules',
					},
					{
						name: 'Set Off-Grid Charge Reserve',
						value: 'setOffGridVehicleChargingReserve',
						action: 'Set off-grid vehicle charging reserve',
					},
				],
				default: 'getLiveStatus',
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
				const credentials = await this.getCredentials('teslemetryApi');
				const teslemetry = new Teslemetry(credentials.accessToken as string);
				const response = await teslemetry.api.products();
                const products = response.response || [];
                const sites = products.filter((p: any) => p.resource_type === "battery" || p.resource_type === "solar" || "energy_site_id" in p);
				return sites.map((s: any) => ({
					name: `${s.site_name || s.energy_site_id} (${s.energy_site_id})`,
					value: s.energy_site_id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			const siteId = this.getNodeParameter('siteId', itemIndex) as number;

			const credentials = await this.getCredentials('teslemetryApi');
			const accessToken = credentials.accessToken as string;

			const teslemetry = new Teslemetry(accessToken);
			const energy = teslemetry.energySite(siteId);

			let result;

			try {
				switch (operation) {
					case 'getLiveStatus':
						result = await energy.getLiveStatus();
						break;
					case 'getSiteInfo':
						result = await energy.getSiteInfo();
						break;
					case 'setBackupReserve':
						const reserve = this.getNodeParameter('backup_reserve_percent', itemIndex) as number;
						result = await energy.setBackupReserve(reserve);
						break;
					case 'setOperationMode':
						const mode = this.getNodeParameter('default_real_mode', itemIndex) as any;
						result = await energy.setOperationMode(mode);
						break;
					case 'setStormMode':
						const enabled = this.getNodeParameter('enabled', itemIndex) as boolean;
						result = await energy.setStormMode(enabled);
						break;
					case 'gridImportExport':
						const rule = this.getNodeParameter('customer_preferred_export_rule', itemIndex) as any;
						const disallow = this.getNodeParameter('disallow_charge_from_grid_with_solar_installed', itemIndex) as boolean;
						result = await energy.gridImportExport(rule, disallow);
						break;
					case 'setOffGridVehicleChargingReserve':
						const offGridReserve = this.getNodeParameter('off_grid_vehicle_charging_reserve_percent', itemIndex) as number;
						result = await energy.setOffGridVehicleChargingReserve(offGridReserve);
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

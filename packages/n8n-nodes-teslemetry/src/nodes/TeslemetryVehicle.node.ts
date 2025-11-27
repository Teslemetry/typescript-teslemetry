import { Teslemetry } from '@teslemetry/api';
import {
	IExecuteFunctions,
} from 'n8n-workflow';
import {
	INodeExecutionData,
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Vehicle Data',
						value: 'getVehicleData',
						description: 'Get vehicle data',
					},
					// Add more operations here later, e.g., 'sendWakeUpCommand', 'lockDoors'
				],
				default: 'getVehicleData',
				description: 'The operation to perform.',
			},
			{
				displayName: 'VIN',
				name: 'vin',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getVehicleData',
						],
					},
				},
				description: 'Vehicle Identification Number (VIN)',
			},
		],
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
			const vehicle = teslemetry.getVehicle(vin);

			try {
				if (operation === 'getVehicleData') {
					const data = await vehicle.api.vehicleData();
					returnData.push({ json: data });
				}
				// Add more operation handling here
			} catch (error: unknown) {
				if (this.continueOnFail()) {
					if (error instanceof Error) {
						returnData.push({ json: { error: error.message } });
					} else {
						returnData.push({ json: { error: String(error) } });
					}
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}

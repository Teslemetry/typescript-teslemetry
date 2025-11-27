import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TeslemetryApi implements ICredentialType {
	name = 'teslemetryApi';
	displayName = 'Teslemetry API';
	documentationUrl = 'https://docs.teslemetry.com';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			typeOptions: { password: true },
			placeholder: 'YOUR_TESLEMETRY_ACCESS_TOKEN',
			description: 'Your Teslemetry Access Token',
		},
	];
}

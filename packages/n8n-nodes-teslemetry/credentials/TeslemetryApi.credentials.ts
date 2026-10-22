import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class TeslemetryApi implements ICredentialType {
	name = 'teslemetryApi';
	displayName = 'Teslemetry API';
	documentationUrl = 'https://teslemetry.com/docs';
	icon: Icon = 'file:teslemetry.svg';
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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.teslemetry.com',
			url: '/api/test',
		},
	};
}

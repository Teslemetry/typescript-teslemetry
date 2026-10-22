import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
	IPollFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export const CREDENTIAL_TYPE = 'teslemetryApi';
export const BASE_URL = 'https://api.teslemetry.com';

type TeslemetryContext = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

/**
 * The error n8n shows for a failed request, built from the API's failure
 * answer: the `{ response: null, error: "<code>", error_description: "<text>" }`
 * envelope, or a bare string for a non-JSON answer such as a proxy's error page.
 * Only the text and status are kept, never the request, so the credential
 * cannot reach the error.
 */
function apiError(node: INode, body: unknown, status: number, itemIndex?: number): NodeApiError {
	let text: string | undefined;
	let code: string | undefined;
	if (typeof body === 'string') {
		// A proxy's HTML error page is not worth showing; a short plain-text answer is.
		const trimmed = body.trim();
		if (trimmed && trimmed.length <= 200 && !trimmed.includes('<')) text = trimmed;
	} else if (body && typeof body === 'object') {
		const envelope = body as { error?: unknown; error_description?: unknown };
		if (typeof envelope.error === 'string' && envelope.error) code = envelope.error;
		text =
			typeof envelope.error_description === 'string' && envelope.error_description
				? envelope.error_description
				: code;
	}
	const message = text ?? `Teslemetry API request failed (HTTP ${status})`;
	const details = [code === message ? undefined : code, `HTTP ${status}`].filter(Boolean).join(', ');
	return new NodeApiError(
		node,
		{ message },
		{ message, description: `Teslemetry API answered: ${details}`, httpCode: String(status), itemIndex },
	);
}

/**
 * Sends one request to the Teslemetry API with the node's credential, through
 * n8n's own HTTP helper. A non-2xx answer throws a `NodeApiError` with the
 * API's text and status, a request that got no answer one without a status.
 */
export async function teslemetryRequest<T = IDataObject>(
	context: TeslemetryContext,
	method: IHttpRequestMethods,
	path: string,
	options: { body?: IDataObject; qs?: IDataObject; itemIndex?: number } = {},
): Promise<T> {
	const request: IHttpRequestOptions = {
		method,
		baseURL: BASE_URL,
		url: path,
		headers: { 'X-Library': 'n8n-nodes-teslemetry' },
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (options.body) request.body = options.body;
	if (options.qs) request.qs = options.qs;

	let response: { body: unknown; statusCode: number };
	try {
		response = await context.helpers.httpRequestWithAuthentication.call(context, CREDENTIAL_TYPE, request);
	} catch (error) {
		const message = `Could not reach the Teslemetry API: ${errorText(error)}`;
		throw new NodeApiError(context.getNode(), { message }, { message, itemIndex: options.itemIndex });
	}
	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw apiError(context.getNode(), response.body, response.statusCode, options.itemIndex);
	}
	return response.body as T;
}

/** The text an error item or a log line should carry for a failure. */
export function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Passes n8n's own errors through and wraps anything else in a `NodeOperationError`. */
export function toNodeError(node: INode, error: unknown, itemIndex?: number): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) return error;
	return new NodeOperationError(node, error instanceof Error ? error : errorText(error), { itemIndex });
}

/** Runs a dropdown loader, surfacing failures with the API's text. */
export async function loadOptions<T>(context: ILoadOptionsFunctions, load: () => Promise<T>): Promise<T> {
	try {
		return await load();
	} catch (error) {
		throw toNodeError(context.getNode(), error);
	}
}

type Vehicle = { vin: string; display_name?: string };
type Product = { energy_site_id?: number; site_name?: string; resource_type?: string };

/** The account's vehicles as dropdown options. */
export async function vehicleOptions(context: ILoadOptionsFunctions) {
	const { response } = await teslemetryRequest<{ response?: Vehicle[] }>(context, 'GET', '/api/1/vehicles');
	return (response ?? []).map((vehicle) => ({
		name: `${vehicle.display_name} (${vehicle.vin})`,
		value: vehicle.vin,
	}));
}

/** The account's energy sites as dropdown options. */
export async function siteOptions(context: ILoadOptionsFunctions) {
	const { response } = await teslemetryRequest<{ response?: Product[] }>(context, 'GET', '/api/1/products');
	return (response ?? [])
		.filter(
			(product): product is Product & { energy_site_id: number } =>
				product.resource_type === 'battery' || product.resource_type === 'solar' || 'energy_site_id' in product,
		)
		.map((site) => ({
			name: `${site.site_name || site.energy_site_id} (${site.energy_site_id})`,
			value: site.energy_site_id,
		}));
}

// A command Tesla or the car did not carry out still answers HTTP 200, with
// `result: false` and a reason. These reasons mean the car is already in the
// requested state, so they are not failures.
const BENIGN_COMMAND_REASONS = ['already_set', 'not_charging', 'requested'];

/** The failure text for a command answered with `result: false`, or undefined when it succeeded. */
export function commandFailure(result: unknown): string | undefined {
	const response = (result as { response?: { result?: unknown; reason?: unknown } } | null | undefined)?.response;
	if (!response || typeof response !== 'object' || response.result !== false) return undefined;
	const reason = typeof response.reason === 'string' ? response.reason : '';
	if (BENIGN_COMMAND_REASONS.includes(reason)) return undefined;
	return reason ? `Command failed: ${reason}` : 'Command failed with no reason given';
}

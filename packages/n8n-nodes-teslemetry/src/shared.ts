import { Teslemetry } from '@teslemetry/api';
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

type N8nLogger = IExecuteFunctions['logger'];

/** A failed Teslemetry request, carrying the text to show the user. */
export class TeslemetryRequestError extends Error {
	constructor(
		message: string,
		readonly status?: number,
		readonly code?: string,
	) {
		super(message);
		this.name = 'TeslemetryRequestError';
	}
}

// Every request carries the access token as a query parameter, so a query
// string must never reach a log line or an error message.
function stripQueryStrings(text: string): string {
	return text.replace(/\?[\w.~%-]+=[^\s"'<>)]*/g, '');
}

/**
 * The generated client throws the response body as-is: the API's
 * `{ response: null, error: "<code>", error_description: "<text>" }` envelope,
 * a bare string for a non-JSON answer, or a fetch error when nothing answered.
 * None of those carries the HTTP status, and the envelope has no `message`.
 */
function toRequestError(error: unknown, status?: number): TeslemetryRequestError {
	if (error instanceof TeslemetryRequestError) return error;
	let text: string | undefined;
	let code: string | undefined;
	if (error instanceof Error) {
		const cause = (error.cause as { code?: unknown } | undefined)?.code;
		text = status
			? error.message
			: `Could not reach the Teslemetry API: ${error.message}${typeof cause === 'string' ? ` (${cause})` : ''}`;
	} else if (typeof error === 'string') {
		// A proxy's HTML error page is not worth showing; a short plain-text answer is.
		const body = error.trim();
		if (body && body.length <= 200 && !body.includes('<')) text = body;
	} else if (error && typeof error === 'object') {
		const body = error as { error?: unknown; error_description?: unknown };
		if (typeof body.error === 'string' && body.error) code = body.error;
		text = typeof body.error_description === 'string' && body.error_description ? body.error_description : code;
	}
	text ??= status ? `Teslemetry API request failed (HTTP ${status})` : 'Teslemetry API request failed';
	return new TeslemetryRequestError(stripQueryStrings(text), status, code);
}

function formatLogArgument(argument: unknown): string {
	if (typeof argument === 'string') return argument;
	if (argument instanceof Error) return `${argument.name}: ${argument.message}`;
	try {
		return JSON.stringify(argument) ?? String(argument);
	} catch {
		return String(argument);
	}
}

/**
 * Builds the SDK client for one execution. Its log lines go to n8n's logger
 * (the SDK default is `console`, which n8n's log level does not filter), and
 * its request failures are thrown as `TeslemetryRequestError`.
 */
export function createTeslemetry(accessToken: string, logger: N8nLogger): Teslemetry {
	const forward =
		(level: 'debug' | 'warn' | 'error') =>
		(...args: unknown[]) =>
			logger[level](stripQueryStrings(args.map(formatLogArgument).join(' ')));
	const teslemetry = new Teslemetry(accessToken, {
		logger: {
			debug: forward('debug'),
			// The SDK's info lines narrate every client and connection ("Started
			// local cache"), which is per-execution noise at n8n's default level.
			info: forward('debug'),
			warn: forward('warn'),
			error: forward('error'),
		},
	});
	teslemetry.client.interceptors.error.use((error, response) => toRequestError(error, response?.status));
	return teslemetry;
}

/** The text an error item or a log line should carry for a failure. */
export function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Wraps a failure in the error class n8n renders: an API failure becomes a
 * `NodeApiError` with the API's own text and HTTP status, anything else (bad
 * input, an unknown operation) a `NodeOperationError`.
 */
export function toNodeError(
	node: INode,
	error: unknown,
	itemIndex?: number,
	message = errorText(error),
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) return error;
	if (error instanceof TeslemetryRequestError) {
		const code = error.code === message ? undefined : error.code;
		const details = [code, error.status && `HTTP ${error.status}`].filter(Boolean).join(', ');
		return new NodeApiError(
			node,
			{ message },
			{
				message,
				description: details ? `Teslemetry API answered: ${details}` : undefined,
				httpCode: error.status?.toString(),
				itemIndex,
			},
		);
	}
	return new NodeOperationError(node, error instanceof Error ? error : message, { itemIndex });
}

/** Runs a dropdown loader against the node's credential, surfacing failures with the API's text. */
export async function loadWithTeslemetry<T>(
	context: ILoadOptionsFunctions,
	load: (teslemetry: Teslemetry) => Promise<T>,
): Promise<T> {
	const credentials = await context.getCredentials('teslemetryApi');
	const teslemetry = createTeslemetry(credentials.accessToken as string, context.logger);
	try {
		return await load(teslemetry);
	} catch (error) {
		throw toNodeError(context.getNode(), error);
	}
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

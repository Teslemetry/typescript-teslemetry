import assert from "node:assert/strict";
import type { IHttpRequestOptions } from "n8n-workflow";

type Handler = (request: Request) => Promise<Response> | Response;

let currentHandler: Handler | undefined;

/** Answers every request the fake contexts' n8n HTTP helper sends with `handler` while `run` runs. */
export function withMockedFetch<T>(handler: Handler, run: () => Promise<T>): Promise<T> {
  currentHandler = handler;
  return run().finally(() => {
    currentHandler = undefined;
  });
}

/**
 * Stand-in for n8n's `httpRequestWithAuthentication`: applies the credential's
 * bearer header, sends the request to the current handler as a fetch Request,
 * and answers the way n8n's axios-based helper does - a JSON body parsed, any
 * other body as text, and with `ignoreHttpStatusErrors` no throw on a failure status.
 */
export async function fakeHttpRequestWithAuthentication(credentialType: string, options: IHttpRequestOptions) {
  assert.equal(credentialType, "teslemetryApi");
  if (!currentHandler) throw new Error("no request handler is mocked");
  const url = new URL(options.url, options.baseURL);
  for (const [key, value] of Object.entries(options.qs ?? {})) url.searchParams.set(key, String(value));
  const request = new Request(url, {
    method: options.method ?? "GET",
    headers: { ...(options.headers as Record<string, string>), Authorization: "Bearer token" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await currentHandler(request);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: n8n hands over the text.
  }
  if (!options.ignoreHttpStatusErrors && !response.ok) throw new Error(`HTTP ${response.status}`);
  return options.returnFullResponse ? { body, headers: {}, statusCode: response.status, statusMessage: response.statusText } : body;
}

/** The `helpers` a fake context carries. */
export const fakeHelpers = {
  httpRequestWithAuthentication: fakeHttpRequestWithAuthentication,
  returnJsonArray: (data: unknown) => (Array.isArray(data) ? data : [data]).map((json) => ({ json })),
};

/** Captures the last request seen by withMockedFetch and always answers with `body`. */
export function captureRequest(body: unknown = { response: {} }) {
  let request: Request | undefined;
  const handler = async (req: Request) => {
    request = req;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { handler, getRequest: () => request };
}

/** The node n8n's error classes attach to a failure. */
export const fakeNode = {
  id: "1",
  name: "Teslemetry",
  type: "teslemetry",
  typeVersion: 1,
  position: [0, 0],
  parameters: {},
};

/** Stand-in for n8n's logger that records every line as "<level>: <message>". */
export function fakeLogger() {
  const lines: string[] = [];
  const log = (level: string) => (message: string) => {
    lines.push(`${level}: ${message}`);
  };
  return {
    lines,
    logger: { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") },
  };
}

/** A failed response in the api's error envelope. */
export function apiError(status: number, error: string, error_description: string) {
  return new Response(JSON.stringify({ response: null, error, error_description }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** What the api answers, and the text each node must show for it. */
export const API_FAILURES = [
  {
    name: "a rejected token (401)",
    response: () => apiError(401, "invalid_token", "Invalid authentication token"),
    message: "Invalid authentication token",
    httpCode: "401",
  },
  {
    name: "a lapsed subscription (402)",
    response: () => apiError(402, "subscription_required", "Active subscription required"),
    message: "Active subscription required",
    httpCode: "402",
  },
  {
    // Tesla's own envelope, relayed: the text is in `error` and the description is empty.
    name: "a sleeping vehicle (408)",
    response: () => apiError(408, 'vehicle unavailable: {:error=>"vehicle unavailable:"}', ""),
    message: 'vehicle unavailable: {:error=>"vehicle unavailable:"}',
    httpCode: "408",
  },
  {
    name: "a plain-text 500",
    response: () => new Response("Internal Server Error", { status: 500 }),
    message: "Internal Server Error",
    httpCode: "500",
  },
  {
    name: "a proxy's HTML 502",
    response: () => new Response("<html><body><h1>502 Bad Gateway</h1></body></html>", { status: 502 }),
    message: "Teslemetry API request failed (HTTP 502)",
    httpCode: "502",
  },
];

/** Asserts a thrown node error shows `message`, carries `httpCode`, and leaks no token. */
export function assertApiFailure(error: unknown, expected: { message: string; httpCode: string }, itemIndex?: number) {
  const nodeError = error as Error & { httpCode?: string; context?: { itemIndex?: number } };
  assert.equal(nodeError.name, "NodeApiError");
  assert.equal(nodeError.message, expected.message);
  assert.equal(nodeError.httpCode, expected.httpCode);
  assert.equal(nodeError.context?.itemIndex, itemIndex);
  assert.ok(!JSON.stringify(nodeError).includes("Bearer"), "the error must not carry the credential");
  return true;
}

/** Minimal IExecuteFunctions stand-in driving one item per params entry through execute(). */
export function fakeExecuteContext(itemsParams: Array<Record<string, unknown>>, continueOnFail = false) {
  const context = {
    getNode: () => fakeNode,
    logger: fakeLogger().logger,
    getInputData: () => itemsParams.map(() => ({ json: {} })),
    getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) =>
      name in itemsParams[itemIndex] ? itemsParams[itemIndex][name] : fallback,
    continueOnFail: () => continueOnFail,
    helpers: fakeHelpers,
  };
  return context as never;
}

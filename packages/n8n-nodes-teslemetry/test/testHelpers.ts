import assert from "node:assert/strict";

export function withMockedFetch<T>(
  handler: (request: Request) => Promise<Response> | Response,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const response = await handler(request);
    // A real response carries its request URL, access token included.
    Object.defineProperty(response, "url", { value: request.url });
    return response;
  }) as typeof fetch;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

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
  assert.ok(!JSON.stringify(nodeError).includes("token="), "the error must not carry the request URL");
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
    getCredentials: async () => ({ accessToken: "token" }),
    continueOnFail: () => continueOnFail,
    prepareOutputData: (data: unknown) => [data],
  };
  return context as never;
}

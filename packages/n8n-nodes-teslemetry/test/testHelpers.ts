export function withMockedFetch<T>(
  handler: (request: Request) => Promise<Response> | Response,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(new Request(input, init))) as typeof fetch;
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

/** Minimal IExecuteFunctions stand-in driving one item per params entry through execute(). */
export function fakeExecuteContext(itemsParams: Array<Record<string, unknown>>, continueOnFail = false) {
  const context = {
    getInputData: () => itemsParams.map(() => ({ json: {} })),
    getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) =>
      name in itemsParams[itemIndex] ? itemsParams[itemIndex][name] : fallback,
    getCredentials: async () => ({ accessToken: "token" }),
    continueOnFail: () => continueOnFail,
    prepareOutputData: (data: unknown) => [data],
  };
  return context as never;
}

import type { Teslemetry } from "../Teslemetry.js";

type Client = Teslemetry["client"];

/** HTTP statuses a next backend may recover from. Every other status is the device or API refusing the request. */
const FAILOVER_SAFE_STATUSES: ReadonlySet<number> = new Set([
  401, 402, 403, 408, 429, 500, 502, 503, 504,
]);

/** Clients that already have the marking interceptor. */
const marked = new WeakSet<Client>();

/** Adds a non-enumerable property, leaving a same-named key of the body alone so the body still serializes as received. */
function defineHidden(target: object, key: string, value: unknown): void {
  if (Object.hasOwn(target, key)) return;
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

/** Marks a value for `is_failover_safe`. A primitive cannot carry a mark and stays as it is. */
function mark(value: unknown, status: number | undefined, failover_safe: boolean): void {
  if (typeof value !== "object" || value === null) return;
  if (!Object.isExtensible(value)) return;
  defineHidden(value, "status", status);
  defineHidden(value, "failover_safe", failover_safe);
}

/**
 * The rejection stays the value the SDK rejects today, because consumers branch
 * on it: Homey rethrows any `Error` before its `invalid_token` refresh, so
 * turning a body into an `Error` would silently disable that refresh. Only the
 * hidden `status` and `failover_safe` are added, and neither can carry a URL,
 * which matters because the token can travel in the query string.
 */
function markRejection(error: unknown, response: Response | undefined): unknown {
  const status = response?.status;
  // With no response, nothing reached the API.
  const failover_safe = status === undefined || FAILOVER_SAFE_STATUSES.has(status);
  // The client replaces a falsy rejection (an empty body) with `{}` after the
  // interceptors run, so the mark has to go on that `{}`.
  const rejection = error || {};
  mark(rejection, status, failover_safe);
  return rejection;
}

/** Registers the marking interceptor, once per client: `Teslemetry.client` is shared by every SDK method. */
export function markRejections(client: Client): void {
  if (marked.has(client)) return;
  marked.add(client);
  client.interceptors.error.use(markRejection);
}

/** The client behind a `TeslemetryVehicleApi` or `TeslemetryEnergyApi`, whose `root` is TS-private. */
export function clientOf(api: object): Client {
  return (api as unknown as { root: Pick<Teslemetry, "client"> }).root.client;
}

/** The wake deadline passing: the API answered, so this failure is the compat layer's own and is a real `Error`. */
export function vehicleOffline(): Error {
  const error = new Error("The vehicle did not come online before the deadline");
  error.name = "VehicleOffline";
  mark(error, undefined, true);
  return error;
}

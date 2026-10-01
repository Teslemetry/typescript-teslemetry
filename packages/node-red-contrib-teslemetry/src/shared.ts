import { Node } from "node-red";
import {
  Products,
  Teslemetry,
  TeslemetryStream,
  TeslemetryStreamAuthError,
  TeslemetryStreamErrorEvent,
} from "@teslemetry/api";

export type Instance = {
  teslemetry: Teslemetry;
  products: Promise<Products>;
  error?: string; // Set while the products fetch is failing; cleared on retry success
};

export const instances = new Map<string, Instance>();

/** Request URLs carry the access token as `?token=`, so any URL in an error
 *  text loses its whole query string before it can reach a status or a log. */
function stripUrlQueries(text: string): string {
  return text.replace(/(https?:\/\/[^\s?#"'<>]+)[?#][^\s"'<>]*/g, "$1");
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function describeError(error: unknown): string | undefined {
  if (error instanceof Error) {
    // Node's fetch reports every network failure as "fetch failed" and keeps
    // the reason (ECONNREFUSED, ENOTFOUND, a timeout) on `cause`.
    const { cause } = error as {
      cause?: { message?: unknown; code?: unknown };
    };
    const reason =
      nonEmptyString(cause?.message) ?? nonEmptyString(cause?.code);
    const message = nonEmptyString(error.message);
    if (!reason || reason === message) return message;
    return message ? `${message}: ${reason}` : reason;
  }

  // The generated client throws a non-JSON error body as the raw text
  if (typeof error === "string") return nonEmptyString(error);

  // ...and a JSON one as the parsed object. Tesla-shaped errors send an empty
  // `error_description` with the reason in `error`, so skip empty strings.
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const text =
      nonEmptyString(obj.error_description) ??
      nonEmptyString(obj.error) ??
      nonEmptyString(obj.message);
    if (text) return text;

    if (obj.response && typeof obj.response === "object") {
      const resp = obj.response as Record<string, unknown>;
      if (resp.status)
        return `HTTP ${resp.status}: ${resp.statusText || "Error"}`;
    }

    if (Object.keys(obj).length === 0) return undefined;

    // Last resort: try to stringify
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return error ? String(error) : undefined;
}

/**
 * Extract a useful error message from any error type.
 * Handles Error objects, hey-api response objects, and plain objects.
 */
export function getErrorMessage(error: unknown): string {
  return stripUrlQueries(describeError(error) ?? "Unknown error");
}

/** Longest error text shown under a node; the full text still reaches Catch nodes. */
const MAX_STATUS_LENGTH = 100;

/**
 * Fail an input message: show the reason under the node and hand it to
 * `done`, so Catch nodes fire with the message and Complete nodes do not.
 */
export function failInput(
  node: Node,
  done: (err?: Error) => void,
  error: unknown,
): void {
  const text = getErrorMessage(error);
  node.status({
    fill: "red",
    shape: "ring",
    text:
      text.length > MAX_STATUS_LENGTH
        ? `${text.slice(0, MAX_STATUS_LENGTH - 1)}…`
        : text,
  });
  // Passed as a string: Node-RED stringifies whatever it is given into the
  // Catch message's `error.message`, which would prefix an Error with "Error: ".
  done(text as unknown as Error);
}

/** How long to wait before retrying a stream that stopped after repeated
 *  auth failures. The SDK gives up permanently on `auth_failure` (see
 *  TeslemetryStream), so a stalled token or a fixed credential needs
 *  something outside it to resume the stream without a flow redeploy. */
const AUTH_RETRY_DELAY_MS = 60_000;

/**
 * Wire a streaming node's status indicator to its shared SSE connection,
 * distinguishing a bad/expired token (auth_failure, stays red until retried)
 * from an ordinary reconnecting blip (stream_error, shown transiently while
 * the SDK's own backoff keeps retrying). Also resumes the stream after
 * auth_failure, since the SDK stops reconnecting on its own at that point.
 * @returns cleanup function to call from the node's "close" handler
 */
export function attachStreamStatus(sse: TeslemetryStream, node: Node): () => void {
  let authRetryTimer: ReturnType<typeof setTimeout> | undefined;

  const onConnect = () => {
    node.status({ fill: "green", shape: "dot", text: "connected" });
  };
  const onDisconnect = () => {
    node.status({ fill: "red", shape: "ring", text: "disconnected" });
  };
  const onStreamError = (event: TeslemetryStreamErrorEvent) => {
    const isAuth = event.error instanceof TeslemetryStreamAuthError;
    node.status({
      fill: "yellow",
      shape: "ring",
      text: isAuth
        ? "auth error, retrying"
        : `reconnecting (attempt ${event.retries})`,
    });
  };
  const onAuthFailure = (error: TeslemetryStreamAuthError) => {
    node.status({ fill: "red", shape: "dot", text: "auth failed - check token" });
    node.error(`Teslemetry stream authentication failed: ${error.message}`);
    authRetryTimer = setTimeout(() => {
      authRetryTimer = undefined;
      sse.connect();
    }, AUTH_RETRY_DELAY_MS);
  };

  sse.on("connect", onConnect);
  sse.on("disconnect", onDisconnect);
  sse.on("stream_error", onStreamError);
  sse.on("auth_failure", onAuthFailure);

  return () => {
    if (authRetryTimer) clearTimeout(authRetryTimer);
    sse.off("connect", onConnect);
    sse.off("disconnect", onDisconnect);
    sse.off("stream_error", onStreamError);
    sse.off("auth_failure", onAuthFailure);
  };
}

/**
 * Get instance and validate it exists. Sets error status on node if not found.
 * @returns Instance or null if missing
 */
export function getInstance(configId: string, node: Node): Instance | null {
  const instance = instances.get(configId);
  if (!instance) {
    node.status({ fill: "red", shape: "ring", text: "Config missing" });
    node.error("No Teslemetry instance found");
    return null;
  }
  // If products fails, update the status
  instance.products.finally(() => {
    hasInstanceError(instance, node);
  });
  return instance;
}

/**
 * Check if instance has an error. Sets error status on node if so.
 * @returns true if there's an error (caller should return early)
 */
export function hasInstanceError(instance: Instance, node: Node): boolean {
  if (instance.error) {
    node.status({ fill: "red", shape: "ring", text: instance.error });
    node.error(`Teslemetry error: ${instance.error}`);
    return true;
  }
  return false;
}

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

/**
 * Extract a useful error message from any error type.
 * Handles Error objects, hey-api response objects, and plain objects.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";

  // Standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // hey-api throws response objects with this shape
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;

    if (typeof obj.error_description === "string") return obj.error_description;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;

    // Check for response status
    if (obj.response && typeof obj.response === "object") {
      const resp = obj.response as Record<string, unknown>;
      if (typeof obj.error_description === "string")
        return obj.error_description;
      if (typeof obj.error === "string") return obj.error;
      if (resp.status)
        return `HTTP ${resp.status}: ${resp.statusText || "Error"}`;
    }

    // Last resort: try to stringify
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

type RedLog = Record<"debug" | "info" | "warn" | "error", (msg: string) => void>;

/** Every Teslemetry request carries the access token as `?token=...`, so no
 *  URL may reach a log with its query string intact. */
function stripUrlQueries(text: string): string {
  return text
    .replace(/(\bhttps?:\/\/[^\s?#"'<>]+)\?[^\s"'<>]*/g, "$1")
    .replace(/\btoken=[^\s&"'<>]+/gi, "token=[redacted]");
}

/**
 * Adapt `RED.log` to the SDK's logger. The SDK passes the reason as extra
 * arguments (`logger.error("SSE error:", error)`), which `RED.log` drops
 * because its methods take a single message.
 */
export function createLogger(log: RedLog): Teslemetry["logger"] {
  const at =
    (level: keyof RedLog) =>
    (...args: unknown[]) =>
      log[level](
        stripUrlQueries(
          args
            .map((arg) => (typeof arg === "string" ? arg : getErrorMessage(arg)))
            .join(" "),
        ),
      );
  return { debug: at("debug"), info: at("info"), warn: at("warn"), error: at("error") };
}

/** Connection refusals the user can act on, named in the status instead of a
 *  bare retry count. */
const STREAM_STATUS_REASONS: Record<number, string> = {
  402: "subscription required",
  429: "too many connections",
};

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
  // The SDK emits `disconnect` straight after `auth_failure` as it leaves its
  // loop; that one must not replace the "auth failed" status.
  let authFailed = false;

  const onConnect = () => {
    authFailed = false;
    node.status({ fill: "green", shape: "dot", text: "connected" });
  };
  const onDisconnect = () => {
    if (authFailed) return;
    node.status({ fill: "red", shape: "ring", text: "disconnected" });
  };
  const onStreamError = (event: TeslemetryStreamErrorEvent) => {
    authFailed = false;
    const isAuth = event.error instanceof TeslemetryStreamAuthError;
    const attempt = `(attempt ${event.retries})`;
    let text = `reconnecting ${attempt}`;
    if (isAuth) {
      text = "auth error, retrying";
    } else if (event.status !== undefined) {
      const reason = STREAM_STATUS_REASONS[event.status] ?? `HTTP ${event.status}`;
      text = `${reason}, retrying ${attempt}`;
    }
    node.status({ fill: "yellow", shape: "ring", text });
  };
  const onAuthFailure = (error: TeslemetryStreamAuthError) => {
    authFailed = true;
    node.status({ fill: "red", shape: "dot", text: "auth failed - check token" });
    node.error(`Teslemetry stream authentication failed: ${error.message}`);
    authRetryTimer = setTimeout(() => {
      authRetryTimer = undefined;
      sse.connect();
    }, AUTH_RETRY_DELAY_MS);
  };

  // `connect()` returns early on a stream another node already started and
  // announces nothing, so a node joining it takes its status from the stream.
  if (sse.connected) {
    onConnect();
  } else if (sse.active) {
    node.status({ fill: "yellow", shape: "ring", text: "connecting" });
  }

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
    node.status({ fill: "red", shape: "ring", text: "Error" });
    node.error(`Teslemetry error: ${instance.error}`);
    return true;
  }
  return false;
}

/**
 * Log formatting shared by the platform and the SDK logger it wires up.
 */

import type { Logging } from "homebridge";
import type { Teslemetry } from "@teslemetry/api";

/** Every Teslemetry request carries the access token as `?token=...`, so no
 *  URL may reach the log with its query string intact. */
function stripUrlQueries(text: string): string {
  return text
    .replace(/(\bhttps?:\/\/[^\s?#"'<>]+)\?[^\s"'<>]*/gi, "$1")
    .replace(/\btoken=[^\s&"'<>]+/gi, "token=[redacted]");
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * One line describing an error, without its stack. Node's fetch reports every
 * network failure as "fetch failed" and keeps the reason on `cause`; the
 * generated client throws a JSON error body as a plain object.
 */
export function describeError(error: unknown): string {
  let text: string | undefined;
  if (error instanceof Error) {
    const { cause } = error as { cause?: { message?: unknown; code?: unknown } };
    const reason = nonEmptyString(cause?.message) ?? nonEmptyString(cause?.code);
    const message = nonEmptyString(error.message);
    text = !reason || reason === message ? message : message ? `${message}: ${reason}` : reason;
  } else if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    text =
      nonEmptyString(obj.error_description) ??
      nonEmptyString(obj.error) ??
      nonEmptyString(obj.message);
    if (!text) {
      try {
        text = JSON.stringify(error);
      } catch {
        text = String(error);
      }
    }
  } else if (error !== undefined && error !== null) {
    text = nonEmptyString(String(error));
  }
  return stripUrlQueries(text ?? "Unknown error");
}

/**
 * The SDK's stream lines this platform reports itself, once and by name, from
 * the stream's events: "SSE error:" duplicates `stream_error`, "Connected to
 * stream" duplicates `connect`, and the auth stop duplicates `auth_failure`.
 * They stay available at debug.
 */
const SDK_STREAM_DUPLICATES = [
  "SSE error:",
  "Connected to stream",
  "Stream authentication failed twice in a row",
];

/**
 * Adapt the Homebridge log to the SDK's logger. Each line is one line: an
 * error argument becomes its message, so a dropped socket does not print a
 * stack and a socket dump.
 */
export function createSdkLogger(log: Logging): Teslemetry["logger"] {
  const at =
    (level: "debug" | "info" | "warn" | "error") =>
    (...args: unknown[]) => {
      const line = stripUrlQueries(
        args.map((arg) => (typeof arg === "string" ? arg : describeError(arg))).join(" "),
      );
      const first = args[0];
      const duplicate =
        typeof first === "string" && SDK_STREAM_DUPLICATES.some((prefix) => first.startsWith(prefix));
      log[duplicate ? "debug" : level](line);
    };
  return { debug: at("debug"), info: at("info"), warn: at("warn"), error: at("error") };
}

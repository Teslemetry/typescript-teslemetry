import type { CommandSpec, Teslemetry } from "@teslemetry/api";
import type { Node, NodeAPI } from "node-red";
import type { Msg } from "./types";
import { validateParameters, ValidationRules } from "./validation";

/** Validates `args` against a catalog command's fields and returns the request body:
 *  only the command's own fields, with numbers and strings coerced to the field's type. */
export function catalogBody(spec: CommandSpec, args: unknown): Record<string, unknown> {
  const raw =
    args && typeof args === "object" && !Array.isArray(args)
      ? (args as Record<string, unknown>)
      : {};
  const input: Record<string, unknown> = {};
  const rules: ValidationRules = {};
  for (const field of spec.fields) {
    const value = raw[field.name];
    if (value !== undefined && value !== null && value !== "") {
      if (field.type === "number" && typeof value === "string") input[field.name] = Number(value);
      else if (field.type === "string" && typeof value === "number") input[field.name] = String(value);
      else input[field.name] = value;
    }
    rules[field.name] = {
      required: field.required,
      type: field.type,
      min: field.min,
      max: field.max,
      integer: field.integer,
      isArray: field.isArray,
      allowedValues: field.enum,
      sensitive: field.sensitive,
    };
  }
  validateParameters(input, rules);
  return input;
}

/** Sends a catalog command through the SDK's HTTP client and returns the API's `response`. */
export async function sendCatalogCommand(
  teslemetry: Teslemetry,
  spec: CommandSpec,
  path: Record<string, string | number>,
  args: unknown,
): Promise<{ response?: any }> {
  const hasBody = spec.method === "POST" && spec.fields.length > 0;
  const { data } = await teslemetry.client.request<{ response?: any }, unknown, true>({
    method: spec.method,
    url: spec.path,
    path,
    security: [{ scheme: "bearer", type: "http" }],
    ...(hasBody && {
      body: catalogBody(spec, args),
      headers: { "Content-Type": "application/json" },
    }),
  });
  return data;
}

/** A command field set in the editor: a typedInput type and value. */
export interface CommandArg {
  type: string;
  value: string;
}

/** The command's arguments: `msg.payload`, overlaid with each field set in the node. */
export async function resolveArgs(
  RED: NodeAPI,
  node: Node,
  msg: Msg,
  args: Record<string, CommandArg> | undefined,
): Promise<Record<string, unknown>> {
  const payload = msg.payload;
  const out: Record<string, unknown> =
    payload && typeof payload === "object" && !Array.isArray(payload) ? { ...payload } : {};
  for (const [name, { type, value }] of Object.entries(args ?? {})) {
    if (value === "") continue;
    const resolved = await new Promise<unknown>((resolve, reject) =>
      RED.util.evaluateNodeProperty(value, type, node, msg, (err, result) =>
        err ? reject(err) : resolve(result),
      ),
    );
    if (resolved !== undefined) out[name] = resolved;
  }
  return out;
}

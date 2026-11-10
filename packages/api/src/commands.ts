export interface CommandField {
  name: string;
  /** Absent for a union field, which takes any JSON value. */
  type?: "number" | "string" | "boolean" | "object";
  integer?: boolean;
  /** With type "object": whether the value is an array. */
  isArray?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
  required?: boolean;
  default?: unknown;
  description?: string;
  /** A PIN or password, never echoed back in errors. */
  sensitive?: boolean;
}

export interface CommandSpec {
  /** The API route name, such as `set_charge_limit`; a GET sharing a path with a POST is `get_<name>`. */
  name: string;
  label: string;
  group: string;
  method: "GET" | "POST";
  /** Path template with a `{vin}` or `{id}` parameter. */
  path: string;
  /** Credit cost as the API documents it, such as "1 credit (+20 if asleep)". */
  badge?: string;
  /** Needs Teslemetry's key verified on the energy gateway (`paired` in the products metadata). */
  paired?: boolean;
  /** Only these vehicle models take the command. */
  models?: string[];
  fields: CommandField[];
}

export { VEHICLE_COMMANDS, ENERGY_COMMANDS } from "./commands.gen.js";

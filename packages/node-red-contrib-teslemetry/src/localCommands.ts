import type { SiteCommands } from "./localPowerwall";

type Body = Record<string, any>;

/** The gateway's positional arguments for an API command body, by API route name. */
const LOCAL_ARGS: { [M in keyof SiteCommands]: (body: Body) => Parameters<SiteCommands[M]> } = {
  backup: (b) => [b.backup_reserve_percent],
  operation: (b) => [b.default_real_mode],
  grid_import_export: (b) => [
    b.disallow_charge_from_grid_with_solar_installed ?? null,
    b.customer_preferred_export_rule,
  ],
  dispatch_battery_power: (b) => [b.power_watts, b.duration_seconds],
  resume_battery_operation: () => [],
  set_island_mode: (b) => [b.mode, b.force ?? null],
};

/** The gateway method and arguments for an API command, or undefined when the gateway does not take it. */
export function localCommand(
  name: string,
  body: Body,
): { method: keyof SiteCommands; args: unknown[] } | undefined {
  if (!Object.prototype.hasOwnProperty.call(LOCAL_ARGS, name)) return undefined;
  const method = name as keyof SiteCommands;
  return { method, args: LOCAL_ARGS[method](body) };
}

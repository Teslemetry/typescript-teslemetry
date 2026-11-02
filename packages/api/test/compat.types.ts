// Compile-time checks, run by `pnpm --filter @teslemetry/api tsc`. Never executed.
// An unused `@ts-expect-error` is itself an error.
//
// `@teslemetry/api` must not depend on the router, so `Routed` here is a copy of
// the mapped type in tesla-fleet-api's `src/router/base.ts`.
import { EnergySiteCompat, VehicleCompat } from "../src/compat/index.js";

type MethodKeys<B> = { [K in keyof B]-?: B[K] extends (...args: never[]) => unknown ? K : never }[keyof B];
type AllMethodKeys<B> = B extends unknown ? MethodKeys<B> : never;
type MethodOf<B, K extends PropertyKey> = B extends { [P in K]: infer F } ? F : never;
type Asynced<F> = F extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;
export type Routed<B> = { [K in AllMethodKeys<B>]: Asynced<MethodOf<B, K>> };
export type Backends = readonly [object, object, ...object[]];
export type RouterOf<Bs extends Backends> = Routed<Bs[number]> & { readonly backends: Bs };

type CommandResponse = { response: { result: boolean; reason: string } };

/** The shapes of a `tesla-fleet-api` primary, for the methods whose arguments differ from the SDK's. */
class FakePrimary {
  readonly vin = "PRIMARY";

  door_lock(): Promise<CommandResponse> {
    throw new Error("type check only");
  }
  remote_seat_heater_request(_seat: "FRONT_LEFT" | "REAR_CENTER" | number, _level: 0 | 1 | 2 | 3): Promise<CommandResponse> {
    throw new Error("type check only");
  }
  remote_seat_cooler_request(_seat: "FRONT_LEFT" | number, _level: 0 | 1 | 2 | 3): Promise<CommandResponse> {
    throw new Error("type check only");
  }
  wake_up(_options?: { wait?: boolean; timeoutMs?: number }): Promise<CommandResponse> {
    throw new Error("type check only");
  }
  set_pin_to_drive(_on: boolean, _password: string | number): Promise<CommandResponse> {
    throw new Error("type check only");
  }
  trigger_homelink(_token?: string | null, _lat?: number, _lon?: number): Promise<CommandResponse> {
    throw new Error("type check only");
  }
  primary_only(): Promise<string> {
    throw new Error("type check only");
  }
}

export async function routedCalls(router: RouterOf<readonly [FakePrimary, VehicleCompat]>): Promise<void> {
  await router.door_lock();
  await router.remote_seat_heater_request(1, 2);
  await router.remote_seat_heater_request("REAR_CENTER", 2);
  await router.remote_seat_cooler_request(1, 3);
  await router.wake_up({ wait: true, timeoutMs: 1000 });
  await router.set_pin_to_drive(true, 1234);
  await router.trigger_homelink("token", 1, 2);
  await router.primary_only();
  // A method on compat alone is routed, and keeps the SDK's reply type.
  const reply: { response?: unknown } = await router.vehicle();
  void reply;

  // @ts-expect-error A misspelt method does not exist.
  await router.door_lokc();
  // @ts-expect-error A seat name fails when it is not a name on both backends.
  await router.remote_seat_heater_request("front_left", 2);
  // @ts-expect-error The old (lat, lon) order no longer fits.
  await router.trigger_homelink(1, 2);
  // @ts-expect-error SDK camelCase names are not routed.
  await router.lockDoors();
  // @ts-expect-error `api` is an attribute, not a routed method.
  await router.api();
}

/** The shapes of a local Powerwall primary. `live_status` is on both; `local_config` is local only. */
class FakeLocalSite {
  readonly energy_site_id = 1;

  live_status(): Promise<{ response: { percentage_charged: number } }> {
    throw new Error("type check only");
  }
  grid_import_export(_disallow?: boolean | null, _rule?: string | null): Promise<Record<string, unknown>> {
    throw new Error("type check only");
  }
  set_island_mode(_mode: number, _force?: boolean | null): Promise<Record<string, unknown>> {
    throw new Error("type check only");
  }
  local_config(): Promise<{ response: object }> {
    throw new Error("type check only");
  }
}

export async function routedEnergyCalls(router: RouterOf<readonly [FakeLocalSite, EnergySiteCompat]>): Promise<void> {
  await router.live_status();
  await router.grid_import_export(false);
  await router.grid_import_export(null, "pv_only");
  await router.set_island_mode(1, true);
  await router.local_config();
  await router.site_info();

  // @ts-expect-error The library order: `disallow` comes first.
  await router.grid_import_export("pv_only", true);
  // @ts-expect-error SDK camelCase names are not routed.
  await router.setBackupReserve(20);
}

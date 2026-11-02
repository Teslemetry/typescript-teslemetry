import { test } from "node:test";
import assert from "node:assert/strict";
import { EnergySiteCompat, VehicleCompat } from "../src/compat/index.js";
import type { Teslemetry } from "../src/Teslemetry.js";
import { compatMethodNames, json, makeTeslemetry, rejection, sdkCallsOf } from "./compatHelpers.js";

const siteId = 12345;

const compatFor = (teslemetry: Teslemetry) => new EnergySiteCompat(teslemetry.energySite(siteId));

const METHOD_MAP: [string, string, ...unknown[]][] = [
  ["setBackupReserve", "backup", 20],
  ["setOperationMode", "operation", "autonomous"],
  ["setStormMode", "storm_mode", true],
  ["gridImportExport", "grid_import_export", true],
  ["getLiveStatus", "live_status"],
  ["getSiteInfo", "site_info"],
  ["setOffGridVehicleChargingReserve", "off_grid_vehicle_charging_reserve", 20],
  ["setTimeOfUseSettings", "time_of_use_settings", {}],
  ["getCalendarHistory", "backup_history", "day"],
  ["getCalendarHistory", "energy_history", "day"],
  ["getTelemetryHistory", "charge_history", "a", "b"],
  ["getCommandSystemInfo", "get_system_info"],
  ["getCommandNetworkingStatus", "get_networking_status"],
  ["getCommandWifiScan", "wifi_scan"],
  ["getCommandDeviceCert", "get_device_cert"],
  ["getCommandAuthorizedClients", "list_authorized_clients"],
  ["getCommandSignedCommandsPublicKey", "get_signed_commands_public_key"],
  ["scheduleBackupEvent", "schedule_backup_event"],
  ["cancelBackupEvent", "cancel_backup_event"],
  ["setLocalSiteConfig", "set_local_site_config"],
  ["setIslandMode", "set_island_mode", 1],
  ["addAuthorizedClient", "add_authorized_client"],
  ["removeAuthorizedClient", "remove_authorized_client", "key"],
];

for (const [sdkName, compatName, ...args] of METHOD_MAP) {
  test(`${compatName} calls ${sdkName} once`, async () => {
    const { teslemetry } = makeTeslemetry();
    const api = teslemetry.energySite(siteId);
    assert.deepEqual(await sdkCallsOf(new EnergySiteCompat(api), api, compatName, args), [sdkName]);
  });
}

test("the map is the whole class", () => {
  const { teslemetry } = makeTeslemetry();
  assert.deepEqual(
    compatMethodNames(compatFor(teslemetry)).sort(),
    METHOD_MAP.map(([, compatName]) => compatName).sort(),
  );
});

test("a method with no wrapper or router name stays absent", () => {
  const { teslemetry } = makeTeslemetry();
  const compat = compatFor(teslemetry) as unknown as Record<string, unknown>;
  for (const name of [
    "dispatch_battery_power", "resume_battery_operation", "get_backup_events", "get_teg_config",
    "find_gateway_address", "local_config", "getTariff", "getPrograms", "sendCommand", "requestPolling",
  ]) {
    assert.equal(compat[name], undefined, name);
  }
});

test("energy_site_id is a plain attribute the router can read", () => {
  const { teslemetry } = makeTeslemetry();
  assert.equal(compatFor(teslemetry).energy_site_id, siteId);
});

test("a reply keeps its { response } envelope", async () => {
  const { teslemetry } = makeTeslemetry(() => json({ response: { code: 201, message: "Updated" } }));
  assert.deepEqual(await compatFor(teslemetry).backup(20), { response: { code: 201, message: "Updated" } });
});

// grid_import_export

const DISALLOW = "disallow_charge_from_grid_with_solar_installed";
const RULE = "customer_preferred_export_rule";

test("a single-setting disallow call sends only that setting", async () => {
  for (const disallow of [true, false]) {
    const { teslemetry, sent } = makeTeslemetry();
    await compatFor(teslemetry).grid_import_export(disallow);
    assert.deepEqual(sent.at(-1)?.body, { [DISALLOW]: disallow });
  }
});

test("a single-setting rule call sends only that setting", async () => {
  for (const rule of ["battery_ok", "pv_only", "never"]) {
    for (const none of [null, undefined]) {
      const { teslemetry, sent } = makeTeslemetry();
      await compatFor(teslemetry).grid_import_export(none, rule);
      assert.deepEqual(sent.at(-1)?.body, { [RULE]: rule });
    }
  }
});

test("both settings go to their own keys, despite the opposite argument order", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).grid_import_export(false, "pv_only");
  assert.deepEqual(sent.at(-1)?.body, { [DISALLOW]: false, [RULE]: "pv_only" });
});

// Arguments

test("time_of_use_settings wraps the tariff as tesla-fleet-api does", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).time_of_use_settings({ code: "PGE" });
  assert.deepEqual(sent.at(-1)?.body, { tou_settings: { tariff_content_v2: { code: "PGE" } } });
});

test("history methods take period first, and strings go through unchanged", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.backup_history("week", "2026-01-01T00:00:00Z", "2026-01-08T00:00:00Z", "UTC");
  assert.deepEqual(Object.fromEntries(sent.at(-1)!.query), {
    kind: "backup",
    period: "week",
    start_date: "2026-01-01T00:00:00Z",
    end_date: "2026-01-08T00:00:00Z",
    time_zone: "UTC",
  });
  await compat.energy_history("day", null, null, null);
  assert.deepEqual(Object.fromEntries(sent.at(-1)!.query), { kind: "energy", period: "day" });
  await compat.charge_history("2026-01-01T00:00:00Z", "2026-01-08T00:00:00Z", "UTC");
  assert.deepEqual(Object.fromEntries(sent.at(-1)!.query), {
    kind: "charge",
    start_date: "2026-01-01T00:00:00Z",
    end_date: "2026-01-08T00:00:00Z",
    time_zone: "UTC",
  });
});

test("set_island_mode sends force only when given", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.set_island_mode(1);
  assert.deepEqual(sent.at(-1)?.body, { mode: 1 });
  await compat.set_island_mode(6, null);
  assert.deepEqual(sent.at(-1)?.body, { mode: 6 });
  await compat.set_island_mode(6, false);
  assert.deepEqual(sent.at(-1)?.body, { mode: 6, force: false });
});

test("schedule_backup_event builds scheduling_info from what was given", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.schedule_backup_event("2026-01-01T00:00:00Z", 60);
  assert.deepEqual(sent.at(-1)?.body, {
    scheduling_info: { start_time: "2026-01-01T00:00:00Z", duration_seconds: 60 },
  });
  await compat.schedule_backup_event(null, 0, "9007199254740993");
  assert.deepEqual(sent.at(-1)?.body, { scheduling_info: { duration_seconds: 0, priority: "9007199254740993" } });
  await compat.schedule_backup_event();
  assert.deepEqual(sent.at(-1)?.body, {});
});

test("authorized client keys are base64-encoded from bytes and pass through as strings", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.add_authorized_client(new Uint8Array([1, 2, 3]), "Homey", 1, 2);
  assert.deepEqual(sent.at(-1)?.body, {
    public_key: "AQID",
    description: "Homey",
    key_type: 1,
    authorized_client_type: 2,
  });
  await compat.add_authorized_client();
  assert.deepEqual(sent.at(-1)?.body, {});
  await compat.remove_authorized_client(new Uint8Array([1, 2, 3]));
  assert.deepEqual(sent.at(-1)?.body, { public_key: "AQID" });
  await compat.remove_authorized_client("AQID");
  assert.deepEqual(sent.at(-1)?.body, { public_key: "AQID" });
});

test("set_local_site_config always sends an object", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).set_local_site_config();
  assert.deepEqual(sent.at(-1)?.body, {});
});

// Rejections keep the vehicle rules

test("HTTP 429 and 400 mark failover_safe true and false, and the body stays the raw body", async () => {
  for (const [status, safe] of [[429, true], [400, false]] as const) {
    const body = { error: "x" };
    const { teslemetry } = makeTeslemetry(() => json(body, status));
    const rejected = (await rejection(compatFor(teslemetry).backup(20))) as { status: number; failover_safe: boolean };
    assert.equal(rejected instanceof Error, false);
    assert.equal(JSON.stringify(rejected), JSON.stringify(body));
    assert.equal(rejected.status, status);
    assert.equal(rejected.failover_safe, safe);
  }
});

test("a string body stays a string", async () => {
  const { teslemetry } = makeTeslemetry(() => new Response("<html></html>", { status: 503 }));
  assert.equal(await rejection(compatFor(teslemetry).backup(20)), "<html></html>");
});

test("a vehicle and a site on one client share one interceptor", () => {
  const { teslemetry } = makeTeslemetry();
  compatFor(teslemetry);
  new VehicleCompat(teslemetry.vehicle("5YJSA1E14FF000000"));
  assert.equal(teslemetry.client.interceptors.error.fns.length, 1);
});

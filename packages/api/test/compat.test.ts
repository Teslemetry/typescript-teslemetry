import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { VehicleCompat } from "../src/compat/index.js";
import type { Teslemetry } from "../src/Teslemetry.js";
import { compatMethodNames, json, makeTeslemetry, ok, rejection, sdkCallsOf } from "./compatHelpers.js";

const vin = "5YJSA1E14FF000000";

const compatFor = (teslemetry: Teslemetry) => new VehicleCompat(teslemetry.vehicle(vin));

/** Every SDK method with a router name, and that name. */
const METHOD_MAP: [string, string, ...unknown[]][] = [
  ["actuateTrunk", "actuate_trunk", "front"],
  ["adjustVolume", "adjust_volume", 3],
  ["remoteBoombox", "remote_boombox"],
  ["flashLights", "flash_lights"],
  ["honkHorn", "honk_horn"],
  ["windowControl", "window_control", "vent", 1, 2],
  ["setTemps", "set_temps", 20, 21],
  ["chargeMaxRange", "charge_max_range"],
  ["chargeStandard", "charge_standard"],
  ["setChargeLimit", "set_charge_limit", 80],
  ["setChargingAmps", "set_charging_amps", 16],
  ["setScheduledCharging", "set_scheduled_charging", true, 120],
  ["setScheduledDeparture", "set_scheduled_departure"],
  ["addChargeSchedule", "add_charge_schedule", "All", true, 1, 2, 60],
  ["removeChargeSchedule", "remove_charge_schedule", 1],
  ["addPreconditionSchedule", "add_precondition_schedule", "All", true, 1, 2, 60],
  ["removePreconditionSchedule", "remove_precondition_schedule", 1],
  ["setCabinOverheatProtection", "set_cabin_overheat_protection", true, false],
  ["setCopTemp", "set_cop_temp", 1],
  ["setSentryMode", "set_sentry_mode", true],
  ["setValetMode", "set_valet_mode", true, "1234"],
  ["setPinToDrive", "set_pin_to_drive", true, "1234"],
  ["clearPinToDriveAdmin", "clear_pin_to_drive_admin"],
  ["setVehicleName", "set_vehicle_name", "Car"],
  ["triggerHomelink", "trigger_homelink", "token", 1, 2],
  ["sunRoofControl", "sun_roof_control", "vent"],
  ["setClimateKeeperMode", "set_climate_keeper_mode", 1],
  ["setPreconditioningMax", "set_preconditioning_max", true, false],
  ["scheduleSoftwareUpdate", "schedule_software_update", 60],
  ["cancelSoftwareUpdate", "cancel_software_update"],
  ["eraseUserData", "erase_user_data"],
  ["resetValetPin", "reset_valet_pin"],
  ["speedLimitActivate", "speed_limit_activate", "1234"],
  ["speedLimitDeactivate", "speed_limit_deactivate", "1234"],
  ["speedLimitClearPin", "speed_limit_clear_pin", "1234"],
  ["speedLimitClearPinAdmin", "speed_limit_clear_pin_admin"],
  ["speedLimitSetLimit", "speed_limit_set_limit", 60],
  ["navigationRequest", "navigation_request", "Home", "en-US"],
  ["navigationGpsRequest", "navigation_gps_request", 1, 2],
  ["navigationWaypointsRequest", "navigation_waypoints_request", "a,b"],
  ["upcomingCalendarEntries", "upcoming_calendar_entries", "{}"],
  ["vehicleData", "vehicle_data"],
  ["ping", "ping"],
  ["closure", "closure"],
  ["dashcamSave", "dashcam_save"],
  ["playVideo", "play_video", "https://example.com"],
  ["stopLightShow", "stop_light_show"],
  ["startLightShow", "start_light_show", 0],
  ["clearPinToDrive", "clear_pin_to_drive", "1234"],
  ["chargeOnSolar", "charge_on_solar", true],
  ["lockDoors", "door_lock"],
  ["unlockDoors", "door_unlock"],
  ["startAutoConditioning", "auto_conditioning_start"],
  ["stopAutoConditioning", "auto_conditioning_stop"],
  ["startCharging", "charge_start"],
  ["stopCharging", "charge_stop"],
  ["openChargePort", "charge_port_door_open"],
  ["closeChargePort", "charge_port_door_close"],
  ["mediaNextFavorite", "media_next_fav"],
  ["mediaNextTrack", "media_next_track"],
  ["mediaPreviousFavorite", "media_prev_fav"],
  ["mediaPreviousTrack", "media_prev_track"],
  ["mediaTogglePlayback", "media_toggle_playback"],
  ["mediaVolumeDown", "media_volume_down"],
  ["remoteStart", "remote_start_drive"],
  ["setGuestMode", "guest_mode", true],
  ["setBioweaponDefenseMode", "set_bioweapon_mode", true, false],
  ["setAutoSeatClimate", "remote_auto_seat_climate_request", 1, true],
  ["setAutoSteeringWheelHeat", "remote_auto_steering_wheel_heat_climate_request", true],
  ["setSeatCooler", "remote_seat_cooler_request", 1, 1],
  ["setSeatHeater", "remote_seat_heater_request", 0, 1],
  ["setSteeringWheelHeater", "remote_steering_wheel_heater_request", true],
  ["setSteeringWheelHeatLevel", "remote_steering_wheel_heat_level_request", 1],
  ["resetPinToDrive", "reset_pin_to_drive_pin"],
  ["navigationSuperchargerRequest", "navigation_sc_request", 1],
  ["setSeatHeaters", "seat_heater"],
  ["removeAllImpermanentKeys", "remove_key"],
  ["state", "vehicle"],
  ["refreshData", "data_refresh"],
  ["wakeUp", "wake_up"],
  ["getMobileEnabled", "mobile_enabled"],
  ["getNearbyChargingSites", "nearby_charging_sites"],
  ["getRecentAlerts", "recent_alerts"],
  ["getReleaseNotes", "release_notes"],
  ["getServiceData", "service_data"],
  ["getDrivers", "drivers"],
  ["removeDriver", "drivers_remove", 7],
  ["getInvitations", "share_invites"],
  ["createInvitation", "share_invites_create"],
  ["revokeInvitation", "share_invites_revoke", "1"],
  ["getVehicleOptions", "options"],
  ["getWarrantyDetails", "warranty_details"],
  ["getFleetTelemetryConfig", "fleet_telemetry_config_get"],
  ["deleteFleetTelemetryConfig", "fleet_telemetry_config_delete"],
];

// The vehicle methods Homey's device code calls on `@teslemetry/api`.
const HOMEY_METHODS = [
  "actuateTrunk", "addChargeSchedule", "addPreconditionSchedule", "adjustVolume", "cancelSoftwareUpdate",
  "closeChargePort", "closure", "flashLights", "honkHorn", "lockDoors", "mediaNextTrack", "mediaPreviousTrack",
  "mediaTogglePlayback", "navigationRequest", "openChargePort", "remoteStart", "removeChargeSchedule",
  "removePreconditionSchedule", "scheduleSoftwareUpdate", "setAutoSeatClimate", "setAutoSteeringWheelHeat",
  "setBioweaponDefenseMode", "setCabinOverheatProtection", "setChargeLimit", "setChargingAmps",
  "setClimateKeeperMode", "setCopTemp", "setGuestMode", "setPreconditioningMax", "setScheduledCharging",
  "setScheduledDeparture", "setSeatCooler", "setSeatHeater", "setSentryMode", "setSteeringWheelHeatLevel",
  "setSteeringWheelHeater", "setTemps", "setValetMode", "speedLimitActivate", "speedLimitDeactivate",
  "startAutoConditioning", "startCharging", "stopAutoConditioning", "stopCharging", "sunRoofControl",
  "triggerHomelink", "unlockDoors", "wakeUp", "windowControl",
];

for (const [sdkName, compatName, ...args] of METHOD_MAP) {
  test(`${compatName} calls ${sdkName} once`, async () => {
    const { teslemetry } = makeTeslemetry();
    const api = teslemetry.vehicle(vin);
    assert.deepEqual(await sdkCallsOf(new VehicleCompat(api), api, compatName, args), [sdkName]);
  });
}

test("every Homey vehicle method is in the map", () => {
  const mapped = new Set(METHOD_MAP.map(([sdkName]) => sdkName));
  assert.deepEqual(HOMEY_METHODS.filter((name) => !mapped.has(name)), []);
});

test("the map is the whole class, so nothing is exposed that the map does not name", () => {
  const { teslemetry } = makeTeslemetry();
  assert.deepEqual(
    compatMethodNames(compatFor(teslemetry)).sort(),
    METHOD_MAP.map(([, compatName]) => compatName).sort(),
  );
});

test("a method with no router name stays absent, so the router skips this backend", () => {
  const { teslemetry } = makeTeslemetry();
  const compat = compatFor(teslemetry) as unknown as Record<string, unknown>;
  for (const name of [
    "chargeHistory", "charge_history", "getFleetTelemetryErrors", "getEligibleSubscriptions", "getEligibleUpgrades",
    "getVehicleConfig", "getConfig", "patchConfig", "postConfig", "deleteConfig", "sendCommand", "take_drivenote",
    "fleet_telemetry_config_create", "signed_command",
  ]) {
    assert.equal(compat[name], undefined, name);
  }
});

test("vin is a plain attribute the router can read", () => {
  const { teslemetry } = makeTeslemetry();
  assert.equal(compatFor(teslemetry).vin, vin);
});

// Replies

test("a reply keeps its { response } envelope", async () => {
  const { teslemetry } = makeTeslemetry(() => json({ response: { result: true, reason: "because" } }));
  assert.deepEqual(await compatFor(teslemetry).door_lock(), { response: { result: true, reason: "because" } });
});

// Arguments

test("remote_seat_heater_request converts a Seat number or name to the seat the SDK sends", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  for (let seat = 0; seat <= 8; seat++) {
    await compat.remote_seat_heater_request(seat, 2);
    assert.deepEqual(sent.at(-1)?.body, { heater: seat, level: 2 });
  }
  await compat.remote_seat_heater_request("THIRD_RIGHT", 1);
  assert.deepEqual(sent.at(-1)?.body, { heater: 8, level: 1 });
  await compat.remote_seat_heater_request("REAT_LEFT_BACK", 1);
  assert.deepEqual(sent.at(-1)?.body, { heater: 3, level: 1 });
});

test("setSeatHeater receives a seat name, never a Seat number", async () => {
  const { teslemetry } = makeTeslemetry();
  const api = teslemetry.vehicle(vin);
  const seats: unknown[] = [];
  api.setSeatHeater = (async (seat: unknown) => {
    seats.push(seat);
    return { response: {} };
  }) as never;
  await new VehicleCompat(api).remote_seat_heater_request(1, 1);
  await new VehicleCompat(api).remote_seat_heater_request("REAR_CENTER", 1);
  assert.deepEqual(seats, ["front_right", "rear_center"]);
});

test("an unknown seat rejects before anything is sent, instead of a body with no seat", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await assert.rejects(compat.remote_seat_heater_request(9, 1), RangeError);
  await assert.rejects(compat.remote_seat_cooler_request(0, 1), RangeError);
  await assert.rejects(compat.remote_auto_seat_climate_request(3, true), RangeError);
  assert.deepEqual(sent, []);
});

test("seat cooling and auto seat climate positions are 1-indexed, as in Python", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.remote_seat_cooler_request(1, 3);
  assert.deepEqual(sent.at(-1)?.body, { seat_position: 1, seat_cooler_level: 3 });
  await compat.remote_seat_cooler_request("FRONT_RIGHT", 3);
  assert.deepEqual(sent.at(-1)?.body, { seat_position: 2, seat_cooler_level: 3 });
  await compat.remote_auto_seat_climate_request(2, true);
  assert.deepEqual(sent.at(-1)?.body, { auto_seat_position: 2, auto_climate_on: true });
  await compat.remote_auto_seat_climate_request("FRONT_LEFT", false);
  assert.deepEqual(sent.at(-1)?.body, { auto_seat_position: 1, auto_climate_on: false });
});

test("set_climate_keeper_mode takes a number or a mode name", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.set_climate_keeper_mode("Camp");
  assert.deepEqual(sent.at(-1)?.body, { climate_keeper_mode: 3 });
  await compat.set_climate_keeper_mode(2);
  assert.deepEqual(sent.at(-1)?.body, { climate_keeper_mode: 2 });
});

test("set_cop_temp converts Celsius and Fahrenheit to the level the API takes", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  const cases = [[0, 0], [1, 1], [2, 2], [30, 0], [35, 1], [40, 2], [90, 0], [95, 1], [100, 2]] as const;
  for (const [given, expected] of cases) {
    await compat.set_cop_temp(given);
    assert.deepEqual(sent.at(-1)?.body, { cop_temp: expected });
  }
});

test("closure maps snake_case options to the wire keys and leaves `none` out", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).closure({ front_trunk: "open", rear_trunk: "none", charge_port: "close" });
  assert.deepEqual(sent.at(-1)?.body, { frontTrunk: "open", chargePort: "close" });
});

test("seat_heater maps snake_case options to the wire keys", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).seat_heater({ front_left: "high", third_row_right: "off" });
  assert.deepEqual(sent.at(-1)?.body, { frontLeft: "high", thirdRowRight: "off" });
});

test("add_charge_schedule derives its enable flags, and refuses a schedule with neither time", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.add_charge_schedule("All", true, 1, 2, undefined, 300);
  assert.deepEqual(sent.at(-1)?.body, {
    days_of_week: "All", enabled: true, end_enabled: true, lat: 1, lon: 2, start_enabled: false, end_time: 300,
  });
  sent.length = 0;
  await assert.rejects(compat.add_charge_schedule("All", true, 1, 2));
  assert.deepEqual(sent, []);
});

test("set_scheduled_departure takes positional arguments and sends the same defaults as tesla-fleet-api", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).set_scheduled_departure(true, true);
  assert.deepEqual(sent.at(-1)?.body, {
    enable: true,
    preconditioning_enabled: true,
    preconditioning_weekdays_only: false,
    departure_time: 0,
    off_peak_charging_enabled: false,
    off_peak_charging_weekdays_only: false,
    end_off_peak_time: 0,
  });
});

test("navigation_request sends the documented string value, with type and timestamp", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).navigation_request("1 Main St", "en-US");
  const body = sent.at(-1)?.body as Record<string, unknown>;
  assert.equal(body.value, "1 Main St");
  assert.equal(body.locale, "en-US");
  assert.equal(body.type, "share_ext_content_raw");
  assert.equal(typeof body.timestamp_ms, "number");
});

test("trigger_homelink takes Python's (token, lat, lon) order and sends lat and lon to their own keys", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.trigger_homelink("homelink-token", 1.5, 2.5);
  assert.deepEqual(sent.at(-1)?.body, { lat: 1.5, lon: 2.5 });
  await compat.trigger_homelink(undefined, 3.5, 4.5);
  assert.deepEqual(sent.at(-1)?.body, { lat: 3.5, lon: 4.5 });
});

test("trigger_homelink sends a location only when both lat and lon are given, and 0 counts as given", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.trigger_homelink(undefined, 1.5);
  assert.deepEqual(sent.at(-1)?.body, {});
  await compat.trigger_homelink(undefined, undefined, 2.5);
  assert.deepEqual(sent.at(-1)?.body, {});
  await compat.trigger_homelink();
  assert.deepEqual(sent.at(-1)?.body, {});
  await compat.trigger_homelink(null, 0, 0);
  assert.deepEqual(sent.at(-1)?.body, { lat: 0, lon: 0 });
});

test("window_control leaves out a location it was not given", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).window_control("vent");
  assert.deepEqual(sent.at(-1)?.body, { command: "vent" });
});

test("set_valet_mode leaves out a password it was not given", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).set_valet_mode(false);
  assert.deepEqual(sent.at(-1)?.body, { on: false });
});

test("schedules send a name when given", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.add_charge_schedule("All", true, 1, 2, 60, undefined, undefined, undefined, "Home");
  assert.equal((sent.at(-1)!.body as { name?: string }).name, "Home");
  await compat.add_precondition_schedule("All", true, 1, 2, 60, undefined, undefined, "Work");
  assert.equal((sent.at(-1)!.body as { name?: string }).name, "Work");
});

test("start_light_show defaults to the first show", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).start_light_show();
  assert.deepEqual(sent.at(-1)?.body, { show_index: 0 });
});

test("numeric PINs are sent as strings", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.speed_limit_activate(1234);
  assert.deepEqual(sent.at(-1)?.body, { pin: "1234" });
  await compat.set_pin_to_drive(true, 1234);
  assert.deepEqual(sent.at(-1)?.body, { on: true, password: "1234" });
  await compat.set_valet_mode(true, 1234);
  assert.deepEqual(sent.at(-1)?.body, { on: true, password: "1234" });
});

test("vehicle_data takes a list or a `;`-joined string", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  const compat = compatFor(teslemetry);
  await compat.vehicle_data(["charge_state", "climate_state"]);
  assert.equal(sent.at(-1)?.query.get("endpoints"), "charge_state,climate_state");
  await compat.vehicle_data("charge_state;climate_state");
  assert.equal(sent.at(-1)?.query.get("endpoints"), "charge_state,climate_state");
});

test("drivers_remove sends the id as a string", async () => {
  const { teslemetry, sent } = makeTeslemetry();
  await compatFor(teslemetry).drivers_remove(7);
  assert.equal(sent.at(-1)?.query.get("share_user_id"), "7");
});

// wake_up

test("wake_up without wait sends one wake", async () => {
  const { teslemetry, sent } = makeTeslemetry(() => json({ response: { state: "asleep" } }));
  assert.deepEqual(await compatFor(teslemetry).wake_up(), { response: { state: "asleep" } });
  assert.equal(sent.length, 1);
});

test("wake_up with wait polls until online", async () => {
  const states = ["asleep", "online"];
  const { teslemetry } = makeTeslemetry(() => json({ response: { state: states.shift() } }));
  const compat = compatFor(teslemetry);
  const original = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void) => original(fn, 0)) as typeof setTimeout;
  try {
    assert.deepEqual(await compat.wake_up({ wait: true }), { response: { state: "online" } });
  } finally {
    globalThis.setTimeout = original;
  }
});

test("wake_up with wait raises a failover-safe Error at the deadline", async () => {
  const { teslemetry } = makeTeslemetry(() => json({ response: { state: "asleep" } }));
  const error = (await rejection(compatFor(teslemetry).wake_up({ wait: true, timeoutMs: 1 }))) as Error & {
    failover_safe?: boolean;
  };
  assert.ok(error instanceof Error);
  assert.equal(error.name, "VehicleOffline");
  assert.equal(error.failover_safe, true);
});

// Failover marking

test("status decides failover_safe, for every listed status and one on each side", async () => {
  const safe = [401, 402, 403, 408, 429, 500, 502, 503, 504];
  for (const status of [...safe, 400, 404, 412, 422, 501, 505, 540]) {
    const { teslemetry } = makeTeslemetry(() => json({ error: "x" }, status));
    const rejected = (await rejection(compatFor(teslemetry).door_lock())) as { status: number; failover_safe: boolean };
    assert.equal(rejected.status, status);
    assert.equal(rejected.failover_safe, safe.includes(status), `HTTP ${status}`);
  }
});

test("a rejected body stays the raw body: not an Error, and it serializes byte for byte", async () => {
  const body = { error: "invalid_token", error_description: "expired" };
  const { teslemetry } = makeTeslemetry(() => json(body, 401));
  const rejected = await rejection(compatFor(teslemetry).door_lock());
  assert.equal(rejected instanceof Error, false);
  assert.equal(JSON.stringify(rejected), JSON.stringify(body));
  assert.deepEqual(Object.keys(rejected as object), Object.keys(body));
  assert.equal((rejected as typeof body).error, "invalid_token");
});

test("a body's own status key survives", async () => {
  const body = { status: "error", error: "x" };
  const { teslemetry } = makeTeslemetry(() => json(body, 429));
  const rejected = (await rejection(compatFor(teslemetry).door_lock())) as { status: string; failover_safe: boolean };
  assert.equal(JSON.stringify(rejected), JSON.stringify(body));
  assert.equal(rejected.status, "error");
  assert.equal(rejected.failover_safe, true);
});

test("a string body stays a string", async () => {
  const html = "<html><title>502 Bad Gateway</title></html>";
  const { teslemetry } = makeTeslemetry(() => new Response(html, { status: 502 }));
  assert.equal(await rejection(compatFor(teslemetry).door_lock()), html);
});

test("an empty body rejects with {} as it does today, and is still marked", async () => {
  const { teslemetry } = makeTeslemetry(() => new Response("", { status: 503 }));
  const rejected = (await rejection(compatFor(teslemetry).door_lock())) as { status: number; failover_safe: boolean };
  assert.equal(JSON.stringify(rejected), "{}");
  assert.equal(rejected.status, 503);
  assert.equal(rejected.failover_safe, true);
});

test("a network error stays the same Error, and is failover safe", async () => {
  const failure = new TypeError("fetch failed");
  const { teslemetry } = makeTeslemetry(() => {
    throw failure;
  });
  const rejected = (await rejection(compatFor(teslemetry).door_lock())) as TypeError & { failover_safe: boolean };
  assert.equal(rejected, failure);
  assert.equal(rejected.failover_safe, true);
  assert.equal(JSON.stringify(rejected), "{}");
});

test("nothing added to an error carries a URL", async () => {
  const leaked = (value: unknown) => /https?:|token=/.test(JSON.stringify(value) ?? "");
  const failure = new TypeError("fetch failed");
  const replies: (() => Response)[] = [
    () => json({ error: "x" }, 429),
    () => {
      throw failure;
    },
  ];
  for (const reply of replies) {
    const { teslemetry } = makeTeslemetry(reply);
    const rejected = (await rejection(compatFor(teslemetry).door_lock())) as object;
    const descriptors = Object.getOwnPropertyDescriptors(rejected) as Record<string, PropertyDescriptor>;
    for (const key of ["status", "failover_safe"]) {
      assert.equal(descriptors[key].enumerable, false);
      assert.equal(leaked(descriptors[key].value), false);
    }
    const added = Object.getOwnPropertyNames(rejected).filter(
      (name) => !["error", "stack", "message", "cause"].includes(name),
    );
    assert.deepEqual(added.sort(), ["failover_safe", "status"]);
  }
});

test("the mark reaches every caller of the shared client, and changes nothing they see", async () => {
  const body = { error: "subscription_required" };
  const { teslemetry } = makeTeslemetry(() => json(body, 402));
  compatFor(teslemetry);
  const rejected = await rejection(teslemetry.vehicle(vin).lockDoors());
  assert.deepEqual(rejected, body);
  assert.equal(JSON.stringify(rejected), JSON.stringify(body));
});

test("two compat objects on one client register one interceptor", () => {
  const { teslemetry } = makeTeslemetry();
  const interceptors = teslemetry.client.interceptors.error;
  const before = interceptors.fns.length;
  new VehicleCompat(teslemetry.vehicle(vin));
  new VehicleCompat(teslemetry.vehicle("5YJSA1E14FF000001"));
  assert.equal(interceptors.fns.length, before + 1);
});

test("each client gets its own interceptor", () => {
  const first = makeTeslemetry();
  const second = makeTeslemetry();
  compatFor(first.teslemetry);
  compatFor(second.teslemetry);
  assert.equal(first.teslemetry.client.interceptors.error.fns.length, 1);
  assert.equal(second.teslemetry.client.interceptors.error.fns.length, 1);
});

test("a success never touches the reply", async () => {
  const { teslemetry } = makeTeslemetry(ok);
  const reply = await compatFor(teslemetry).door_lock();
  assert.deepEqual(Object.getOwnPropertyNames(reply), ["response"]);
});

// Import graph

test("compat imports nothing at run time but itself, so it loads no tesla-fleet-api or protobuf", async () => {
  const directory = new URL("../src/compat/", import.meta.url);
  const files = await readdir(directory);
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = await readFile(new URL(file, directory), "utf8");
    assert.equal(/tesla-fleet-api["']|tesla-protocol/.test(source), false, file);
    const imports = source.matchAll(/^(?:import|export)\s+(type\s+)?[^;]*?from\s+"([^"]+)"/gm);
    for (const [, typeOnly, specifier] of imports) {
      if (!typeOnly) assert.match(specifier, /^\.\/[a-z]+\.js$/, `${file} imports ${specifier}`);
    }
  }
});

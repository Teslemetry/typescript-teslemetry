import { test } from "node:test";
import assert from "node:assert/strict";
import { TeslemetryVehicle } from "../src/nodes/TeslemetryVehicle.node.js";
import { withMockedFetch, captureRequest, fakeExecuteContext } from "./testHelpers.js";

const VIN = "5YJSA1E14FF000000";

type Case = {
  operation: string;
  params?: Record<string, unknown>;
  path: string;
  body?: Record<string, unknown> | null;
};

// path is relative to /api/1/vehicles/{vin}/; body is asserted when the SDK call sends one.
const CASES: Case[] = [
  { operation: "vehicleData", path: "vehicle_data", body: null },
  { operation: "wakeUp", path: "wake_up", body: null },
  { operation: "flashLights", path: "command/flash_lights", body: null },
  { operation: "honkHorn", path: "command/honk_horn", body: null },
  { operation: "lockDoors", path: "command/door_lock", body: null },
  { operation: "unlockDoors", path: "command/door_unlock", body: null },
  { operation: "remoteStart", path: "command/remote_start_drive", body: null },
  {
    operation: "actuateTrunk",
    params: { which_trunk: "front" },
    path: "command/actuate_trunk",
    body: { which_trunk: "front" },
  },
  { operation: "startAutoConditioning", path: "command/auto_conditioning_start", body: null },
  { operation: "stopAutoConditioning", path: "command/auto_conditioning_stop", body: null },
  {
    operation: "setTemps",
    params: { driver_temp: 21, passenger_temp: 19 },
    path: "command/set_temps",
    body: { driver_temp: 21, passenger_temp: 19 },
  },
  {
    operation: "setSeatHeater",
    params: { heater: "rear_left", level: 2 },
    path: "command/remote_seat_heater_request",
    body: { heater: 2, level: 2 },
  },
  {
    operation: "setSteeringWheelHeater",
    params: { on: true },
    path: "command/remote_steering_wheel_heater_request",
    body: { on: true },
  },
  { operation: "startCharging", path: "command/charge_start", body: null },
  { operation: "stopCharging", path: "command/charge_stop", body: null },
  { operation: "openChargePort", path: "command/charge_port_door_open", body: null },
  { operation: "closeChargePort", path: "command/charge_port_door_close", body: null },
  {
    operation: "setChargeLimit",
    params: { percent: 85 },
    path: "command/set_charge_limit",
    body: { percent: 85 },
  },
  {
    operation: "setChargingAmps",
    params: { charging_amps: 16 },
    path: "command/set_charging_amps",
    body: { charging_amps: 16 },
  },
  {
    operation: "setSentryMode",
    params: { on: true },
    path: "command/set_sentry_mode",
    body: { on: true },
  },
  {
    operation: "triggerHomelink",
    params: { lat: 1.5, lon: -2.5 },
    path: "command/trigger_homelink",
    body: { lat: 1.5, lon: -2.5 },
  },
  {
    operation: "navigationRequest",
    params: { value: "1 Main St" },
    path: "command/navigation_request",
    body: { value: "1 Main St" },
  },
  {
    operation: "setSeatCooler",
    params: { front_seat_position: "front_right", seat_cooler_level: 1 },
    path: "command/remote_seat_cooler_request",
    body: { seat_position: 2, seat_cooler_level: 1 },
  },
  {
    operation: "setAutoSeatClimate",
    params: { front_seat_position: "front_left", auto_climate_on: false },
    path: "command/remote_auto_seat_climate_request",
    body: { auto_seat_position: 1, auto_climate_on: false },
  },
  {
    operation: "setAutoSteeringWheelHeat",
    params: { auto_climate_on: true },
    path: "command/remote_auto_steering_wheel_heat_climate_request",
    body: { on: true },
  },
  {
    operation: "setSteeringWheelHeatLevel",
    params: { steering_wheel_heat_level: 3 },
    path: "command/remote_steering_wheel_heat_level_request",
    body: { level: 3 },
  },
  {
    operation: "setCabinOverheatProtection",
    params: { auto_climate_on: true, fan_only: true },
    path: "command/set_cabin_overheat_protection",
    body: { on: true, fan_only: true },
  },
  {
    operation: "setCopTemp",
    params: { cop_temp: 2 },
    path: "command/set_cop_temp",
    body: { cop_temp: 2 },
  },
  {
    operation: "setClimateKeeperMode",
    params: { climate_keeper_mode: 2 },
    path: "command/set_climate_keeper_mode",
    body: { climate_keeper_mode: 2 },
  },
  {
    operation: "setBioweaponDefenseMode",
    params: { auto_climate_on: true, manual_override: true },
    path: "command/set_bioweapon_mode",
    body: { on: true, manual_override: true },
  },
  {
    operation: "setPreconditioningMax",
    params: { auto_climate_on: false, manual_override: true },
    path: "command/set_preconditioning_max",
    body: { on: false, manual_override: true },
  },
  {
    operation: "windowControl",
    params: { window_command: "vent", lat: 3, lon: 4 },
    path: "command/window_control",
    body: { command: "vent", lat: 3, lon: 4 },
  },
  {
    operation: "sunRoofControl",
    params: { sunroof_state: "stop" },
    path: "command/sun_roof_control",
    body: { state: "stop" },
  },
  {
    operation: "tonneauControl",
    params: { tonneau_command: "close" },
    path: "custom_command/closure",
    body: { tonneau: "close" },
  },
  {
    operation: "setScheduledCharging",
    params: { schedule_enable: true, schedule_time: "01:05" },
    path: "command/set_scheduled_charging",
    body: { enable: true, time: 65 },
  },
  {
    operation: "setScheduledDeparture",
    params: { scheduled_departure_body: '{"enable":true,"departure_time":480}' },
    path: "command/set_scheduled_departure",
    body: { enable: true, departure_time: 480 },
  },
  {
    operation: "addChargeSchedule",
    params: { charge_schedule_body: '{"days_of_week":"All","enabled":true}' },
    path: "command/add_charge_schedule",
    body: { days_of_week: "All", enabled: true },
  },
  {
    operation: "removeChargeSchedule",
    params: { schedule_id: 7 },
    path: "command/remove_charge_schedule",
    body: { id: 7 },
  },
  {
    operation: "addPreconditionSchedule",
    params: { precondition_schedule_body: '{"days_of_week":"All","enabled":true}' },
    path: "command/add_precondition_schedule",
    body: { days_of_week: "All", enabled: true },
  },
  {
    operation: "removePreconditionSchedule",
    params: { schedule_id: 9 },
    path: "command/remove_precondition_schedule",
    body: { id: 9 },
  },
  {
    operation: "chargeOnSolar",
    params: {
      solar_charging_enabled: true,
      solar_lower_charge_limit: 40,
      solar_upper_charge_limit: 95,
    },
    path: "custom_command/charge_on_solar",
    body: { enabled: true, lowerChargeLimit: 40, upperChargeLimit: 95 },
  },
  { operation: "chargeStandard", path: "command/charge_standard", body: null },
  { operation: "chargeMaxRange", path: "command/charge_max_range", body: null },
  {
    operation: "scheduleSoftwareUpdate",
    params: { offset_sec: 120 },
    path: "command/schedule_software_update",
    body: { offset_sec: 120 },
  },
  { operation: "cancelSoftwareUpdate", path: "command/cancel_software_update", body: null },
  {
    operation: "adjustVolume",
    params: { volume: 3.5 },
    path: "command/adjust_volume",
    body: { volume: 3.5 },
  },
];

for (const c of CASES) {
  test(`TeslemetryVehicle.execute dispatches ${c.operation} to the correct endpoint and argument shape`, async () => {
    const { handler, getRequest } = captureRequest();
    const node = new TeslemetryVehicle();
    const context = fakeExecuteContext([{ operation: c.operation, vin: VIN, ...c.params }]);

    const result = await withMockedFetch(handler, () => node.execute.call(context));

    const request = getRequest();
    assert.ok(request, "expected a request to be sent");
    assert.equal(request!.method, c.operation === "vehicleData" ? "GET" : "POST");
    assert.ok(
      new URL(request!.url).pathname.endsWith(`/api/1/vehicles/${VIN}/${c.path}`),
      `expected path ending in ${c.path}, got ${new URL(request!.url).pathname}`,
    );

    if (c.body !== null && c.body !== undefined) {
      const sentBody = await request!.clone().json();
      assert.deepEqual(sentBody, c.body);
    }

    assert.equal(result.length, 1);
    assert.equal(result[0].length, 1);
  });
}

test("TeslemetryVehicle.execute processes multiple items independently", async () => {
  const seenPaths: string[] = [];
  const handler = async (request: Request) => {
    seenPaths.push(new URL(request.url).pathname);
    return new Response(JSON.stringify({ response: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const node = new TeslemetryVehicle();
  const context = fakeExecuteContext([
    { operation: "lockDoors", vin: VIN },
    { operation: "unlockDoors", vin: VIN },
  ]);

  const result = await withMockedFetch(handler, () => node.execute.call(context));

  assert.deepEqual(seenPaths, [
    `/api/1/vehicles/${VIN}/command/door_lock`,
    `/api/1/vehicles/${VIN}/command/door_unlock`,
  ]);
  assert.equal(result[0].length, 2);
});

test("TeslemetryVehicle.execute throws on failure when Continue On Fail is disabled", async () => {
  const node = new TeslemetryVehicle();
  const context = fakeExecuteContext([{ operation: "wakeUp", vin: VIN }], false);

  await assert.rejects(
    () =>
      withMockedFetch(
        () => new Response(null, { status: 500, statusText: "Server Error" }),
        () => node.execute.call(context),
      ),
  );
});

test("TeslemetryVehicle.execute returns an error item per failed item when Continue On Fail is enabled", async () => {
  const node = new TeslemetryVehicle();
  const context = fakeExecuteContext(
    [
      { operation: "wakeUp", vin: VIN },
      { operation: "lockDoors", vin: VIN },
    ],
    true,
  );

  let call = 0;
  const result = await withMockedFetch(
    () => {
      call += 1;
      if (call === 1) {
        return new Response(null, { status: 500, statusText: "Server Error" });
      }
      return new Response(JSON.stringify({ response: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    () => node.execute.call(context),
  );

  assert.equal(result[0].length, 2);
  assert.ok((result[0][0].json as { error?: string }).error);
  assert.deepEqual(result[0][1].json, { response: {} });
});

test("TeslemetryVehicle.execute throws for an unknown operation", async () => {
  const node = new TeslemetryVehicle();
  const context = fakeExecuteContext([{ operation: "notARealOperation", vin: VIN }]);

  await assert.rejects(() => node.execute.call(context), /Unknown operation/);
});

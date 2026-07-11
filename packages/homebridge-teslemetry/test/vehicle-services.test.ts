import { test } from "node:test";
import assert from "node:assert/strict";
import { Service, Characteristic } from "hap-nodejs";
import { ChargeLimitService } from "../src/vehicle-services/charge-limit.js";
import { SentryService } from "../src/vehicle-services/sentry.js";
import { ClimateService } from "../src/vehicle-services/climate.js";
import { DefrostService } from "../src/vehicle-services/defrost.js";
import { BatteryService } from "../src/vehicle-services/battery.js";
import { ChargeSwitchService } from "../src/vehicle-services/charge-switch.js";
import {
  makeFakePlatform,
  makeFakeAccessory,
  makeFakeVehicleApi,
  makeFakeVehicleSse,
} from "./helpers.js";

function makeFakeVehicle(overrides: Record<string, unknown> = {}) {
  return {
    vin: "5YJSA1E14FF000000",
    name: "My Tesla",
    api: makeFakeVehicleApi(),
    sse: makeFakeVehicleSse(),
    metadata: { config: { rhd: false } },
    ...overrides,
  } as never;
}

test("ChargeLimitService.setChargeLimit is called with a plain number (regression: was sent as { percent })", async () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("charge-limit-vin");
  const vehicle = makeFakeVehicle();

  new ChargeLimitService(platform, accessory, vehicle as never);

  const characteristic = accessory
    .getService(Service.Lightbulb)!
    .getCharacteristic(Characteristic.Brightness);
  await characteristic.handleSetRequest(80);

  assert.deepEqual((vehicle as never as { api: { calls: unknown[] } }).api.calls, [
    { method: "setChargeLimit", args: [80] },
  ]);
});

test("SentryService.setSentryMode is called with a plain boolean (regression: was sent as { on })", async () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("sentry-vin");
  const vehicle = makeFakeVehicle();

  new SentryService(platform, accessory, vehicle as never);

  const characteristic = accessory
    .getService(Service.Switch)!
    .getCharacteristic(Characteristic.On);
  await characteristic.handleSetRequest(true);

  assert.deepEqual((vehicle as never as { api: { calls: unknown[] } }).api.calls, [
    { method: "setSentryMode", args: [true] },
  ]);
});

test("ClimateService.setTemps is called with two positional numbers (regression: was sent as one object with wrong keys)", async () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("climate-vin");
  const vehicle = makeFakeVehicle();

  new ClimateService(platform, accessory, vehicle as never);

  const characteristic = accessory
    .getService(Service.Thermostat)!
    .getCharacteristic(Characteristic.TargetTemperature);
  await characteristic.handleSetRequest(21.5);

  assert.deepEqual((vehicle as never as { api: { calls: unknown[] } }).api.calls, [
    { method: "setTemps", args: [21.5, 21.5] },
  ]);
});

test("DefrostService.setPreconditioningMax is called with two booleans (regression: was sent as one object, missing manual_override)", async () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("defrost-vin");
  const vehicle = makeFakeVehicle();

  new DefrostService(platform, accessory, vehicle as never);

  const characteristic = accessory
    .getService(Service.Switch)!
    .getCharacteristic(Characteristic.On);
  await characteristic.handleSetRequest(true);

  assert.deepEqual((vehicle as never as { api: { calls: unknown[] } }).api.calls, [
    { method: "setPreconditioningMax", args: [true, true] },
  ]);
});

test("BatteryService listens on DetailedChargeState, not the unrelated ChargeState BMS signal (regression: ChargingState never updated)", () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("battery-vin");
  const vehicle = makeFakeVehicle();

  new BatteryService(platform, accessory, vehicle as never);

  const sse = (vehicle as never as { sse: ReturnType<typeof makeFakeVehicleSse> }).sse;
  sse.emit("DetailedChargeState", "DetailedChargeStateCharging");

  const characteristic = accessory
    .getService(Service.Battery)!
    .getCharacteristic(Characteristic.ChargingState);
  assert.equal(characteristic.value, Characteristic.ChargingState.CHARGING);
});

test("ChargeSwitchService listens on DetailedChargeState and matches its actual literal values (regression: compared against the wrong prefix)", () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("charge-switch-vin");
  const vehicle = makeFakeVehicle();

  new ChargeSwitchService(platform, accessory, vehicle as never);

  const sse = (vehicle as never as { sse: ReturnType<typeof makeFakeVehicleSse> }).sse;
  sse.emit("DetailedChargeState", "DetailedChargeStateCharging");

  const characteristic = accessory
    .getService(Service.Switch)!
    .getCharacteristic(Characteristic.On);
  assert.equal(characteristic.value, true);
});

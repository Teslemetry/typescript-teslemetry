import { test } from "node:test";
import assert from "node:assert/strict";
import { Service, Characteristic } from "hap-nodejs";
import { ChargeLimitService } from "../src/vehicle-services/charge-limit.js";
import { SentryService } from "../src/vehicle-services/sentry.js";
import { ClimateService } from "../src/vehicle-services/climate.js";
import { DefrostService } from "../src/vehicle-services/defrost.js";
import { BatteryService } from "../src/vehicle-services/battery.js";
import { ChargeSwitchService } from "../src/vehicle-services/charge-switch.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

test("ChargeLimitService.setChargeLimit is called with a plain number (regression: was sent as { percent })", async () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("charge-limit-vin");
	const { vehicle, calls } = createFakeVehicle();

	new ChargeLimitService(platform, accessory, vehicle);

	const characteristic = accessory
		.getService(Service.Lightbulb)!
		.getCharacteristic(Characteristic.Brightness);
	await characteristic.handleSetRequest(80 as never);

	assert.deepEqual(calls, [{ method: "setChargeLimit", args: [80] }]);
});

test("SentryService.setSentryMode is called with a plain boolean (regression: was sent as { on })", async () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("sentry-vin");
	const { vehicle, calls } = createFakeVehicle();

	new SentryService(platform, accessory, vehicle);

	const characteristic = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
	await characteristic.handleSetRequest(true as never);

	assert.deepEqual(calls, [{ method: "setSentryMode", args: [true] }]);
});

test("ClimateService.setTemps is called with two positional numbers (regression: was sent as one object with wrong keys)", async () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("climate-vin");
	const { vehicle, calls } = createFakeVehicle({ metadata: { config: { rhd: false } } as never });

	new ClimateService(platform, accessory, vehicle);

	const characteristic = accessory
		.getService(Service.Thermostat)!
		.getCharacteristic(Characteristic.TargetTemperature);
	await characteristic.handleSetRequest(21.5 as never);

	assert.deepEqual(calls, [{ method: "setTemps", args: [21.5, 21.5] }]);
});

test("DefrostService.setPreconditioningMax is called with two booleans (regression: was sent as one object, missing manual_override)", async () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("defrost-vin");
	const { vehicle, calls } = createFakeVehicle();

	new DefrostService(platform, accessory, vehicle);

	const characteristic = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
	await characteristic.handleSetRequest(true as never);

	assert.deepEqual(calls, [{ method: "setPreconditioningMax", args: [true, true] }]);
});

test("BatteryService listens on DetailedChargeState, not the unrelated ChargeState BMS signal (regression: ChargingState never updated)", () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("battery-vin");
	const { vehicle, sse } = createFakeVehicle();

	new BatteryService(platform, accessory, vehicle);

	sse.emitSignal("DetailedChargeState", "DetailedChargeStateCharging");

	const characteristic = accessory.getService(Service.Battery)!.getCharacteristic(Characteristic.ChargingState);
	assert.equal(characteristic.value, Characteristic.ChargingState.CHARGING);
});

test("ChargeSwitchService listens on DetailedChargeState and matches its actual literal values (regression: compared against the wrong prefix)", () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("charge-switch-vin");
	const { vehicle, sse } = createFakeVehicle();

	new ChargeSwitchService(platform, accessory, vehicle);

	sse.emitSignal("DetailedChargeState", "DetailedChargeStateCharging");

	const characteristic = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
	assert.equal(characteristic.value, true);
});

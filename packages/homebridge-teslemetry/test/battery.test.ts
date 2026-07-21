import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { BatteryService } from "../src/vehicle-services/battery.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	new BatteryService(platform as never, accessory, vehicle);
	const hapService = accessory.getService(Service.Battery)!;
	return { hapService, sse };
}

test("BatteryLevel signal updates the BatteryLevel characteristic", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("BatteryLevel", 65);
	assert.equal(hapService.getCharacteristic(Characteristic.BatteryLevel).value, 65);
});

test("BatteryLevel below 20 marks StatusLowBattery as low", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("BatteryLevel", 15);
	assert.equal(
		hapService.getCharacteristic(Characteristic.StatusLowBattery).value,
		Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW,
	);
});

test("BatteryLevel at or above 20 marks StatusLowBattery as normal", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("BatteryLevel", 20);
	assert.equal(
		hapService.getCharacteristic(Characteristic.StatusLowBattery).value,
		Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
	);
});

for (const [state, expected] of [
	["DetailedChargeStateCharging", Characteristic.ChargingState.CHARGING],
	["DetailedChargeStateStarting", Characteristic.ChargingState.CHARGING],
	["DetailedChargeStateComplete", Characteristic.ChargingState.NOT_CHARGING],
	["DetailedChargeStateDisconnected", Characteristic.ChargingState.NOT_CHARGING],
	["DetailedChargeStateStopped", Characteristic.ChargingState.NOT_CHARGING],
	["DetailedChargeStateNoPower", Characteristic.ChargingState.NOT_CHARGING],
	// Unmapped/unknown states (e.g. a future Tesla firmware value) fall back to NOT_CHARGEABLE.
	["DetailedChargeStateSomeFutureState", Characteristic.ChargingState.NOT_CHARGEABLE],
] as const) {
	test(`DetailedChargeState "${state}" maps to ChargingState ${expected}`, () => {
		const { hapService, sse } = setup();
		sse.emitSignal("DetailedChargeState", state);
		assert.equal(hapService.getCharacteristic(Characteristic.ChargingState).value, expected);
	});
}

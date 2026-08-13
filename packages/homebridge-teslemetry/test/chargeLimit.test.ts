import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { ChargeLimitService } from "../src/vehicle-services/charge-limit.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	new ChargeLimitService(platform as never, accessory, vehicle);
	const hapService = accessory.getService(Service.Lightbulb)!;
	return { hapService, vehicle, sse };
}

test("the charge-limit lightbulb starts on, since it represents a percentage, not a power state", () => {
	const { hapService } = setup();
	assert.equal(hapService.getCharacteristic(Characteristic.On).value, true);
});

test("ChargeLimitSoc above 100 is clamped to 100", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("ChargeLimitSoc", 150);
	assert.equal(hapService.getCharacteristic(Characteristic.Brightness).value, 100);
});

test("ChargeLimitSoc below 50 is clamped to 50", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("ChargeLimitSoc", 10);
	assert.equal(hapService.getCharacteristic(Characteristic.Brightness).value, 50);
});

test("the Brightness characteristic's props are bounded to the vehicle's supported charge limit range", () => {
	const { hapService } = setup();
	const props = hapService.getCharacteristic(Characteristic.Brightness).props;
	assert.equal(props.minValue, 50);
	assert.equal(props.maxValue, 100);
	assert.equal(props.minStep, 1);
});

test("a client write above the max is rejected by HAP before reaching setChargeLimit()", async () => {
	const { hapService, vehicle } = setup();
	let apiCalled = false;
	(vehicle.api as any).setChargeLimit = () => {
		apiCalled = true;
		return Promise.resolve({});
	};

	await assert.rejects(
		hapService.getCharacteristic(Characteristic.Brightness).handleSetRequest(150 as never, {} as never),
	);

	assert.equal(apiCalled, false);
});

test("a client write below the min is rejected by HAP before reaching setChargeLimit()", async () => {
	const { hapService, vehicle } = setup();
	let apiCalled = false;
	(vehicle.api as any).setChargeLimit = () => {
		apiCalled = true;
		return Promise.resolve({});
	};

	await assert.rejects(
		hapService.getCharacteristic(Characteristic.Brightness).handleSetRequest(10 as never, {} as never),
	);

	assert.equal(apiCalled, false);
});

test("setting Brightness rounds the value and calls setChargeLimit()", async () => {
	const { hapService, vehicle } = setup();
	let received: unknown;
	(vehicle.api as any).setChargeLimit = (limit: number) => {
		received = limit;
		return Promise.resolve({});
	};

	await hapService.getCharacteristic(Characteristic.Brightness).handleSetRequest(72.6 as never);

	assert.equal(received, 73);
});

test("turning the lightbulb off is rejected: the vehicle is never asked to change its charge limit", async () => {
	const { hapService, vehicle } = setup();
	let apiCalled = false;
	(vehicle.api as any).setChargeLimit = () => {
		apiCalled = true;
		return Promise.resolve({});
	};

	await hapService.getCharacteristic(Characteristic.On).handleSetRequest(false as never);

	assert.equal(apiCalled, false);
});

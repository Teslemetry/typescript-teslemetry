import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { LockService } from "../src/vehicle-services/lock.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	new LockService(platform as never, accessory, vehicle);
	const hapService = accessory.getService(Service.LockMechanism)!;
	return { hapService, vehicle, sse };
}

test("Locked signal updates both LockCurrentState and LockTargetState to secured", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("Locked", true);
	assert.equal(hapService.getCharacteristic(Characteristic.LockCurrentState).value, Characteristic.LockCurrentState.SECURED);
	assert.equal(hapService.getCharacteristic(Characteristic.LockTargetState).value, Characteristic.LockTargetState.SECURED);
});

test("Locked signal updates both LockCurrentState and LockTargetState to unsecured", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("Locked", false);
	assert.equal(hapService.getCharacteristic(Characteristic.LockCurrentState).value, Characteristic.LockCurrentState.UNSECURED);
	assert.equal(hapService.getCharacteristic(Characteristic.LockTargetState).value, Characteristic.LockTargetState.UNSECURED);
});

test("setting LockTargetState to SECURED calls lockDoors() and optimistically updates LockCurrentState", async () => {
	const { hapService, vehicle } = setup();
	let called = false;
	(vehicle.api as any).lockDoors = () => {
		called = true;
		return Promise.resolve({});
	};

	await hapService
		.getCharacteristic(Characteristic.LockTargetState)
		.handleSetRequest(Characteristic.LockTargetState.SECURED as never);

	assert.ok(called);
	assert.equal(hapService.getCharacteristic(Characteristic.LockCurrentState).value, Characteristic.LockCurrentState.SECURED);
});

test("setting LockTargetState to UNSECURED calls unlockDoors() and optimistically updates LockCurrentState", async () => {
	const { hapService, vehicle } = setup();
	let called = false;
	(vehicle.api as any).unlockDoors = () => {
		called = true;
		return Promise.resolve({});
	};

	await hapService
		.getCharacteristic(Characteristic.LockTargetState)
		.handleSetRequest(Characteristic.LockTargetState.UNSECURED as never);

	assert.ok(called);
	assert.equal(hapService.getCharacteristic(Characteristic.LockCurrentState).value, Characteristic.LockCurrentState.UNSECURED);
});

test("a failing lockDoors() call surfaces as SERVICE_COMMUNICATION_FAILURE instead of leaving the request hanging", async () => {
	const { hapService, vehicle } = setup();
	(vehicle.api as any).lockDoors = () => Promise.reject(new Error("vehicle offline"));

	await assert.rejects(() =>
		hapService
			.getCharacteristic(Characteristic.LockTargetState)
			.handleSetRequest(Characteristic.LockTargetState.SECURED as never),
	);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { VehicleAccessory } from "../src/vehicle.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

// BaseService's getOrCreate lookup (vehicle-services/base.ts) now matches an
// existing service by HAP service type *and* subType. Several vehicle-services
// intentionally pass different subTypes but share a service type, so each one
// gets its own service instance and its own onSet registration.

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle } = createFakeVehicle();
	new VehicleAccessory(platform as never, accessory, vehicle);
	return { accessory, vehicle };
}

test("ChargeSwitch/Defrost/Sentry/Wake each get their own Service.Switch instance", () => {
	const { accessory } = setup();
	const switchServices = accessory.services.filter((s) => s.UUID === Service.Switch.UUID);
	assert.equal(switchServices.length, 4);
	const subtypes = switchServices.map((s) => s.subtype).sort();
	assert.deepEqual(subtypes, ["charging", "defrost", "sentry", "wake"]);
});

test("each Switch service's SET handler routes to its own vehicle command independently", async () => {
	const { accessory, vehicle } = setup();
	const calls: string[] = [];
	(vehicle.api as any).wakeUp = () => {
		calls.push("wakeUp");
		return Promise.resolve({});
	};
	(vehicle.api as any).startCharging = () => {
		calls.push("startCharging");
		return Promise.resolve({});
	};

	const wakeService = accessory.getServiceById(Service.Switch, "wake")!;
	await wakeService.getCharacteristic(Characteristic.On).handleSetRequest(true as never);
	assert.deepEqual(calls, ["wakeUp"]);

	const chargingService = accessory.getServiceById(Service.Switch, "charging")!;
	await chargingService.getCharacteristic(Characteristic.On).handleSetRequest(true as never);
	assert.deepEqual(calls, ["wakeUp", "startCharging"]);
});

test("Lock and ChargePort each get their own Service.LockMechanism instance", () => {
	const { accessory } = setup();
	const lockServices = accessory.services.filter((s) => s.UUID === Service.LockMechanism.UUID);
	assert.equal(lockServices.length, 2);
});

test("each LockMechanism service's SET handler routes to its own vehicle command independently", async () => {
	const { accessory, vehicle } = setup();
	const calls: string[] = [];
	(vehicle.api as any).closeChargePort = () => {
		calls.push("closeChargePort");
		return Promise.resolve({});
	};
	(vehicle.api as any).lockDoors = () => {
		calls.push("lockDoors");
		return Promise.resolve({});
	};

	const lockService = accessory.getServiceById(Service.LockMechanism, "charge-port")!;
	await lockService
		.getCharacteristic(Characteristic.LockTargetState)
		.handleSetRequest(Characteristic.LockTargetState.SECURED as never);
	assert.deepEqual(calls, ["closeChargePort"]);

	const doorLockService = accessory.getService(Service.LockMechanism)!;
	assert.notEqual(doorLockService, lockService);
	await doorLockService
		.getCharacteristic(Characteristic.LockTargetState)
		.handleSetRequest(Characteristic.LockTargetState.SECURED as never);
	assert.deepEqual(calls, ["closeChargePort", "lockDoors"]);
});

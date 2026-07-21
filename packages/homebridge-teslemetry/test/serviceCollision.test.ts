import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { VehicleAccessory } from "../src/vehicle.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

// BaseService's getOrCreate lookup (vehicle-services/base.ts) matches an existing
// service by HAP service type alone; it does not also match on subType. Several
// vehicle-services intentionally pass different subTypes but share a service
// type, so they collapse onto one shared service instance instead of getting
// one each, and each service's onSet registration silently replaces the
// previous one's. These tests pin down that current, shared-instance behavior.

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle } = createFakeVehicle();
	new VehicleAccessory(platform as never, accessory, vehicle);
	return { accessory, vehicle };
}

test("ChargeSwitch/Defrost/Sentry/Wake share a single Service.Switch instance instead of getting one each", () => {
	const { accessory } = setup();
	const switchServices = accessory.services.filter((s) => s.UUID === Service.Switch.UUID);
	assert.equal(switchServices.length, 1);
});

test("only the last-constructed Switch service (Wake) responds to the shared switch's SET handler", async () => {
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

	const switchService = accessory.getService(Service.Switch)!;
	await switchService.getCharacteristic(Characteristic.On).handleSetRequest(true as never);

	assert.deepEqual(calls, ["wakeUp"]);
});

test("Lock and ChargePort share a single Service.LockMechanism instance instead of getting one each", () => {
	const { accessory } = setup();
	const lockServices = accessory.services.filter((s) => s.UUID === Service.LockMechanism.UUID);
	assert.equal(lockServices.length, 1);
});

test("only the last-constructed LockMechanism service (ChargePort) responds to the shared lock's SET handler", async () => {
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

	const lockService = accessory.getService(Service.LockMechanism)!;
	await lockService
		.getCharacteristic(Characteristic.LockTargetState)
		.handleSetRequest(Characteristic.LockTargetState.SECURED as never);

	assert.deepEqual(calls, ["closeChargePort"]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Perms, Service } from "hap-nodejs";
import { RearDefrostService } from "../src/vehicle-services/rear-defrost.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	new RearDefrostService(platform as never, accessory, vehicle);
	const hapService = accessory.getServiceById(Service.ContactSensor, "rear-defrost")!;
	return { hapService, sse };
}

test("RearDefrostEnabled true/false maps to ContactSensorState", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("RearDefrostEnabled", true);
	assert.equal(
		hapService.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);

	sse.emitSignal("RearDefrostEnabled", false);
	assert.equal(
		hapService.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);
});

test("ContactSensorState is read-only: HomeKit can't write to it (no SET permission)", () => {
	const { hapService } = setup();
	const perms = hapService.getCharacteristic(Characteristic.ContactSensorState).props.perms;
	assert.equal(perms.includes(Perms.PAIRED_WRITE), false);
});

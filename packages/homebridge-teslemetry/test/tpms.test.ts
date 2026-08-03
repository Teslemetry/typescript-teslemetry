import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { TpmsService } from "../src/vehicle-services/tpms.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	new TpmsService(platform as never, accessory, vehicle);
	return { accessory, sse };
}

test("creates one aggregate hard-warning contact sensor and four per-wheel soft-warning contact sensors", () => {
	const { accessory } = setup();
	const contactSensors = accessory.services.filter((s) => s.UUID === Service.ContactSensor.UUID);
	assert.equal(contactSensors.length, 5);
	assert.ok(accessory.getServiceById(Service.ContactSensor, "tpms-hard"));
	assert.ok(accessory.getServiceById(Service.ContactSensor, "tpms-soft-front-left"));
	assert.ok(accessory.getServiceById(Service.ContactSensor, "tpms-soft-front-right"));
	assert.ok(accessory.getServiceById(Service.ContactSensor, "tpms-soft-rear-left"));
	assert.ok(accessory.getServiceById(Service.ContactSensor, "tpms-soft-rear-right"));
});

test("marks every TPMS contact sensor as StatusFault until a warnings payload arrives", () => {
	const { accessory } = setup();
	for (const sensor of accessory.services.filter((s) => s.UUID === Service.ContactSensor.UUID)) {
		assert.equal(
			sensor.getCharacteristic(Characteristic.StatusFault).value,
			Characteristic.StatusFault.GENERAL_FAULT,
		);
	}
});

test("TpmsHardWarnings sets the aggregate contact when any wheel reports a critical warning", () => {
	const { accessory, sse } = setup();
	sse.emitSignal("TpmsHardWarnings", {
		front_left: false,
		front_right: true,
		rear_left: false,
		rear_right: false,
	});

	const hard = accessory.getServiceById(Service.ContactSensor, "tpms-hard")!;
	assert.equal(
		hard.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);
	assert.equal(hard.getCharacteristic(Characteristic.StatusFault).value, Characteristic.StatusFault.NO_FAULT);
});

test("TpmsHardWarnings with no wheel set clears the aggregate contact", () => {
	const { accessory, sse } = setup();
	sse.emitSignal("TpmsHardWarnings", {
		front_left: false,
		front_right: false,
		rear_left: false,
		rear_right: false,
	});

	const hard = accessory.getServiceById(Service.ContactSensor, "tpms-hard")!;
	assert.equal(
		hard.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);
});

test("TpmsSoftWarnings sets only the affected wheel's contact sensor", () => {
	const { accessory, sse } = setup();
	sse.emitSignal("TpmsSoftWarnings", {
		front_left: true,
		front_right: false,
		rear_left: false,
		rear_right: false,
	});

	const fl = accessory.getServiceById(Service.ContactSensor, "tpms-soft-front-left")!;
	const fr = accessory.getServiceById(Service.ContactSensor, "tpms-soft-front-right")!;
	assert.equal(
		fl.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);
	assert.equal(
		fr.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);
});

test("a null warnings payload is ignored, leaving StatusFault unknown rather than defaulting to safe", () => {
	const { accessory, sse } = setup();
	assert.doesNotThrow(() => sse.emitSignal("TpmsHardWarnings", null));

	const hard = accessory.getServiceById(Service.ContactSensor, "tpms-hard")!;
	assert.equal(
		hard.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.GENERAL_FAULT,
	);
});

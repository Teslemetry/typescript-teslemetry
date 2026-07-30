import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { DoorService } from "../src/vehicle-services/door.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup(canActuateTrunks = true) {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle({
		metadata: { config: { can_actuate_trunks: canActuateTrunks } } as never,
	});
	new DoorService(platform as never, accessory, vehicle);

	const doorState = (subtype: string) => accessory.getServiceById(Service.ContactSensor, subtype)!;
	return { accessory, logs, sse, doorState };
}

test("creates a contact sensor for each of the six doors/trunks when the vehicle can actuate trunks", () => {
	const { accessory } = setup(true);
	const contactSensors = accessory.services.filter((s) => s.UUID === Service.ContactSensor.UUID);
	assert.equal(contactSensors.length, 6);
});

test("omits the frunk/trunk contact sensors on vehicles without powered trunk actuation", () => {
	const { accessory } = setup(false);
	const contactSensors = accessory.services.filter((s) => s.UUID === Service.ContactSensor.UUID);
	assert.equal(contactSensors.length, 4);
	assert.equal(accessory.getServiceById(Service.ContactSensor, "door-TrunkFront"), undefined);
	assert.equal(accessory.getServiceById(Service.ContactSensor, "door-TrunkRear"), undefined);
});

test("DoorState signal opens/closes the matching contact sensors from a partial payload", () => {
	const { doorState, sse } = setup();
	sse.emitSignal("DoorState", { DriverFront: true, TrunkRear: false });

	assert.equal(
		doorState("door-driver-front").getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);
	assert.equal(
		doorState("door-TrunkRear").getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);
});

test("doors absent from the payload are left at their last known state", () => {
	const { doorState, sse } = setup();
	sse.emitSignal("DoorState", { PassengerFront: true });
	sse.emitSignal("DoorState", { DriverFront: true });

	assert.equal(
		doorState("door-PassengerFront").getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);
});

test("a non-object DoorState payload (missing/malformed data) is ignored without throwing", () => {
	const { sse } = setup();
	assert.doesNotThrow(() => sse.emitSignal("DoorState", null));
	assert.doesNotThrow(() => sse.emitSignal("DoorState", "unexpected"));
});

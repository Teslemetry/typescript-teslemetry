import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { GridOutageService } from "../src/energy-services/grid-outage.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	new GridOutageService(platform as never, accessory, site);
	return { accessory, api };
}

test("marks StatusFault unknown until a liveStatus event arrives", () => {
	const { accessory } = setup();
	const service = accessory.getServiceById(Service.ContactSensor, "grid-outage")!;
	assert.equal(
		service.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.GENERAL_FAULT,
	);
});

test("grid_status Active closes the contact; any other status opens it", () => {
	const { accessory, api } = setup();
	const service = accessory.getServiceById(Service.ContactSensor, "grid-outage")!;

	api.emit("liveStatus", { response: { grid_status: "Active" } });
	assert.equal(
		service.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);
	assert.equal(service.getCharacteristic(Characteristic.StatusFault).value, Characteristic.StatusFault.NO_FAULT);

	api.emit("liveStatus", { response: { grid_status: "Inactive" } });
	assert.equal(
		service.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);
});

test("a liveStatus event without grid_status is ignored, leaving StatusFault unknown", () => {
	const { accessory, api } = setup();
	const service = accessory.getServiceById(Service.ContactSensor, "grid-outage")!;

	api.emit("liveStatus", { response: {} });

	assert.equal(
		service.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.GENERAL_FAULT,
	);
});

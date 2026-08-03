import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { StormWatchActiveService } from "../src/energy-services/storm-watch-active.js";
import { StormWatchService } from "../src/energy-services/storm-watch.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	new StormWatchActiveService(platform as never, accessory, site);
	return { accessory, api };
}

test("marks StatusFault unknown until a liveStatus event arrives", () => {
	const { accessory } = setup();
	const service = accessory.getServiceById(Service.ContactSensor, "storm-watch-active")!;
	assert.equal(
		service.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.GENERAL_FAULT,
	);
});

test("storm_mode_active true opens the contact; false closes it", () => {
	const { accessory, api } = setup();
	const service = accessory.getServiceById(Service.ContactSensor, "storm-watch-active")!;

	api.emit("liveStatus", { response: { storm_mode_active: true } });
	assert.equal(
		service.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);

	api.emit("liveStatus", { response: { storm_mode_active: false } });
	assert.equal(
		service.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);
});

test("is a distinct service from the Storm Watch enable/disable switch", () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site } = createFakeEnergySite();

	new StormWatchService(platform as never, accessory, site);
	new StormWatchActiveService(platform as never, accessory, site);

	assert.ok(accessory.getServiceById(Service.Switch, "storm-watch"));
	assert.ok(accessory.getServiceById(Service.ContactSensor, "storm-watch-active"));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { EnergyAccessory } from "../src/energy.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

function setup() {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	const energyAccessory = new EnergyAccessory(platform as never, accessory, site);
	return { accessory, logs, api, energyAccessory };
}

test("initializes the expected number of distinct HAP services", () => {
	const { accessory } = setup();
	// Information, Battery, BackupReserve, OperationMode = 4 services with a
	// unique HAP service type, plus 2 distinct Switch services (StormWatch and
	// GridCharging), each with its own subType.
	assert.equal(accessory.services.length, 6);
});

test("startPolling requests both siteInfo and liveStatus polling", () => {
	const { api } = setup();
	assert.deepEqual(api.requestedPolling.sort(), ["liveStatus", "siteInfo"]);
});

test("destroy() stops polling and detaches all service event listeners", () => {
	const { api, energyAccessory } = setup();
	// Information, BackupReserve, StormWatch, OperationMode, and GridChargingService
	// each subscribe to siteInfo.
	assert.equal(api.listenerCount("siteInfo"), 5);

	energyAccessory.destroy();

	assert.deepEqual(api.stoppedPolling.sort(), ["liveStatus", "siteInfo"]);
	assert.equal(api.listenerCount("siteInfo"), 0);
	assert.equal(api.listenerCount("liveStatus"), 0);
});
